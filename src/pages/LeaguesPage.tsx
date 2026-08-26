import { useCurrentLeague } from "../hooks/useLeague";
import { useAuth } from "../auth/useAuth";
import { Spinner } from "../components/common/Spinner";
import { ErrorBanner } from "../components/common/ErrorBanner";
import { errorMessage } from "../lib/errors";
import styles from "./LeaguesPage.module.css";

export function LeaguesPage() {
  const { userId } = useAuth();
  const league = useCurrentLeague();

  if (league.isLoading) return <Spinner label="Loading league…" />;
  if (league.isError) {
    return <ErrorBanner message={errorMessage(league.error, "No active league right now.")} />;
  }
  if (!league.data) return null;

  return (
    <div>
      <h1>Tier {league.data.tier}</h1>
      <p className={styles.endsAt}>Ends {new Date(league.data.periodEndsAt).toLocaleString()}</p>
      <ol className={styles.standings}>
        {league.data.standings.map((row, index) => (
          <li key={row.userId} className={row.userId === userId ? styles.me : styles.row}>
            <span className={styles.rank}>{index + 1}</span>
            <span className={styles.name}>{row.displayName ?? "Unnamed learner"}</span>
            <span className={styles.points}>{row.points} XP</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
