#!/usr/bin/env python3
"""sync-pi-nanogpt.py: regenerate pi's nanogpt provider model list.

Kilo and opencode ship nano-gpt.com as a built-in models.dev catalog compiled
into their binaries. Pi has no such built-in: nanogpt is a custom provider in
~/.pi/agent/models.json, so its list only grows when someone rebuilds it.
This script rebuilds pi's list from the provider's own detailed catalog
endpoint, GET {baseURL}/models?detailed=true, which is strictly better than
either harness's embedded snapshot: it lists exactly the ids the API serves
today (the binary catalogs still carry 72 retired ids that 404) and carries
per-model context, output, capability, and price metadata, so no local
scraping or guessing is needed.

Usage:
  scripts/sync-pi-nanogpt.py [--repo-root PATH] [--models PATH]
                             [--dump FILE] [--input FILE] [--dry-run]

  --repo-root  dotfiles checkout root (default: this script's repo root)
  --models     pi models.json to rewrite
               (default: <repo-root>/.pi/agent/models.json)
  --dump FILE  write the raw endpoint response to FILE for offline reuse
  --input FILE read metadata from a prior --dump instead of the network
               (NANO_GPT_API_KEY not required)
  --dry-run    print the summary without writing

Merge policy, per model id:
  - ids already present in pi's models.json keep their existing entry
    untouched; they carry hand-set names and caps.
  - every id the endpoint serves is registered, with context capped at
    CONTEXT_CAP (200k), matching the fleet-cap convention in opencode.jsonc
    and settings.json modelOverrides. Smaller native windows pass through.
  - the script never deletes ids, so a flaky endpoint cannot shrink pi's
    config. With --input a prior dump, the rebuild is reproducible offline.

Rerun after nano-gpt.com's lineup changes; kilo and opencode pick the same
lineup up automatically when their binaries update.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.request

BASE_URL = "https://nano-gpt.com/api/v1"
CONTEXT_CAP = 200000
FALLBACK_CONTEXT = 200000
FALLBACK_MAX_TOKENS = 32768


def fetch_detailed() -> list[dict]:
    key = os.environ.get("NANO_GPT_API_KEY")
    if not key:
        sys.exit("NANO_GPT_API_KEY not set; use --input FILE from a prior --dump")
    req = urllib.request.Request(
        f"{BASE_URL}/models?detailed=true",
        headers={"Authorization": f"Bearer {key}"},
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        payload = json.load(resp)
    if not isinstance(payload, dict) or not isinstance(payload.get("data"), list) or not payload["data"]:
        sys.exit("endpoint returned an unexpected shape; refusing to rebuild from it")
    for m in payload["data"]:
        if not m.get("id"):
            sys.exit("endpoint returned an entry without an id; aborting")
    return payload["data"]


def build_entry(m: dict) -> dict:
    caps = m.get("capabilities") or {}
    arch = m.get("architecture") or {}
    inputs = ["text"]
    if "image" in (arch.get("input_modalities") or []) or caps.get("vision"):
        inputs.append("image")
    entry = {
        "id": m["id"],
        "name": f'{m.get("name") or m["id"]} (NanoGPT)',
        "reasoning": bool(caps.get("reasoning")),
        "input": inputs,
        "contextWindow": min(int(m.get("context_length") or FALLBACK_CONTEXT), CONTEXT_CAP),
        "maxTokens": int(m.get("max_output_tokens") or FALLBACK_MAX_TOKENS),
    }
    p = m.get("pricing") or {}
    try:
        entry["cost"] = {
            "input": float(p.get("prompt") or 0),
            "output": float(p.get("completion") or 0),
            # endpoint states cache rates per 1k tokens; pi and models.dev use per 1M
            "cacheRead": round(float(p.get("cacheReadInputPer1kTokens") or 0) * 1000, 6),
            "cacheWrite": round(float(p.get("cacheWriteInputPer1kTokens") or 0) * 1000, 6),
        }
    except (TypeError, ValueError):
        entry["cost"] = {"input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0}
    return entry


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    default_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ap.add_argument("--repo-root", default=default_root)
    ap.add_argument("--models")
    ap.add_argument("--dump")
    ap.add_argument("--input")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    models_path = args.models or os.path.join(args.repo_root, ".pi", "agent", "models.json")

    if args.input:
        with open(args.input) as fh:
            data = json.load(fh)["data"]
        print(f"source: {args.input} ({len(data)} ids)")
    else:
        data = fetch_detailed()
        print(f"source: {BASE_URL}/models?detailed=true ({len(data)} ids)")
        if args.dump:
            with open(args.dump, "w") as fh:
                json.dump({"data": data}, fh)
            print(f"dumped raw response to {args.dump}")

    with open(models_path) as fh:
        doc = json.load(fh)
    provider = doc.setdefault("providers", {}).get("nanogpt")
    if provider is None or not provider.get("baseUrl"):
        sys.exit(f"{models_path}: nanogpt provider block missing or malformed; refusing to write")
    existing = {m["id"]: m for m in provider.get("models", [])}

    served = {m["id"] for m in data}
    stale = sorted(k for k in existing if k not in served)
    for mid in stale:
        print(f"WARN: pi carries id the endpoint no longer serves: {mid}", file=sys.stderr)

    additions = sorted(
        (build_entry(m) for m in data if m["id"] not in existing),
        key=lambda e: e["id"].lower(),
    )
    entries = sorted(existing.values(), key=lambda m: m["id"].lower()) + additions
    provider["models"] = entries
    print(f"result: {len(entries)} models ({len(existing)} preserved + {len(additions)} added)")

    if args.dry_run:
        print("dry-run: not writing")
        return 0

    tmp = models_path + ".tmp"
    with open(tmp, "w") as fh:
        json.dump(doc, fh, indent=2)
        fh.write("\n")
    os.replace(tmp, models_path)
    print(f"wrote {models_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
