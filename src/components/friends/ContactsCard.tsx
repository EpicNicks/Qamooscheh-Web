import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError } from "../../api/httpClient";
import { useContactsFindable, useMatchContacts, useSetContactsFindable } from "../../hooks/useContacts";
import { useAcceptFriendRequest, useRequestFriendship } from "../../hooks/useFriends";
import { actionForRelationship, FRIEND_ACTION_LABEL } from "../../domain/username";
import { contactPickerSupported, contactsErrorCopy, parseEmails, pickContactEmails } from "../../domain/contacts";
import { Button } from "../common/Button";
import { ErrorBanner } from "../common/ErrorBanner";
import { errorMessage } from "../../lib/errors";
import type { FriendRelationship } from "../../types/api";
import styles from "./ContactsCard.module.css";

function matchErrorCopy(error: unknown): string {
  if (!(error instanceof ApiError)) return contactsErrorCopy(null);
  return contactsErrorCopy(error.status, (error.body as { retryAt?: string } | null)?.retryAt);
}

/**
 * Find friends by email (POST /v1/contacts/match) and the opt-in to be found
 * that way (GET/PUT /v1/contacts/findable). A browser can't read an address
 * book, so the learner pastes addresses; only their SHA-256 hashes are sent.
 */
export function ContactsCard() {
  const navigate = useNavigate();
  const findable = useContactsFindable();
  const setFindable = useSetContactsFindable();
  const match = useMatchContacts();
  const requestFriendship = useRequestFriendship();
  const acceptRequest = useAcceptFriendRequest();
  const [text, setText] = useState("");
  // The result list is a snapshot; this tracks the change a button press made.
  const [updated, setUpdated] = useState<Record<string, FriendRelationship>>({});
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  const emails = parseEmails(text);
  const canPick = contactPickerSupported();

  async function pickFromContacts() {
    try {
      const picked = await pickContactEmails();
      if (picked.length > 0) setText((prev) => [prev.trim(), ...picked].filter(Boolean).join("\n"));
    } catch {
      // Dismissed, or permission denied: nothing to add, and pasting still works.
    }
  }

  function search(e: React.FormEvent) {
    e.preventDefault();
    if (emails.length === 0) return;
    setUpdated({});
    match.mutate(emails);
  }

  function act(userId: string, relationship: FriendRelationship) {
    const action = actionForRelationship(relationship);
    if (action === "view") {
      navigate(`/friends/${userId}`);
      return;
    }
    if (action === "pending") return;
    setBusyUserId(userId);
    const onSettled = () => setBusyUserId(null);
    if (action === "add") {
      requestFriendship.mutate(userId, {
        onSuccess: (next) => setUpdated((prev) => ({ ...prev, [userId]: next.relationship })),
        onSettled,
      });
    } else {
      acceptRequest.mutate(userId, {
        onSuccess: () => setUpdated((prev) => ({ ...prev, [userId]: "friends" })),
        onSettled,
      });
    }
  }

  const actionError = requestFriendship.error ?? acceptRequest.error;

  return (
    <section className={styles.card} aria-label="Find friends by email">
      <h2 className={styles.title}>Find friends by email</h2>

      {findable.data && (
        <div className={styles.optIn}>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={findable.data.findable}
              disabled={setFindable.isPending}
              onChange={(e) => setFindable.mutate(e.target.checked)}
            />
            Let people who have my email find me
          </label>
          <p className={styles.hint}>
            Off by default. They see only your display name, and you aren&apos;t notified when someone looks.
          </p>
          {!findable.data.canBeFound && (
            <p className={styles.hint}>
              This works for accounts signed up with an email and password. Your account doesn&apos;t have one, so
              nobody can find you this way.
            </p>
          )}
          {setFindable.isError && <ErrorBanner message={errorMessage(setFindable.error)} />}
        </div>
      )}
      {findable.isError && <ErrorBanner message={errorMessage(findable.error)} />}

      <form className={styles.form} onSubmit={search}>
        <label className={styles.field}>
          Paste email addresses
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            placeholder="sara@example.com, one per line or comma separated"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
        </label>
        <p className={styles.hint}>
          Your addresses are scrambled on this device before they&apos;re sent, and the server doesn&apos;t keep them.
          Only people who turned on &ldquo;find me by email&rdquo; can show up.
        </p>
        <div className={styles.actions}>
          {canPick && (
            <Button type="button" variant="secondary" onClick={pickFromContacts}>
              Choose from contacts
            </Button>
          )}
          <Button type="submit" disabled={match.isPending || emails.length === 0}>
            {match.isPending ? "Checking…" : `Find friends (${emails.length})`}
          </Button>
        </div>
      </form>

      {match.isError && <ErrorBanner message={matchErrorCopy(match.error)} />}
      {actionError && <ErrorBanner message={errorMessage(actionError)} />}
      {match.data && match.data.length === 0 && (
        <p className={styles.hint}>No one found. They may not have an account or may not have turned this on.</p>
      )}
      {match.data && match.data.length > 0 && (
        <ul className={styles.list}>
          {match.data.map((hit) => {
            const relationship = updated[hit.userId] ?? hit.relationship;
            const action = actionForRelationship(relationship);
            return (
              <li key={hit.userId} className={styles.row}>
                <span>{hit.displayName}</span>
                <Button
                  variant={action === "accept" ? "primary" : "secondary"}
                  onClick={() => act(hit.userId, relationship)}
                  disabled={action === "pending" || busyUserId === hit.userId}
                >
                  {FRIEND_ACTION_LABEL[action]}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
