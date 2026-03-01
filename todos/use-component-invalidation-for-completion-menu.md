# TODO: Use Component-Based Invalidation for Completion Menu

## Current State (Temporary Workaround)

We currently use a callback mechanism to notify `AlfredTUI` when the completion menu state changes:

```python
# AlfredTUI sets up callback
self.input_field = WrappedInput().with_completion(
    self._command_provider,
    trigger="/",
    on_state_change=self._on_completion_state_change,  # Callback!
)

# Callback calls TUI invalidate
def _on_completion_state_change(self) -> None:
    self.tui.invalidate()
```

**Problem:** This breaks information hiding - the `CompletionAddon` needs to know about the TUI, and `AlfredTUI` needs to expose a callback method.

## Desired State (When pypitui#4 is implemented)

With [pypitui#4](https://github.com/jeremysball/pypitui/issues/4) (component-aware invalidation), we can use bubble-up invalidation:

```python
# CompletionAddon - no callback needed!
def _handle_render(self, lines: list[str], width: int) -> list[str]:
    # ... state change detection ...
    if state_changed:
        self._input.invalidate()  # Just invalidate self, bubbles to TUI
    # ...

# WrappedInput - invalidate bubbles up
class WrappedInput(Component):
    def invalidate(self) -> None:
        super().invalidate()  # Bubbles to parent (TUI)

# AlfredTUI - no callback needed!
self.input_field = WrappedInput().with_completion(
    self._command_provider,
    trigger="/",
    # No on_state_change callback!
)
```

## Required pypitui Features

1. **Parent references in components**
   ```python
   class Component:
       def __init__(self):
           self._parent: Container | None = None
       
       def invalidate(self) -> None:
           if self._parent:
               self._parent._child_invalidated(self)
   ```

2. **Position tracking in TUI**
   ```python
   class TUI(Container):
       def render(self, width: int) -> list[str]:
           self._component_positions = {}
           lines = []
           for child in self.children:
               start = len(lines)
               child_lines = child.render(width)
               self._component_positions[child] = (start, len(lines))
               lines.extend(child_lines)
           return lines
       
       def _child_invalidated(self, child: Component) -> None:
           if child in self._component_positions:
               start, end = self._component_positions[child]
               for i in range(start, end):
                   if i < len(self._previous_lines):
                       self._previous_lines[i] = ""
           self.request_render()
   ```

## Changes Required in alfred-prd

### 1. Remove `on_state_change` callback parameter

**File:** `src/interfaces/pypitui/completion_addon.py`
- Remove `on_state_change` from `__init__`
- Remove callback invocation in `_handle_render`
- Call `self._input.invalidate()` instead

**File:** `src/interfaces/pypitui/wrapped_input.py`
- Remove `on_state_change` from `with_completion()`
- Stop passing it to `CompletionAddon`

**File:** `src/interfaces/pypitui/tui.py`
- Remove `_on_completion_state_change()` method
- Remove `on_state_change=` from `with_completion()` calls

### 2. Ensure bubble-up works (if needed)

If pypitui doesn't set `_parent` automatically, we may need:

```python
# In WrappedInput or Container setup
class WrappedInput(Component):
    def __init__(self):
        super().__init__()
        # Ensure parent is set when added to container
        
    def invalidate(self) -> None:
        # Could also call directly if we have reference
        if hasattr(self, '_tui'):
            self._tui.invalidate_component(self)
        else:
            super().invalidate()
```

## Migration Plan

1. Wait for pypitui#4 to be implemented and released
2. Update pypitui dependency in `pyproject.toml`
3. Remove callback parameters from `CompletionAddon`
4. Remove callback parameters from `WrappedInput.with_completion()`
5. Remove `_on_completion_state_change()` from `AlfredTUI`
6. Update `CompletionAddon._handle_render()` to call `self._input.invalidate()`
7. Run tests to verify menu still clears correctly

## Benefits

- **Information hiding:** `CompletionAddon` doesn't need to know about TUI
- **Cleaner API:** No callback wiring needed
- **Component-based:** Follows React-style component architecture
- **Targeted invalidation:** Only clears the input component's lines, not entire screen

## References

- pypitui issue: https://github.com/jeremysball/pypitui/issues/4
- Current workaround: `AlfredTUI._on_completion_state_change()` method
