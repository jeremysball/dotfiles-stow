#!/usr/bin/env python3
"""Iterative PR review launcher that shells out to pi with the active model.

This script:
1. Finds the most relevant local pi session for the current working directory.
2. Extracts the active model / thinking level when possible.
3. Fetches PR metadata, comments, and diff via gh.
4. Either opens a tmux-backed interactive pi review session or prints a one-shot review.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shlex
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Any

DEFAULT_DIFF_LINE_LIMIT = 1200
DEFAULT_ITEM_LIMIT = 12
DEFAULT_TEXT_LIMIT = 4000


class CommandError(RuntimeError):
    pass


def die(message: str, exit_code: int = 1) -> None:
    print(message, file=sys.stderr)
    raise SystemExit(exit_code)


def require_command(name: str, install_hint: str | None = None) -> None:
    if shutil.which(name) is not None:
        return
    if install_hint:
        die(f"{name} is required. {install_hint}")
    die(f"{name} is required.")


def run_capture(args: list[str], *, cwd: Path | None = None) -> str:
    try:
        proc = subprocess.run(
            args,
            cwd=str(cwd) if cwd else None,
            text=True,
            capture_output=True,
            check=True,
        )
    except FileNotFoundError as exc:
        raise CommandError(f"Command not found: {args[0]}") from exc
    except subprocess.CalledProcessError as exc:
        stderr = (exc.stderr or "").strip()
        stdout = (exc.stdout or "").strip()
        message = stderr or stdout or f"Command failed: {' '.join(args)}"
        raise CommandError(message) from exc
    return proc.stdout


def truncate_text(text: str, limit: int = DEFAULT_TEXT_LIMIT) -> str:
    text = text or ""
    if len(text) <= limit:
        return text
    return text[:limit].rstrip() + "\n...[truncated]"


def squash_ws(text: str) -> str:
    return " ".join((text or "").split())


def tail(items: list[Any], limit: int) -> list[Any]:
    if len(items) <= limit:
        return items
    return items[-limit:]


def parse_pr_url(url: str) -> tuple[str, str, str] | None:
    match = re.search(r"https?://[^/]+/([^/]+)/([^/]+)/pull/(\d+)", url)
    if not match:
        return None
    return match.group(1), match.group(2), match.group(3)


def path_is_same_or_ancestor(candidate: Path, other: Path) -> bool:
    candidate = candidate.resolve()
    other = other.resolve()
    if candidate == other:
        return True
    try:
        other.relative_to(candidate)
        return True
    except ValueError:
        return False


def header_cwd(path: Path) -> Path | None:
    try:
        with path.open("r", encoding="utf-8", errors="ignore") as handle:
            first_line = handle.readline().strip()
    except OSError:
        return None

    if not first_line:
        return None

    try:
        data = json.loads(first_line)
    except json.JSONDecodeError:
        return None

    if data.get("type") != "session":
        return None

    cwd = data.get("cwd")
    if not cwd:
        return None

    try:
        return Path(cwd).expanduser().resolve()
    except OSError:
        return None


def find_matching_session_file(cwd: Path) -> Path | None:
    session_root = Path(os.environ.get("PI_CODING_AGENT_DIR", str(Path.home() / ".pi"))) / "agent" / "sessions"
    if not session_root.exists():
        return None

    candidates: list[tuple[int, int, float, Path]] = []
    for path in session_root.rglob("*.jsonl"):
        session_cwd = header_cwd(path)
        if session_cwd is None:
            continue

        relation = 0
        if session_cwd == cwd:
            relation = 3
        elif path_is_same_or_ancestor(session_cwd, cwd):
            relation = 2
        elif path_is_same_or_ancestor(cwd, session_cwd):
            relation = 1

        if relation == 0:
            continue

        try:
            mtime = path.stat().st_mtime
        except OSError:
            mtime = 0.0
        candidates.append((relation, len(session_cwd.parts), mtime, path))

    if not candidates:
        return None

    candidates.sort(key=lambda item: (item[0], item[1], item[2]), reverse=True)
    return candidates[0][3]


def detect_active_model(session_file: Path | None) -> tuple[str | None, str | None, str]:
    if session_file is None:
        return None, None, "default"

    last_model: str | None = None
    last_thinking: str | None = None

    try:
        with session_file.open("r", encoding="utf-8", errors="ignore") as handle:
            for raw_line in handle:
                line = raw_line.strip()
                if not line:
                    continue
                try:
                    entry = json.loads(line)
                except json.JSONDecodeError:
                    continue

                entry_type = entry.get("type")
                if entry_type == "model_change":
                    provider = entry.get("provider")
                    model_id = entry.get("modelId")
                    if provider and model_id:
                        last_model = f"{provider}/{model_id}"
                    elif model_id:
                        last_model = str(model_id)
                elif entry_type == "thinking_level_change":
                    thinking = entry.get("thinkingLevel")
                    if thinking:
                        last_thinking = str(thinking)
                elif entry_type == "message":
                    message = entry.get("message") or {}
                    if message.get("role") == "assistant":
                        provider = message.get("provider")
                        model = message.get("model")
                        if provider and model:
                            model_text = str(model)
                            if model_text.startswith(f"{provider}/"):
                                last_model = model_text
                            else:
                                last_model = f"{provider}/{model_text}"
                        elif model:
                            last_model = str(model)
    except OSError:
        return None, None, "default"

    return last_model, last_thinking, "session" if (last_model or last_thinking) else "default"


def gh_json(args: list[str]) -> Any:
    output = run_capture(args)
    try:
        return json.loads(output)
    except json.JSONDecodeError as exc:
        raise CommandError(f"Failed to parse JSON from: {' '.join(args)}") from exc


def compact_files(files: list[dict[str, Any]], limit: int) -> list[str]:
    lines: list[str] = []
    for file_info in files[:limit]:
        path = file_info.get("path", "unknown")
        additions = file_info.get("additions", 0)
        deletions = file_info.get("deletions", 0)
        lines.append(f"- {path} (+{additions} / -{deletions})")
    if len(files) > limit:
        lines.append(f"- ...and {len(files) - limit} more files")
    return lines


def compact_issue_comments(comments: list[dict[str, Any]], limit: int) -> list[str]:
    lines: list[str] = []
    for item in tail(comments, limit):
        author = (item.get("user") or {}).get("login", "unknown")
        created = item.get("created_at", "")
        body = truncate_text(squash_ws(item.get("body", "")), 240)
        lines.append(f"- @{author} @ {created}: {body}")
    if len(comments) > limit:
        lines.append(f"- ...and {len(comments) - limit} more issue comments")
    return lines


def compact_review_comments(comments: list[dict[str, Any]], limit: int) -> list[str]:
    lines: list[str] = []
    for item in tail(comments, limit):
        author = (item.get("user") or {}).get("login", "unknown")
        path = item.get("path", "unknown")
        line = item.get("line") or item.get("original_line") or "?"
        created = item.get("created_at", "")
        body = truncate_text(squash_ws(item.get("body", "")), 240)
        lines.append(f"- @{author} {path}:{line} @ {created}: {body}")
    if len(comments) > limit:
        lines.append(f"- ...and {len(comments) - limit} more inline review comments")
    return lines


def compact_reviews(reviews: list[dict[str, Any]], limit: int) -> list[str]:
    lines: list[str] = []
    for item in tail(reviews, limit):
        author = (item.get("user") or {}).get("login", "unknown")
        state = item.get("state", "UNKNOWN")
        submitted = item.get("submitted_at", "")
        body = truncate_text(squash_ws(item.get("body", "")), 240)
        lines.append(f"- @{author} {state} @ {submitted}: {body}")
    if len(reviews) > limit:
        lines.append(f"- ...and {len(reviews) - limit} more review entries")
    return lines


def infer_pr_ref() -> str | None:
    try:
        return run_capture(["gh", "pr", "view", "--json", "url", "--jq", ".url"]).strip() or None
    except CommandError:
        return None


def sanitize_tmux_session_name(value: str) -> str:
    slug = re.sub(r"[^A-Za-z0-9_.-]+", "-", value).strip("-")
    slug = re.sub(r"-+", "-", slug)
    return slug[:80] or "prd-pr-review"


def build_tmux_session_name(pr: dict[str, Any], url: str) -> str:
    parsed = parse_pr_url(url)
    if parsed:
        owner, repo, number = parsed
        base = f"prd-pr-review-{owner}-{repo}-{number}"
    else:
        title = str(pr.get("title") or "review")
        number = str(pr.get("number") or "pr")
        base = f"prd-pr-review-{title}-{number}"
    return sanitize_tmux_session_name(base)


def tmux_session_exists(session_name: str) -> bool:
    if shutil.which("tmux") is None:
        return False
    proc = subprocess.run(
        ["tmux", "has-session", "-t", session_name],
        text=True,
        capture_output=True,
    )
    return proc.returncode == 0


def write_prompt_file(prompt: str) -> Path:
    prompt_dir = Path(tempfile.mkdtemp(prefix="prd-pr-review-"))
    prompt_path = prompt_dir / "prompt.md"
    prompt_path.write_text(prompt, encoding="utf-8")
    return prompt_path


def launch_tmux_review_session(
    *,
    session_name: str,
    prompt_path: Path,
    model: str | None,
    thinking: str | None,
) -> None:
    pi_cmd = ["pi"]
    if model:
        pi_cmd.extend(["--model", model])
    if thinking:
        pi_cmd.extend(["--thinking", thinking])
    pi_cmd.append(f"@{prompt_path}")

    tmux_cmd = ["tmux", "new-session", "-d", "-s", session_name, "-n", "review", *pi_cmd]
    if shutil.which("setsid") and shutil.which("script"):
        wrapper = ["setsid", "script", "-q", "-c", shlex.join(tmux_cmd), "/dev/null"]
        run_capture(wrapper)
        return

    run_capture(tmux_cmd)


def run_print_review(prompt: str, model: str | None, thinking: str | None) -> int:
    pi_cmd = ["pi", "--no-session", "-p"]
    if model:
        pi_cmd.extend(["--model", model])
    if thinking:
        pi_cmd.extend(["--thinking", thinking])

    try:
        proc = subprocess.run(pi_cmd, input=prompt, text=True)
    except FileNotFoundError as exc:
        die(f"Command not found: {pi_cmd[0]}")
    return proc.returncode


def collect_pr_context(pr_ref: str, *, max_diff_lines: int = DEFAULT_DIFF_LINE_LIMIT) -> dict[str, Any]:
    view_fields = [
        "number",
        "title",
        "body",
        "url",
        "author",
        "baseRefName",
        "headRefName",
        "isDraft",
        "mergeStateStatus",
        "reviewDecision",
        "changedFiles",
        "additions",
        "deletions",
        "files",
    ]
    pr = gh_json(["gh", "pr", "view", pr_ref, "--json", ",".join(view_fields)])

    url = pr.get("url") or pr_ref
    owner_repo_number = parse_pr_url(str(url))

    issue_comments: list[dict[str, Any]] = []
    review_comments: list[dict[str, Any]] = []
    reviews: list[dict[str, Any]] = []

    if owner_repo_number:
        owner, repo, number = owner_repo_number
        try:
            issue_comments = gh_json([
                "gh",
                "api",
                f"repos/{owner}/{repo}/issues/{number}/comments?per_page=100",
            ])
        except CommandError as exc:
            print(f"[prd-pr-review] Warning: {exc}", file=sys.stderr)
        try:
            review_comments = gh_json([
                "gh",
                "api",
                f"repos/{owner}/{repo}/pulls/{number}/comments?per_page=100",
            ])
        except CommandError as exc:
            print(f"[prd-pr-review] Warning: {exc}", file=sys.stderr)
        try:
            reviews = gh_json([
                "gh",
                "api",
                f"repos/{owner}/{repo}/pulls/{number}/reviews?per_page=100",
            ])
        except CommandError as exc:
            print(f"[prd-pr-review] Warning: {exc}", file=sys.stderr)

    diff = run_capture(["gh", "pr", "diff", pr_ref, "--color", "never", "--patch"])
    diff_lines = diff.splitlines()
    diff_truncated = False
    if max_diff_lines > 0 and len(diff_lines) > max_diff_lines:
        diff = "\n".join(diff_lines[:max_diff_lines])
        diff_truncated = True

    return {
        "pr": pr,
        "issue_comments": issue_comments,
        "review_comments": review_comments,
        "reviews": reviews,
        "diff": diff,
        "diff_truncated": diff_truncated,
        "diff_total_lines": len(diff_lines),
        "url": str(url),
    }


def build_prompt(
    *,
    pr: dict[str, Any],
    issue_comments: list[dict[str, Any]],
    review_comments: list[dict[str, Any]],
    reviews: list[dict[str, Any]],
    diff: str,
    diff_truncated: bool,
    diff_total_lines: int,
    max_diff_lines: int,
    model: str | None,
    thinking: str | None,
    focus: str | None,
    session_file: Path | None,
    model_source: str,
) -> str:
    author = (pr.get("author") or {}).get("login", "unknown")
    body = truncate_text(pr.get("body", ""), 3000)

    files = compact_files(pr.get("files", []) or [], DEFAULT_ITEM_LIMIT)
    issue_comment_lines = compact_issue_comments(issue_comments, DEFAULT_ITEM_LIMIT)
    review_comment_lines = compact_review_comments(review_comments, DEFAULT_ITEM_LIMIT)
    review_lines = compact_reviews(reviews, DEFAULT_ITEM_LIMIT)

    model_text = model or "(default pi model)"
    thinking_text = thinking or "(unchanged)"

    parts: list[str] = []
    parts.append("You are reviewing a GitHub pull request.")
    parts.append("Be specific, practical, and strict.")
    parts.append("Use only the information below as ground truth.")
    parts.append("If more context is needed, say exactly what file, hunk, or question to fetch next.")
    parts.append("")
    parts.append("Required response format:")
    parts.append("## Summary")
    parts.append(
        "This tmux session stays open for follow-up questions. Keep the same severity buckets and answer new questions directly when the user asks them."
    )
    parts.append("## Findings")
    parts.append("### Critical")
    parts.append("### Important")
    parts.append("### Minor")
    parts.append("## Questions for the author")
    parts.append("## Recommended next step")
    parts.append("")
    parts.append(f"Active pi model: {model_text}")
    parts.append(f"Thinking level: {thinking_text}")
    parts.append(f"Model source: {model_source}")
    if session_file is not None:
        parts.append(f"Session file: {session_file}")
    if focus:
        parts.append(f"Reviewer focus: {focus}")
    parts.append("")
    parts.append("PR metadata:")
    parts.append(f"- URL: {pr.get('url', '(unknown)')}")
    parts.append(f"- Number: {pr.get('number', '(unknown)')}")
    parts.append(f"- Title: {pr.get('title', '(untitled)')}")
    parts.append(f"- Author: @{author}")
    parts.append(f"- Base: {pr.get('baseRefName', '(unknown)')}")
    parts.append(f"- Head: {pr.get('headRefName', '(unknown)')}")
    parts.append(f"- Draft: {pr.get('isDraft', False)}")
    parts.append(f"- Merge state: {pr.get('mergeStateStatus', '(unknown)')}")
    parts.append(f"- Review decision: {pr.get('reviewDecision', '(unknown)')}")
    parts.append(f"- Changed files: {pr.get('changedFiles', 0)}")
    parts.append(f"- Additions: {pr.get('additions', 0)}")
    parts.append(f"- Deletions: {pr.get('deletions', 0)}")
    parts.append("")
    parts.append("PR body:")
    parts.append(body or "(empty)")
    parts.append("")
    parts.append("Changed files:")
    parts.extend(files or ["- (none)"])
    parts.append("")
    parts.append("Issue comments:")
    parts.extend(issue_comment_lines or ["- (none)"])
    parts.append("")
    parts.append("Inline review comments:")
    parts.extend(review_comment_lines or ["- (none)"])
    parts.append("")
    parts.append("Review history:")
    parts.extend(review_lines or ["- (none)"])
    parts.append("")
    parts.append(f"Patch (showing {min(diff_total_lines, max_diff_lines)} of {diff_total_lines} lines):")
    if diff_truncated:
        parts.append("[diff truncated]")
    parts.append("~~~diff")
    parts.append(diff or "(no diff output)")
    parts.append("~~~")

    return "\n".join(parts)


def main() -> int:
    parser = argparse.ArgumentParser(description="Review a GitHub PR via pi using the active model.")
    parser.add_argument("pr_ref", nargs="?", help="GitHub PR URL, number, or branch")
    parser.add_argument(
        "--focus",
        help="Extra reviewer focus for this pass (e.g. 'security and tests')",
    )
    parser.add_argument(
        "--max-diff-lines",
        type=int,
        default=DEFAULT_DIFF_LINE_LIMIT,
        help=f"Maximum diff lines to send to pi (default: {DEFAULT_DIFF_LINE_LIMIT})",
    )
    parser.add_argument(
        "--print",
        dest="print_mode",
        action="store_true",
        help="Print a one-shot review instead of opening tmux.",
    )
    parser.add_argument(
        "--tmux-session-name",
        help="Override the tmux session name used for the interactive review.",
    )
    args = parser.parse_args()

    require_command("gh", "GitHub CLI is required. Install it at https://cli.github.com/")
    require_command("pi")

    pr_ref = args.pr_ref or infer_pr_ref()
    if not pr_ref:
        die("Pass a PR URL, number, or branch (or run this from a branch with an associated PR).")

    cwd = Path.cwd().resolve()
    session_file = find_matching_session_file(cwd)
    model, thinking, model_source = detect_active_model(session_file)

    effective_diff_lines = args.max_diff_lines if args.max_diff_lines > 0 else DEFAULT_DIFF_LINE_LIMIT

    try:
        context = collect_pr_context(pr_ref, max_diff_lines=effective_diff_lines)
    except CommandError as exc:
        die(str(exc))

    prompt = build_prompt(
        pr=context["pr"],
        issue_comments=context["issue_comments"],
        review_comments=context["review_comments"],
        reviews=context["reviews"],
        diff=context["diff"],
        diff_truncated=context["diff_truncated"],
        diff_total_lines=context["diff_total_lines"],
        max_diff_lines=effective_diff_lines,
        model=model,
        thinking=thinking,
        focus=args.focus,
        session_file=session_file,
        model_source=model_source,
    )

    print(f"[prd-pr-review] PR: {context['url']}", file=sys.stderr)
    if session_file:
        print(f"[prd-pr-review] Session: {session_file}", file=sys.stderr)
    print(f"[prd-pr-review] Model: {model or '(default pi model)'}", file=sys.stderr)
    if thinking:
        print(f"[prd-pr-review] Thinking: {thinking}", file=sys.stderr)

    if args.print_mode:
        return run_print_review(prompt, model, thinking)

    session_name = args.tmux_session_name or build_tmux_session_name(context["pr"], context["url"])

    if shutil.which("tmux") is None:
        print("[prd-pr-review] tmux is not installed; falling back to one-shot review.", file=sys.stderr)
        return run_print_review(prompt, model, thinking)

    if tmux_session_exists(session_name):
        print(f"[prd-pr-review] Existing tmux session: {session_name}", file=sys.stderr)
        print(f"[prd-pr-review] Attach with: tmux attach -t {session_name}", file=sys.stderr)
        print("[prd-pr-review] Continue the conversation in that pane.", file=sys.stderr)
        return 0

    prompt_path = write_prompt_file(prompt)
    try:
        launch_tmux_review_session(
            session_name=session_name,
            prompt_path=prompt_path,
            model=model,
            thinking=thinking,
        )
    except CommandError as exc:
        print(f"[prd-pr-review] Warning: tmux launch failed ({exc}); falling back to one-shot review.", file=sys.stderr)
        return run_print_review(prompt, model, thinking)

    print(f"[prd-pr-review] Started tmux session: {session_name}", file=sys.stderr)
    print(f"[prd-pr-review] Prompt file: {prompt_path}", file=sys.stderr)
    print(f"[prd-pr-review] Attach with: tmux attach -t {session_name}", file=sys.stderr)
    print("[prd-pr-review] Use the same tmux pane for follow-up questions.", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
