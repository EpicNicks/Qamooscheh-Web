import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useCurrentLeague } from "../hooks/useLeague";
import { useFriends } from "../hooks/useFriends";
import { ErrorBanner } from "../components/common/ErrorBanner";
import { errorMessage } from "../lib/errors";
import {
  avatarColorToken,
  avatarInitial,
  friendsSinceLabel,
  resolveFriendProfile,
  type FriendProfileResolution,
} from "../domain/friendProfile";
import styles from "./FriendProfilePage.module.css";

/** Presentational, so the unknown-id and found states can be rendered without a data layer. */
export function FriendProfileView({ resolution }: { resolution: FriendProfileResolution }) {
  const [copied, setCopied] = useState(false);

  if (resolution.status === "unknown") {
    return (
      <div className={styles.page}>
        <div className={styles.empty}>
          <h1>Friend not found</h1>
          <p>This person isn&apos;t in your friends list, or the link is out of date.</p>
          <Link className={styles.back} to="/friends">
            Back to Friends
          </Link>
        </div>
      </div>
    );
  }

  const { friend, league } = resolution;
  const name = friend.displayName ?? "Unnamed learner";
  const since = friendsSinceLabel(friend.since);

  async function copy() {
    try {
      await navigator.clipboard.writeText(`@${friend.username}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked; the handle stays selectable on screen.
    }
  }

  return (
    <div className={styles.page}>
      <Link className={styles.back} to="/friends">
        ← Back to Friends
      </Link>
      <section className={styles.header} aria-labelledby="friend-name">
        <div
          className={styles.avatar}
          style={{ "--avatar-color": `var(${avatarColorToken(friend.userId)})` } as React.CSSProperties}
          aria-hidden="true"
        >
          {avatarInitial(friend.displayName)}
        </div>
        <h1 id="friend-name" className={styles.name}>
          {name}
        </h1>
        {friend.username && (
          <div className={styles.handleRow}>
            <span className={styles.handle}>@{friend.username}</span>
            <button type="button" className={styles.copy} onClick={copy} aria-label={`Copy @${friend.username}`}>
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        )}
        {since && <p className={styles.since}>{since}</p>}
      </section>
      {league && (
        <section className={styles.league} aria-label="League standing">
          <div className={styles.leagueLabel}>
            <span className={styles.leagueTitle}>In your league this week</span>
            <span className={styles.rank}>Rank {league.rank}</span>
          </div>
          <span className={styles.points}>{league.points} XP</span>
        </section>
      )}
    </div>
  );
}

export function FriendProfilePage() {
  const { userId } = useParams();
  const friends = useFriends();
  // A 404 (no active league) just means no league card.
  const league = useCurrentLeague();

  if (friends.isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.skeleton} role="status" aria-label="Loading friend…" />
      </div>
    );
  }
  if (friends.isError) return <ErrorBanner message={errorMessage(friends.error)} />;

  return <FriendProfileView resolution={resolveFriendProfile(userId, friends.data ?? [], league.data)} />;
}
