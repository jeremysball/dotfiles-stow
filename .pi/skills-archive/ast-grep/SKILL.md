---
name: ast-grep
description: Use for all structured code search, replace, and refactoring. Replaces sed, grep, and regex for code transformations. AST-aware, multi-language, precise.
---

# ast-grep Skill

## When to Use This Skill

Use ast-grep for any code search or transformation where structure matters. Never use sed, grep, or regex for code modifications.

| Use ast-grep | Use grep/sed |
|--------------|--------------|
| Find functions by signature | Search logs |
| Rename variables across scopes | Parse config files (INI) |
| Add parameters to functions | Simple text in non-code files |
| Migrate APIs (old → new) | Commands without code context |
| Extract or inline code | One-off string replacements |
| Enforce coding patterns | |

## Installation

```bash
# macOS
brew install ast-grep

# Linux
curl -fsSL https://ast-grep.github.io/install.sh | bash

# npm
npm install -g @ast-grep/cli

# Cargo
cargo install ast-grep
```

## Core Commands

### Search

```bash
# Find all async functions
ast-grep -p 'async function $NAME($$$ARGS) { $$$BODY }' -l ts

# Find arrow functions returning JSX
ast-grep -p 'const $NAME = ($$$ARGS) => ($$$JSX)' -l ts

# Search with constraints (only exported functions)
ast-grep -p 'function $NAME($$$ARGS) { $$$BODY }' -l ts \
  --rule '{pattern: {inside: {kind: export_statement}}}'
```

### Replace

```bash
# Preview changes (dry run)
ast-grep -p 'oldApi($$$ARGS)' -r 'newApi($$$ARGS)' -l ts

# Apply changes
ast-grep -p 'oldApi($$$ARGS)' -r 'newApi($$$ARGS)' -l ts --rewrite

# Rewrite all matching files in place
ast-grep -r my-rule.yml --rewrite
```

### Scan with Rules

```bash
# Run a rule file
ast-grep -r rule.yml

# Scan entire project
ast-grep scan

# Scan with specific config
ast-grep scan --config sgconfig.yml
```

## Pattern Syntax

### Metavariables

| Pattern | Matches |
|---------|---------|
| `$NAME` | Single identifier |
| `$$$ARGS` | Multiple arguments (zero or more) |
| `$_` | Anonymous match (don't capture) |

```bash
# Match function with any name, any args
ast-grep -p 'function $NAME($$$ARGS) { $$$BODY }'

# Match method call on any object
ast-grep -p '$OBJ.method($$$ARGS)'
```

### Constraints

Refine matches with constraints:

```yaml
rule:
  pattern: function $NAME($$$ARGS) { $$$BODY }
  constraints:
    NAME:
      regex: ^handle[A-Z]  # Only functions starting with "handle"
    ARGS:
      min: 1               # At least one argument
```

### Context

Match based on surrounding code:

```yaml
rule:
  pattern: console.log($$$ARGS)
  inside:
    pattern: try { $$$ } catch { $$$ }  # Only inside try blocks
```

## Rule Files

Complex transformations belong in YAML files:

```yaml
# no-console-in-production.yml
id: no-console-in-production
language: ts
severity: warning
message: Remove console.log before committing
rule:
  pattern: console.log($$$ARGS)
  not:
    inside:
      pattern: |
        if (process.env.NODE_ENV === 'development') {
          $$$
        }
fix: ''  # Replace with nothing (delete)
```

Run it:
```bash
ast-grep -r no-console-in-production.yml --rewrite
```

## Language Support

ast-grep supports these languages via `-l` flag:

| Language | Flag | Language | Flag |
|----------|------|----------|------|
| JavaScript | `js` | TypeScript | `ts` |
| Python | `py` | Rust | `rs` |
| Go | `go` | Java | `java` |
| C | `c` | C++ | `cpp` |
| Ruby | `rb` | PHP | `php` |
| Swift | `swift` | C# | `cs` |
| HTML | `html` | CSS | `css` |
| Bash | `bash` | SQL | `sql` |

## Common Recipes

### Refactor: Callbacks to Async/Await

```yaml
id: callback-to-async
language: js
rule:
  pattern: |
    $FUNC($$$ARGS, ($ERR, $RES) => {
      $$$BODY
    })
fix: |
  const $RES = await $FUNC($$$ARGS)
  $$$BODY
```

### Find: Unhandled Promise Rejections

```bash
ast-grep -p 'await $PROMISE' -l ts \
  --rule '{pattern: {not: {inside: {pattern: try { $$$ } catch { $$$ } }}}}'
```

### Replace: Import Paths

```bash
# Change all imports from old-lib to new-lib
ast-grep -p 'import $$$ from "old-lib"' -r 'import $$$ from "new-lib"' -l ts --rewrite
```

### Extract: All Function Names to List

```bash
ast-grep -p 'function $NAME($$$ARGS) { $$$BODY }' -l ts --json | \
  jq -r '.[].metaVariables.single.NAME.text' | sort -u
```

## sed vs ast-grep: Examples

### Example 1: Add async keyword

```bash
# WRONG: sed adds async to comments, strings, already-async functions
sed -i 's/function /async function /g' src/**/*.ts

# RIGHT: ast-grep only matches non-async function declarations
ast-grep -p 'function $NAME($$$ARGS) { $$$BODY }' \
  -r 'async function $NAME($$$ARGS) { $$$BODY }' -l ts --rewrite
```

### Example 2: Rename a variable

```bash
# WRONG: sed renames in comments, other scopes, object keys
sed -i 's/\bdata\b/items/g' src/**/*.ts

# RIGHT: ast-grep respects scope
ast-grep -p 'let data = $INIT' -r 'let items = $INIT' -l ts --rewrite
```

### Example 3: Find all React components

```bash
# WRONG: grep matches imports, comments, strings
grep -r "function.*Component" src/

# RIGHT: ast-grep matches actual function components returning JSX
ast-grep -p |
  'function $NAME($$$PROPS) { return ($$$JSX) }' \
  --rule '{constraints: {JSX: {regex: "<"}}}' -l tsx
```

## Configuration File

Create `sgconfig.yml` for project-wide rules:

```yaml
ruleDirs:
  - rules
  - more-rules
utilsDirs:
  - utils
ignore:
  - '*.min.js'
  - 'dist/**'
```

## Bottom Line

Use ast-grep when structure matters. Use grep/sed only for text without syntax. ast-grep understands code; regex does not.