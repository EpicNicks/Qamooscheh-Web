import { useState, type KeyboardEvent } from "react";

export interface ListNavigation {
  /** -1 when the list is empty; otherwise always a valid index into the current list. */
  activeIndex: number;
  /** For pointer hover (which moves the highlight, so the fact panel follows the mouse) and for resetting to 0 when the filter changes. */
  setActiveIndex: (index: number) => void;
  /** Attach to whichever element holds focus — here that's the search input, with `aria-activedescendant` pointing at the highlighted row. */
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
}

/**
 * Roving-highlight keyboard navigation for a listbox, in ~30 lines rather than
 * a dependency — this repo stays on react/react-dom/react-router-dom/
 * @tanstack/react-query only.
 *
 * ArrowUp/Down CLAMP rather than wrap: with a search box above the list, wrapping
 * from the last row back to the first reads as "the list jumped" when what the
 * user wanted was to find out they'd reached the end.
 *
 * The stored index is clamped at read time instead of being corrected by an
 * effect. Filtering the list can strand it past the end, and clamping on the way
 * out means the highlight is never briefly invalid for a render — there is no
 * external system to synchronize with here, so there is nothing for an effect to do.
 */
export function useListNavigation(itemCount: number, onSelect: (index: number) => void): ListNavigation {
  const [storedIndex, setStoredIndex] = useState(0);
  const activeIndex = itemCount === 0 ? -1 : Math.min(storedIndex, itemCount - 1);

  function moveTo(index: number) {
    setStoredIndex(Math.max(0, Math.min(index, itemCount - 1)));
  }

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (itemCount === 0) return;

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        moveTo(activeIndex + 1);
        break;
      case "ArrowUp":
        event.preventDefault();
        moveTo(activeIndex - 1);
        break;
      case "Home":
        event.preventDefault();
        moveTo(0);
        break;
      case "End":
        event.preventDefault();
        moveTo(itemCount - 1);
        break;
      case "Enter":
        // Not preventDefault'd for its own sake — this hook is used inside a
        // form-less panel — but a search input would otherwise submit an
        // enclosing form, and Enter here means "take this row".
        event.preventDefault();
        onSelect(activeIndex);
        break;
      default:
        break;
    }
  }

  return { activeIndex, setActiveIndex: moveTo, onKeyDown };
}
