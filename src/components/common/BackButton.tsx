import { useNavigate } from "react-router-dom";
import styles from "./BackButton.module.css";

/**
 * `navigate(-1)` rather than a hardcoded destination — the caller pushed a
 * real history entry to get here (GlossaryTree's leaf links are plain
 * `Link`s), so going back through history is what makes the browser's own
 * back/forward buttons agree with this button instead of fighting it.
 */
export function BackButton({ label = "Back" }: { label?: string }) {
  const navigate = useNavigate();
  return (
    <button type="button" className={styles.back} onClick={() => navigate(-1)}>
      ← {label}
    </button>
  );
}
