import styles from "./XpBurst.module.css";

/** A floating "+N XP" badge, mounted fresh (keyed by the caller) so the pop animation replays on every correct answer. See domain/xp.ts for why this number is cosmetic only. */
export function XpBurst({ amount }: { amount: number }) {
  if (amount <= 0) return null;
  return (
    <span className={styles.burst} aria-hidden="true">
      +{amount} XP
    </span>
  );
}
