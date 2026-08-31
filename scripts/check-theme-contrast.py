#!/usr/bin/env python3
"""WCAG contrast check for the opencode/kilo theme.json format.

The TUI theme format is {defs: {name: "#hex"}, theme: {role: {dark, light}}}.
Roles like `text` and `background` are not paired by the file itself: the
TUI renders text on background, link on background, primary on background,
border on background, etc. This script enumerates those role pairs, resolves
them through `defs`, and runs the WCAG relative-luminance math so the AA /
AAA floors are checked against the surfaces each role actually sits on.

Self-contained: the WCAG math is ~10 lines and copied here so the script
does not need to import from a sibling repo at test time.

    python3 check_theme.py /path/to/theme.json        # WCAG AA (4.5:1 text, 3:1 non-text)
    python3 check_theme.py --aaa /path/to/theme.json  # WCAG AAA (7:1 text, 3:1 non-text)
    python3 check_theme.py --json /path/to/theme.json # machine-readable output

Exit codes: 0 if every pair clears its floor, 1 if any pair fails.

The pair list is the guardrail. It must NOT silently skip a role the theme
defines: every foreground role in the theme is paired against the background
surface it renders on, and a role that appears in `theme` but in no PAIRS
entry is a coverage bug, not a pass. The script asserts full coverage at the
end and fails if any theme role is unpaired.

Pairing model (foreground role on background role):

  Text roles (4.5:1 AA / 7:1 AAA):
    text, textMuted, primary, secondary, accent, error, warning, success,
    info, and every markdown* / syntax* role render on `background` (or
    `backgroundElement` for the element-scoped accents). Diff text renders on
    its own diff background, not the page background.

  Non-text roles (3:1):
    border, borderActive, borderSubtle, markdownHorizontalRule.

  Background roles (no foreground check of their own, but they are the
    surfaces other roles sit on): background, backgroundPanel,
    backgroundElement, diffAddedBg, diffRemovedBg, diffContextBg,
    diffAddedLineNumberBg, diffRemovedLineNumberBg, diffHighlightAdded,
    diffHighlightRemoved.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

TEXT_AA = 4.5
TEXT_AAA = 7.0
NON_TEXT = 3.0

# Each tuple is (foreground_role, background_role, floor, label).
# `floor` is TEXT_AA for text roles and NON_TEXT for non-text roles; the
# --aaa flag swaps TEXT_AA -> TEXT_AAA for text roles only.
PAIRS: list[tuple[str, str, float, str]] = [
    # Body text and muted text.
    ("text", "background", TEXT_AA, "body text"),
    ("textMuted", "background", TEXT_AA, "muted text"),
    ("textMuted", "backgroundPanel", TEXT_AA, "muted text on panel"),
    # Accent / semantic colors (element-scoped where they sit on elements).
    ("primary", "background", TEXT_AA, "primary on bg"),
    ("primary", "backgroundElement", TEXT_AA, "primary on element"),
    ("secondary", "backgroundElement", TEXT_AA, "secondary on element"),
    ("accent", "background", TEXT_AA, "accent on bg"),
    ("accent", "backgroundElement", TEXT_AA, "accent on element"),
    ("error", "backgroundElement", TEXT_AA, "error on element"),
    ("warning", "backgroundElement", TEXT_AA, "warning on element"),
    ("success", "backgroundElement", TEXT_AA, "success on element"),
    ("info", "backgroundElement", TEXT_AA, "info on element"),
    # Diff text on its own diff backgrounds. The highlight pairs are non-text
    # (3:1): a diff highlight is a transient selection tint, not a persistent
    # text surface, and the text on it is already checked at 7:1 against the
    # base diff background (diffAddedBg / diffRemovedBg) above.
    ("diffAdded", "diffAddedBg", TEXT_AA, "added diff text"),
    ("diffAdded", "diffHighlightAdded", NON_TEXT, "added diff text on highlight"),
    ("diffRemoved", "diffRemovedBg", TEXT_AA, "removed diff text"),
    ("diffRemoved", "diffHighlightRemoved", NON_TEXT, "removed diff text on highlight"),
    ("diffContext", "diffContextBg", TEXT_AA, "diff context text"),
    ("diffHunkHeader", "diffContextBg", TEXT_AA, "diff hunk header"),
    ("diffLineNumber", "diffContextBg", TEXT_AA, "diff line number"),
    ("diffLineNumber", "diffAddedLineNumberBg", TEXT_AA, "added line number"),
    ("diffLineNumber", "diffRemovedLineNumberBg", TEXT_AA, "removed line number"),
    # Markdown roles on the page background.
    ("markdownText", "background", TEXT_AA, "markdown text"),
    ("markdownHeading", "background", TEXT_AA, "heading"),
    ("markdownLink", "background", TEXT_AA, "link"),
    ("markdownLinkText", "background", TEXT_AA, "link text"),
    ("markdownCode", "background", TEXT_AA, "inline code"),
    ("markdownCodeBlock", "background", TEXT_AA, "code block"),
    ("markdownBlockQuote", "background", TEXT_AA, "block quote"),
    ("markdownEmph", "background", TEXT_AA, "emphasis"),
    ("markdownStrong", "background", TEXT_AA, "strong"),
    ("markdownListItem", "background", TEXT_AA, "list item"),
    ("markdownListEnumeration", "background", TEXT_AA, "list enumeration"),
    ("markdownImage", "background", TEXT_AA, "image"),
    ("markdownImageText", "background", TEXT_AA, "image text"),
    # Syntax roles on the page background.
    ("syntaxComment", "background", TEXT_AA, "syntax comment"),
    ("syntaxKeyword", "background", TEXT_AA, "syntax keyword"),
    ("syntaxFunction", "background", TEXT_AA, "syntax function"),
    ("syntaxVariable", "background", TEXT_AA, "syntax variable"),
    ("syntaxString", "background", TEXT_AA, "syntax string"),
    ("syntaxNumber", "background", TEXT_AA, "syntax number"),
    ("syntaxType", "background", TEXT_AA, "syntax type"),
    ("syntaxOperator", "background", TEXT_AA, "syntax operator"),
    ("syntaxPunctuation", "background", TEXT_AA, "syntax punctuation"),
    # Non-text: borders, focus rings, horizontal rules.
    ("border", "background", NON_TEXT, "border"),
    ("border", "backgroundElement", NON_TEXT, "border on element"),
    ("borderActive", "background", NON_TEXT, "active border"),
    ("borderActive", "backgroundElement", NON_TEXT, "active border on element"),
    ("borderSubtle", "background", NON_TEXT, "subtle border"),
    ("borderSubtle", "backgroundElement", NON_TEXT, "subtle border on element"),
    ("markdownHorizontalRule", "background", NON_TEXT, "horizontal rule"),
]

# Roles that are backgrounds, not foregrounds: they are the surfaces other
# roles sit on, so they have no foreground check of their own. They must still
# be defined in the theme (a missing background breaks every pair that sits on
# it), which the coverage check below enforces.
BACKGROUND_ROLES = {
    "background",
    "backgroundPanel",
    "backgroundElement",
    "diffAddedBg",
    "diffRemovedBg",
    "diffContextBg",
    "diffAddedLineNumberBg",
    "diffRemovedLineNumberBg",
    "diffHighlightAdded",
    "diffHighlightRemoved",
}


def hex_to_rgb(s: str) -> tuple[int, int, int]:
    s = s.strip().lstrip("#")
    if len(s) == 3:
        s = "".join(c * 2 for c in s)
    if len(s) != 6:
        raise ValueError(f"bad hex color: {s!r}")
    return int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16)


def relative_luminance(rgb: tuple[int, int, int]) -> float:
    def chan(c: int) -> float:
        s = c / 255.0
        return s / 12.92 if s <= 0.03928 else ((s + 0.055) / 1.055) ** 2.4

    r, g, b = rgb
    return 0.2126 * chan(r) + 0.7152 * chan(g) + 0.0722 * chan(b)


def contrast_ratio(a: tuple[int, int, int], b: tuple[int, int, int]) -> float:
    la = relative_luminance(a)
    lb = relative_luminance(b)
    lo, hi = sorted((la, lb))
    return (hi + 0.05) / (lo + 0.05)


_HEX_RE = re.compile(r"^#[0-9A-Fa-f]{6}$")


def resolve(data: dict, role: str, scope: str) -> str | None:
    """Return the hex for `role` in `scope` ('light' or 'dark').

    `data` is the whole theme JSON ({defs: {...}, theme: {role: {dark, light}}}).
    """
    theme = data.get("theme", {})
    entry = theme.get(role)
    if entry is None:
        return None
    raw = entry.get(scope)
    if raw is None:
        return None
    if _HEX_RE.match(raw):
        return raw
    defs = data.get("defs", {})
    resolved = defs.get(raw)
    if resolved is None or not _HEX_RE.match(resolved):
        return None
    return resolved


def main() -> int:
    args = sys.argv[1:]
    aaa = False
    json_out = False
    positional: list[str] = []
    for a in args:
        if a == "--aaa":
            aaa = True
        elif a == "--json":
            json_out = True
        elif a.startswith("-"):
            print(f"unknown flag: {a}", file=sys.stderr)
            return 2
        else:
            positional.append(a)
    if len(positional) != 1:
        print(
            "usage: check_theme.py [--aaa] [--json] path/to/theme.json",
            file=sys.stderr,
        )
        return 2
    path = Path(positional[0])
    data = json.loads(path.read_text(encoding="utf-8"))

    # Coverage check: every role the theme defines must be either a foreground
    # role in PAIRS or a background role in BACKGROUND_ROLES. A role in
    # neither is a coverage bug: the theme renders it but nothing checks it.
    theme_roles = set(data.get("theme", {}).keys())
    paired_foregrounds = {fg for fg, _, _, _ in PAIRS}
    unpaired = theme_roles - paired_foregrounds - BACKGROUND_ROLES
    if unpaired:
        for role in sorted(unpaired):
            print(
                f"coverage: role {role!r} is defined in the theme but not "
                f"paired in PAIRS or listed in BACKGROUND_ROLES",
                file=sys.stderr,
            )
        print(
            f"{len(unpaired)} role(s) unpaired: extend PAIRS or "
            f"BACKGROUND_ROLES before trusting a pass.",
            file=sys.stderr,
        )
        return 1

    failures: list[dict] = []
    for fg_role, bg_role, floor, label in PAIRS:
        effective_floor = TEXT_AAA if (aaa and floor == TEXT_AA) else floor
        for scope in ("light", "dark"):
            fg_hex = resolve(data, fg_role, scope)
            bg_hex = resolve(data, bg_role, scope)
            if fg_hex is None or bg_hex is None:
                # A pair whose roles are missing from the theme is a coverage
                # gap, not a pass: report it.
                failures.append(
                    {
                        "scope": scope,
                        "label": label,
                        "fg_role": fg_role,
                        "fg_hex": fg_hex,
                        "bg_role": bg_role,
                        "bg_hex": bg_hex,
                        "ratio": None,
                        "floor": effective_floor,
                        "missing": True,
                    }
                )
                continue
            fg_rgb = hex_to_rgb(fg_hex)
            bg_rgb = hex_to_rgb(bg_hex)
            ratio = contrast_ratio(fg_rgb, bg_rgb)
            if ratio < effective_floor:
                failures.append(
                    {
                        "scope": scope,
                        "label": label,
                        "fg_role": fg_role,
                        "fg_hex": fg_hex,
                        "bg_role": bg_role,
                        "bg_hex": bg_hex,
                        "ratio": round(ratio, 2),
                        "floor": effective_floor,
                    }
                )

    if json_out:
        print(
            json.dumps(
                {"path": str(path), "aaa": aaa, "failures": failures}, indent=2
            )
        )
        return 0 if not failures else 1

    if not failures:
        checked = len(PAIRS)
        scope = "AAA" if aaa else "AA"
        print(
            f"OK: {path.name} checked {checked} pair(s) x 2 scopes, "
            f"every pair clears {scope}."
        )
        return 0

    for f in failures:
        if f.get("missing"):
            print(
                f"{path.name} [{f['scope']}] {f['label']}: "
                f"role {f['fg_role']!r} or {f['bg_role']!r} missing from theme"
            )
        else:
            print(
                f"{path.name} [{f['scope']}] {f['label']}: "
                f"{f['fg_role']} ({f['fg_hex']}) on {f['bg_role']} ({f['bg_hex']}) = "
                f"{f['ratio']}:1 < {f['floor']}:1 floor"
            )
    print(f"\n{len(failures)} pair(s) failed contrast.", file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main())
