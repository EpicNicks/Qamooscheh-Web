import { SegmentedToggle } from "../../common/SegmentedToggle";
import type { NativeTextAlign } from "../../../lib/localAppPrefs";
import styles from "./NativeTextAlignToggle.module.css";

interface NativeTextAlignToggleProps {
  value: NativeTextAlign;
  onChange: (align: NativeTextAlign) => void;
}

/**
 * Which edge a block of native-script (RTL) text lines up against — see
 * localAppPrefs.ts's NativeTextAlign for why this exists and defaults left.
 * Purely a block-alignment choice: the text itself keeps reading
 * right-to-left regardless of which option is picked here.
 */
export function NativeTextAlignToggle({ value, onChange }: NativeTextAlignToggleProps) {
  return (
    <div className={styles.wrap}>
      <p className={styles.heading}>Text Alignment</p>
      <SegmentedToggle
        value={value}
        onChange={onChange}
        options={[
          { value: "left", label: "Left" },
          { value: "center", label: "Center" },
          { value: "right", label: "Right" },
        ]}
      />
    </div>
  );
}
