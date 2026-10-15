import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ApiError } from "../api/httpClient";
import { useFriendStats, useUnfriend } from "../hooks/useFriends";
import { Button } from "../components/common/Button";
import { UnfriendConfirmDialog } from "../components/friends/UnfriendConfirmDialog";
import { errorMessage } from "../lib/errors";
import { avatarColorToken, avatarInitial, friendsSinceLabel, leagueRowOrNull } from "../domain/friendProfile";
import type { FriendStatsResponse } from "../types/api";
import styles from "./FriendProfilePage.module.css";

function Notice({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className={styles.page}>
      <div className={styles.empty}>
        <h1>{title}</h1>
        <p>{children}</p>
        {action}
        <Link className={styles.back} to="/friends">
          Back to Friends
        </Link>
      </div>
    </div>
  );
}

/** Presentational, so the states can be rendered without a data layer. */
export function FriendProfileView({
  stats,
  onUnfriend,
}: {
  stats: FriendStatsResponse;
  onUnfriend: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const name = stats.displayName ?? "Unnamed learner";
  const since = friendsSinceLabel(stats.since);
  const league = leagueRowOrNull(stats);

  async function copy() {
    try {
      await navigator.clipboard.writeText(`@${stats.username}`);
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
      <section className={styles.header}>
        <div
          className={styles.avatar}
          style={{ "--avatar-color": `var(${avatarColorToken(stats.userId)})` } as React.CSSProperties}
          aria-hidden="true"
        >
          {avatarInitial(stats.displayName)}
        </div>
        <h1 className={styles.name}>{name}</h1>
        {stats.username && (
          <div className={styles.handleRow}>
            <span className={styles.handle}>@{stats.username}</span>
            <button type="button" className={styles.copy} onClick={copy} aria-label={`Copy @${stats.username}`}>
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        )}
      </section>
      <dl className={styles.stats}>
        {since && (
          <div className={styles.stat}>
            <dt>Friends since</dt>
            <dd>{since}</dd>
          </div>
        )}
        {league && (
          <div className={styles.stat}>
            <dt>In your league this week</dt>
            <dd>
              Rank {league.rank} · {league.points} XP
            </dd>
          </div>
        )}
      </dl>
      <Button variant="danger" onClick={onUnfriend}>
        Unfriend
      </Button>
    </div>
  );
}

export function FriendProfilePage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const stats = useFriendStats(userId);
  const unfriend = useUnfriend();
  const [confirming, setConfirming] = useState(false);

  if (stats.isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.skeleton} role="status" aria-label="Loading friend…" />
      </div>
    );
  }

  if (stats.isError) {
    const status = stats.error instanceof ApiError ? stats.error.status : null;
    if (status === 404) return <Notice title="Not friends any more">This person isn&apos;t in your friends list.</Notice>;
    const retry = (
      <Button variant="secondary" onClick={() => stats.refetch()} disabled={stats.isFetching}>
        Try again
      </Button>
    );
    if (status === 429) {
      return (
        <Notice title="Slow down a little" action={retry}>
          You&apos;ve looked up a lot of profiles. Wait a moment, then try again.
        </Notice>
      );
    }
    return (
      <Notice title="Couldn't load this profile" action={retry}>
        {errorMessage(stats.error)}
      </Notice>
    );
  }

  if (!stats.data) return null;
  const data = stats.data;

  function confirmUnfriend() {
    unfriend.mutate(data.userId, { onSuccess: () => navigate("/friends", { replace: true }) });
  }

  return (
    <>
      <FriendProfileView
        stats={data}
        onUnfriend={() => {
          unfriend.reset();
          setConfirming(true);
        }}
      />
      {confirming && (
        <UnfriendConfirmDialog
          name={data.displayName ?? "this learner"}
          pending={unfriend.isPending}
          error={unfriend.isError ? errorMessage(unfriend.error, "Couldn't unfriend. Try again.") : null}
          onCancel={() => setConfirming(false)}
          onConfirm={confirmUnfriend}
        />
      )}
    </>
  );
}
