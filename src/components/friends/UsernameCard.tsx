import { useState } from "react";
import { ApiError } from "../../api/httpClient";
import { useSetUsername, useUsername } from "../../hooks/useUsername";
import { useLocalAppPref } from "../../hooks/useLocalAppPref";
import { normalizeUsername, renameErrorCopy, usernameFormatProblem } from "../../domain/username";
import { Button } from "../common/Button";
import { ErrorBanner } from "../common/ErrorBanner";
import { errorMessage } from "../../lib/errors";
import styles from "./UsernameCard.module.css";

/**
 * The learner's own handle, with copy-to-clipboard and a rename form
 * (PUT /v1/username). `showPrompt` adds the one-time "change it?" nudge for an
 * auto-assigned handle; dismissal is remembered per user on this device.
 */
export function UsernameCard({ showPrompt = false }: { showPrompt?: boolean }) {
  const username = useUsername();
  const setUsername = useSetUsername();
  // Signed-out default is "dismissed": there is nobody to prompt.
  const [dismissed, setDismissed] = useLocalAppPref("usernamePromptDismissed", true);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [copied, setCopied] = useState(false);

  if (username.isLoading) return null;
  if (username.isError || !username.data) {
    return <ErrorBanner message={errorMessage(username.error, "Couldn't load your username.")} />;
  }
  const { username: handle, autoAssigned, canChangeAt } = username.data;

  const normalized = normalizeUsername(draft);
  const formatProblem = draft.trim() ? usernameFormatProblem(normalized) : null;
  const unchanged = normalized === handle;
  const mutationError =
    setUsername.error instanceof ApiError
      ? renameErrorCopy(setUsername.error.status, setUsername.error.body?.reason, setUsername.error.body?.canChangeAt)
      : setUsername.error
        ? renameErrorCopy(null, undefined)
        : null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(`@${handle}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked (insecure context, permissions); the handle stays selectable on screen.
    }
  }

  function startEditing() {
    setUsername.reset();
    setDraft(handle ?? "");
    setEditing(true);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (formatProblem || !normalized) return;
    setUsername.mutate(normalized, {
      onSuccess: () => {
        setEditing(false);
        setDismissed(true);
      },
    });
  }

  // Keeping an auto-assigned handle is a PUT of the same value: it confirms
  // it (no cooldown starts) and the prompt never comes back.
  function keepHandle() {
    if (handle) setUsername.mutate(handle);
    setDismissed(true);
  }

  const showNudge = showPrompt && !dismissed && autoAssigned && handle !== null && !editing;

  return (
    <section className={styles.card} aria-label="Your username">
      <span className={styles.label}>Your username</span>
      {handle ? (
        <>
          <div className={styles.handleRow}>
            <span className={styles.handle}>@{handle}</span>
            <Button variant="secondary" onClick={copy}>
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <p className={styles.hint}>Share it so friends can find you. Search matches a username exactly.</p>
        </>
      ) : (
        <p className={styles.hint}>You don&apos;t have a username yet, so friends can&apos;t find you. Pick one below.</p>
      )}

      {showNudge && (
        <div className={styles.prompt}>
          <p>We picked this username for you. Want to choose your own?</p>
          <div className={styles.actions}>
            <Button onClick={startEditing}>Change it</Button>
            <Button variant="secondary" onClick={keepHandle}>
              Keep it
            </Button>
          </div>
        </div>
      )}

      {!editing && (
        <>
          <Button variant="ghost" onClick={startEditing} disabled={canChangeAt !== null}>
            {handle ? "Change username" : "Choose a username"}
          </Button>
          {canChangeAt !== null && <p className={styles.hint}>{renameErrorCopy(409, "cooldown", canChangeAt)}</p>}
        </>
      )}

      {editing && (
        <form className={styles.form} onSubmit={submit}>
          <label className={styles.field}>
            New username
            <input
              value={draft}
              onChange={(e) => {
                setUsername.reset();
                setDraft(e.target.value);
              }}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              maxLength={21}
              autoFocus
            />
          </label>
          <p className={styles.hint}>
            3-20 lowercase letters, numbers, underscores or dots. You can change it once every 30 days, and the one you
            give up is held for 30 days.
          </p>
          {formatProblem && <p className={styles.error}>{formatProblem}</p>}
          {mutationError && <p className={styles.error}>{mutationError}</p>}
          <div className={styles.actions}>
            <Button type="submit" disabled={setUsername.isPending || !normalized || formatProblem !== null || unchanged}>
              {setUsername.isPending ? "Saving…" : "Save"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
