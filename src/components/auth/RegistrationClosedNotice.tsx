import styles from "./RegistrationClosedNotice.module.css";

/**
 * Shown on Login/Register when useRegistrationStatus() reports the alpha
 * gate is closed (AuthOptions.RegistrationEnabled = false, backend). Purely
 * informational — the pages themselves decide what to hide/disable around
 * it (RegisterPage hides its form entirely; LoginPage keeps its form, since
 * manually-provisioned accounts still need to sign in).
 */
export function RegistrationClosedNotice({ message }: { message: string }) {
  return (
    <div className={styles.notice} role="status">
      {message}
    </div>
  );
}
