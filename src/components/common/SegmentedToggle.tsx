import type { ReactNode } from "react";
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
 */
export function SegmentedToggle<T extends string>({ options, value, onChange, disabled }: SegmentedToggleProps<T>) {
  const activeIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );

  return (
    <div className={styles.outer}>
      <div className={styles.inner} role="tablist" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
        <div
          className={styles.pill}
          aria-hidden="true"
          style={{ width: `${100 / options.length}%`, transform: `translateX(${activeIndex * 100}%)` }}
        />
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={option.value === value}
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
