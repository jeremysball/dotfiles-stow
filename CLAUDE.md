# dotfiles — project instructions

This file is the standing project memory for `jeremysball/dotfiles`. It layers on top of `~/.claude/CLAUDE.md` (global) and applies only inside this repo.

## Prefer building from source over downloading a prebuilt binary

**Standing order: always prefer to build a tool from source over downloading a prebuilt binary, especially when the build is trivial.**

Concrete cases:

- **Go** — `go:github.com/owner/repo` (`go install`) over `github:owner/repo` or `ubi:owner/repo`. A `go install` is one `go` invocation, produces a correctly-named binary, and tracks source. The `github`/`ubi`/`aqua` backends are only for tools with no easy source build or where the release asset name matches the binary exactly and `mise which <tool>` has been verified to resolve. The `catbow` fix (`github:jeremysball/catbow` → `go:github.com/jeremysball/catbow`, `cb` vs `catbow` mismatch at `~/.local/share/mise/installs/github-jeremysball-catbow/1.0.1/cb:1`) is the canonical example of why.
- **Rust** — `cargo:owner/repo` over `github:`/`aqua:` when a `Cargo.toml` is at the repo root.
- **Python** — `uv:`, `pipx:`, or `aqua:` source builds over a platform-specific wheel/tarball when the package publishes a simple install.
- **General** — if `mise` offers both a source backend (`go:`, `cargo:`, `npm:`, `pipx:`, `uv:`) and a binary backend (`github:`, `ubi:`, `aqua:`) for the same tool, choose the source backend unless there is a documented reason not to (e.g., build requires a large native toolchain, takes >2 minutes, or needs private deps).

Verification before committing a tool backend choice:

```sh
mise install          # install from the edited mise.toml
mise which <tool>     # must resolve to .../installs/<backend>-<tool>/latest/bin/<tool>, not "No executable found"
<tool> --help 2>&1 | head
which <tool>          # fish: should be ~/.local/share/mise/shims/<tool> after `mise reshim`
```

If a binary backend is kept, document why in a comment above the entry in `.config/mise/config.toml:30` (e.g., `# github: retained — no go/cargo source, asset is <tool>-<version>-<os>-<arch>.tar.gz with correct name, verified via mise which`).
