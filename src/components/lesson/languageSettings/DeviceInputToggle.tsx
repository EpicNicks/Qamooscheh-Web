import styles from "./DeviceInputToggle.module.css";

interface DeviceInputToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
}

/**
 * Lets a learner type on their own device's keyboard (a phone's OS keyboard,
 * a Bluetooth keyboard's own popup) instead of the on-screen one, for
 * whichever native-script keyboard is showing (see scriptEngines.tsx, which
 * renders this right beside that keyboard's Layout/Phonetic or Phonetic/
 * Kana SegmentedToggle and hides the on-screen keyboard itself while this is
 * on — showing both at once would just be clutter). A single switch, not a
 * SegmentedToggle: there's exactly one thing being turned on or off here,
 * not a choice between named options, but it borrows that component's pill
 * track and spring-eased thumb so it still reads as the same kind of control.
 */
export function DeviceInputToggle({ enabled, onChange, disabled }: DeviceInputToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      className={styles.toggle}
      disabled={disabled}
      // Same reasoning as VirtualKey's/SegmentedToggle's own mousedown
      // preventDefault: flipping this must never steal focus off the answer
      // input.
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => onChange(!enabled)}
    >
      <span className={styles.track} aria-hidden="true">
        <span className={styles.thumb} />
      </span>
      {enabled ? "Disable" : "Enable"} Device Input
    </button>
  );
}
