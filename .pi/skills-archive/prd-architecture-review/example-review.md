# Example PRD/Architecture Review

This is an example of a complete review following the skill methodology.

---

## PRD Review: PyPiTUI Core Implementation

### Summary
The PRD comprehensively covers the TUI library implementation but has **5 critical issues** that must be resolved before implementation begins. Main risks are around overlay/focus interaction, scrollback handling semantics, and terminal I/O architecture mismatches.

---

### 🔴 Critical Issues

#### 1. Overlay Focus Management Contradiction
**Category:** Architectural Mismatch  
**Location:** Milestone 6 (Overlays), Milestone 5 (Focus)

**Issue:** The PRD states `Overlay` is **NOT a Component** but then requires focus operations on overlays. The test `test_show_overlay_pushes_focus()` implies pushing the overlay, but `test_close_overlay_pops_focus()` compares against `overlay.content`.

**Justification:** This creates type confusion in the focus stack. If `push_focus()` receives an Overlay, the stack contains mixed types (Components and Overlays). If it receives `overlay.content`, the comparison logic must use Component identity.

**Fix:** Explicitly specify:
```python
# TUI.show_overlay() pushes the Component, not the Overlay
self.push_focus(overlay.content)  # Component goes on stack

# TUI.close_overlay() compares against Component
if self._focused is overlay.content:  # Compare Component identity
    self.pop_focus()
```

**Tradeoffs:**
| Approach | Pros | Cons |
|----------|------|------|
| Push Component | Type consistency, matches architecture | Slightly less intuitive API |
| Push Overlay | More intuitive | Requires union types in focus stack |

---

#### 2. Scrollback Edit Detection Ambiguity
**Category:** Vague Area  
**Location:** Milestone 2 (Rendering Engine)

**Issue:** The PRD says "Edit in scrollback triggers full redraw" but doesn't define "scrollback." Is it:
- Any content above current viewport (`first_changed < viewport_top`)?
- Only content that was already in scrollback before this render?

**Justification:** Different interpretations lead to different behaviors. "Already in scrollback" requires tracking previous viewport position, adding complexity. "Any content above viewport" is simpler and more predictable.

**Fix:** Use the simpler definition:
```python
def _is_scrollback_edit(self, first_changed: int) -> bool:
    """Return True if edit is above visible viewport."""
    return first_changed < self._viewport_top
```

**Rationale:** Terminal scrollback is immutable. Any attempt to edit content above the visible viewport requires a full clear+redraw because cursor positioning cannot reach that content.

---

#### 3. DEC 2026 Detection is Unimplementable
**Category:** Error  
**Location:** Milestone 1

**Issue:** `Terminal.query_dec2026_support()` requires synchronous request/response, but the architecture specifies **async threaded input** with callbacks. There's no mechanism to correlate the query response with the request.

**Justification:** The input thread owns stdin and dispatches to callbacks. A synchronous query would need to either:
- Pause the input thread (race condition)
- Add request/response correlation (complex state machine)
- Query before starting async thread (limits when detection can occur)

**Fix:** Defer DEC 2026 detection to post-MVP. For MVP:
```python
# Assume modern terminal support
self._dec2026_supported = True  # Post-MVP: implement detection
```

---

#### 4. Escape Sequence Efficiency Metric is Unmeasurable
**Category:** Weak Acceptance Criteria  
**Location:** Success Criteria #2

**Issue:** "Append-only emits ≤20% of escape sequences vs full clear+redraw" cannot be verified without:
- A mock terminal that counts escape sequences
- Defined baseline for "full clear+redraw"
- Accounting for DEC 2026 sync codes

**Justification:** Without measurement infrastructure, this criteria is honorary. Tests cannot enforce it.

**Fix:** Specify MockTerminal:
```python
class MockTerminal:
    def __init__(self):
        self._escape_counts: dict[str, int] = {}
    
    def get_escape_sequence_count(self) -> int:
        return sum(self._escape_counts.values())

def test_append_efficiency():
    term = MockTerminal()
    tui = TUI(term)
    # ... render frames ...
    assert term.get_escape_sequence_count() <= FULL_REDRAW_BASELINE * 0.20
```

---

#### 5. Component Render Caching Specification
**Category:** Footgun  
**Location:** Milestone 3

**Issue:** The Text component has `_cached: list[RenderedLine] | None` but no invalidation strategy is specified. When does the cache clear?

**Justification:** Manual `invalidate()` calls are error-prone. Developers will forget, leading to stale renders. The architecture implies caching helps, but doesn't specify when it's safe.

**Fix:** Remove component-level caching from MVP. Rely on TUI-level diff caching (`_previous_lines`). Add to Post-MVP with automatic invalidation design.

**Post-MVP Design:**
```python
# Automatic invalidation when width changes
class Component:
    @property
    def _cached_width(self) -> int:
        return self.__cached_width
    
    def render(self, width: int) -> list[RenderedLine]:
        if self._cached is None or width != self._cached_width:
            self._cached = self._do_render(width)
            self.__cached_width = width
        return self._cached
```

---

### 🟡 Moderate Issues

#### 6. Hardware Cursor Tracking Undefined
**Category:** Vague Area  
**Location:** Milestone 2

**Issue:** The PRD mentions `_hardware_cursor_row` but doesn't specify:
- When it's updated (after each write? after frame?)
- How it interacts with cursor hide/show
- Calculation for overlay-focused components (absolute vs relative coords)

**Fix:** Add explicit tracking requirements:
```python
def _output_line(self, line: str, screen_row: int) -> None:
    # ... move cursor ...
    self.terminal.write(line)
    self._hardware_cursor_row = screen_row
    self._hardware_cursor_col = len(line)
```

For overlay focus, calculate absolute screen position:
```python
if self._is_in_overlay(focused_component):
    abs_pos = self._resolve_position(overlay.position)
    screen_row = abs_pos.row + rel_pos.row
```

---

#### 7. Input Handling Return Type Unspecified
**Category:** Incorrect Translation  
**Location:** Milestone 4, 5

**Issue:** `handle_input()` is shown returning `None`, but the architecture implies input consumption semantics. Does the component consume the input or bubble it up?

**Fix:** Specify return type:
```python
def handle_input(self, data: bytes) -> bool:
    """Return True if input was consumed, False to bubble up."""
```

---

#### 8. Mouse Protocol Unspecified
**Category:** Vague Area  
**Location:** Milestone 1

**Issue:** Mouse events mentioned but protocol not specified. Which one?
- X10 compatibility mode?
- SGR 1006 extended?
- UTF-8 mode?

**Fix:** Specify SGR 1006:
```python
# Enable: CSI ? 1006 h
# Format: CSI < Cb ; Cx ; Cy M/m
```

Focus determination by hit-testing `component._rect` against mouse coordinates.

---

### 🟢 Minor Issues

#### 9. File Structure Inconsistency
**Category:** Consistency  
**Location:** File Structure section

**Issue:** PRD shows `rich_components.py` at top level, but architecture shows `components/overlay.py`.

**Fix:** Move to `src/pypitui/components/rich.py` for consistency.

---

#### 10. Public API Export List Incomplete
**Category:** Consistency  
**Location:** Milestone 8

**Issue:** Only shows 4 exports (`TUI, Container, Text, Input`) but PRD tests use many more types.

**Fix:** Define complete public API:
```python
from pypitui import (
    TUI, Component, Size, RenderedLine, Rect,
    Container, Text, Input, SelectList, SelectItem, BorderedBox,
    Overlay, OverlayPosition,
    Key, matches_key, parse_key, MouseEvent, parse_mouse,
    Focusable, LineOverflowError,
    detect_color_support, truncate_to_width, slice_by_width
)
```

---

### Recommendations

#### Must Fix (Before Implementation)
1. Clarify overlay focus pushes `overlay.content` (Component), not Overlay
2. Define scrollback edit as `first_changed < viewport_top`
3. Remove DEC 2026 detection from MVP
4. Add MockTerminal spec for efficiency testing
5. Remove component render caching from MVP

#### Should Fix (Can Defer)
6. Add hardware cursor tracking specification
7. Specify `handle_input() -> bool` return type
8. Document SGR 1006 mouse protocol

#### Nice to Have
9. Fix file structure consistency
10. Complete public API export list

---

### Backporting Required

After PRD updates, architecture doc needs:

1. **Terminal I/O Architecture section** — Explicit async/sync split
2. **Hardware Cursor Management section** — Tracking requirements
3. **Post-MVP section** — Component caching, DEC 2026 detection, Kitty keyboard
4. **Core Tenet #4** — "Any scrollback change triggers full redraw"
5. **Focus protocol** — `handle_input() -> bool`
