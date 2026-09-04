import { useRef, type KeyboardEvent, type ReactNode } from "react";
import styles from "./SegmentedToggle.module.css";

export interface SegmentedToggleOption<T extends string> {
  value: T;
  label: ReactNode;
}

interface SegmentedToggleProps<T extends string> {
  options: ReadonlyArray<SegmentedToggleOption<T>>;
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
}

/**
 * The one segmented-control implementation every "toggle between a few
 * options" control in the app builds on (script mode, keyboard input
 * method, vocab review scope, ...) — a sliding pill behind the selected
 * option with a springy overshoot, rather than each toggle re-implementing
 * its own instant background swap with its own easing (or none).
 *
 * `.inner` carries no padding/gap of its own — that's what lets the pill's
 * "1/N wide, translateX(index * 100%)" math land exactly on each option's
 * boundary regardless of `.outer`'s own padding around the whole control,
 * for any number of options.
 *
 * <b>A radio group, not a tab list.</b> Nothing here reveals a panel — each
 * option sets a value — so the wiring is `radiogroup`/`radio` + `aria-checked`
 * with the keyboard behavior that implies: one tab stop for the whole control
 * (only the checked option is tabbable) and Left/Up, Right/Down moving the
 * selection between options, wrapping at either end.
 */
export function SegmentedToggle<T extends string>({ options, value, onChange, disabled }: SegmentedToggleProps<T>) {
  const innerRef = useRef<HTMLDivElement>(null);
  const activeIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );

  /**
   * Arrow keys select as they move — the standard radio-group behavior, where
   * selection follows focus, rather than the "move focus, press Space to
   * choose" model a tab list would use. Focus is moved onto the newly checked
   * option explicitly since the previous one stops being tabbable.
   */
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (disabled || options.length < 2) return;

    const delta = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
    if (delta === 0) return;

    event.preventDefault();
    const nextIndex = (activeIndex + delta + options.length) % options.length;
    onChange(options[nextIndex].value);
    innerRef.current?.querySelectorAll<HTMLButtonElement>("button")[nextIndex]?.focus();
  }

  return (
    <div className={styles.outer}>
      <div
        ref={innerRef}
        className={styles.inner}
        role="radiogroup"
        onKeyDown={onKeyDown}
        style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}
      >
        <div
          className={styles.pill}
          aria-hidden="true"
          style={{ width: `${100 / options.length}%`, transform: `translateX(${activeIndex * 100}%)` }}
        />
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={option.value === value}
            // Roving tab stop: Tab reaches the control once and lands on
            // whichever option is currently chosen, arrows do the rest.
            tabIndex={option.value === value ? 0 : -1}
            className={styles.option}
            disabled={disabled}
            // Switching modes must never steal focus off whatever was
            // focused before (an answer input, mid-lesson) — same
            // reasoning as VirtualKey's own mousedown preventDefault.
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
