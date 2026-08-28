import styles from "./KeyboardModeToggle.module.css";

interface KeyboardModeToggleProps<T extends string> {
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
}

/** Small segmented control for switching a keyboard's input method (e.g. standard layout vs. phonetic) — a local UI preference, see useKeyboardInputMethod. */
export function KeyboardModeToggle<T extends string>({ options, value, onChange, disabled }: KeyboardModeToggleProps<T>) {
  return (
    <div className={styles.toggle} role="tablist">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={option.value === value}
          className={option.value === value ? `${styles.option} ${styles.active}` : styles.option}
          disabled={disabled}
          // Same reasoning as VirtualKey: switching modes must never steal
          // focus off the answer input.
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
