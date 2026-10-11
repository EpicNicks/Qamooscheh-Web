import styles from "./XpBurst.module.css";

/** A floating "+N XP" badge, mounted fresh (keyed by the caller) so the pop animation replays on every correct answer. The number is the grader's price for the answer (the server's AnswerXp); it is cosmetic because the session rules only the server applies (which correct retype this is, nothing after an exercise's first correct attempt) can still change what is credited. */
export function XpBurst({ amount }: { amount: number }) {
  if (amount <= 0) return null;
  return (
    <span className={styles.burst} aria-hidden="true">
      +{amount} XP
    </span>
  );
}
