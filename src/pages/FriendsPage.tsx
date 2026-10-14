import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  useAcceptFriendRequest,
  useDeclineFriendRequest,
  useFriendSearch,
  useFriends,
  usePendingFriendRequests,
  useRequestFriendship,
} from "../hooks/useFriends";
import { Spinner } from "../components/common/Spinner";
import { ErrorBanner } from "../components/common/ErrorBanner";
import { errorMessage } from "../lib/errors";
import { Button } from "../components/common/Button";
import { UsernameCard } from "../components/friends/UsernameCard";
import { ApiError } from "../api/httpClient";
import {
  actionForRelationship,
  FRIEND_ACTION_LABEL,
  friendErrorCopy,
  normalizeUsername,
  usernameFormatProblem,
} from "../domain/username";
import type { UserSearchResultResponse } from "../types/api";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import styles from "./FriendsPage.module.css";

/** Long enough to swallow a burst of typing, short enough that results still feel like they answer the current input. */
const SEARCH_DEBOUNCE_MS = 250;

export function FriendsPage() {
  const navigate = useNavigate();
  const friends = useFriends();
  const requests = usePendingFriendRequests();
  // The input stays on `query` (instant), the request keys off the debounced,
  // normalized copy — without this every keystroke is its own query key and
  // its own request.
  const [query, setQuery] = useState("");
  const searchedUsername = normalizeUsername(useDebouncedValue(query, SEARCH_DEBOUNCE_MS));
  const search = useFriendSearch(searchedUsername);
  const formatProblem = query.trim() ? usernameFormatProblem(normalizeUsername(query)) : null;

  const requestFriendship = useRequestFriendship();
  // Which search hit's Add button is mid-request. `requestFriendship.isPending`
  // alone is one flag for the whole mutation, so using it directly greys out
  // every Add button in the results, not the one that was pressed.
  const [addingUserId, setAddingUserId] = useState<string | null>(null);
  const acceptRequest = useAcceptFriendRequest();
  const declineRequest = useDeclineFriendRequest();

  function onHitAction(hit: UserSearchResultResponse) {
    switch (actionForRelationship(hit.relationship)) {
      case "add":
        setAddingUserId(hit.userId);
        requestFriendship.mutate(hit.userId, { onSettled: () => setAddingUserId(null) });
        break;
      case "accept":
        setAddingUserId(hit.userId);
        acceptRequest.mutate(hit.userId, { onSettled: () => setAddingUserId(null) });
        break;
      case "view":
        navigate(`/friends/${hit.userId}`);
        break;
      case "pending":
        break;
    }
  }

  const hitMutationError = requestFriendship.error ?? acceptRequest.error;

  return (
    <div className={styles.wrap}>
      <UsernameCard showPrompt />

      <section>
        <h1>Friends</h1>
        <input
          className={styles.search}
          placeholder="Find a friend by exact username, e.g. @sara_k"
          aria-label="Find a friend by username"
          value={query}
          onChange={(e) => {
            requestFriendship.reset();
            setQuery(e.target.value);
          }}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />
        {formatProblem && <p className={styles.empty}>{formatProblem}</p>}
        {search.isError && (
          <ErrorBanner message={friendErrorCopy(search.error instanceof ApiError ? search.error.status : null)} />
        )}
        {hitMutationError && (
          <ErrorBanner message={friendErrorCopy(hitMutationError instanceof ApiError ? hitMutationError.status : null)} />
        )}
        {search.data && search.data.length === 0 && !formatProblem && searchedUsername === normalizeUsername(query) && (
          <p className={styles.empty}>No one found with that exact username.</p>
        )}
        {search.data && search.data.length > 0 && !formatProblem && (
          <ul className={styles.list}>
            {search.data.map((hit) => {
              const action = actionForRelationship(hit.relationship);
              return (
                <li key={hit.userId} className={styles.row}>
                  <span>
                    {hit.displayName} <span className={styles.handle}>@{hit.username}</span>
                  </span>
                  <Button
                    variant={action === "accept" ? "primary" : "secondary"}
                    onClick={() => onHitAction(hit)}
                    disabled={action === "pending" || addingUserId === hit.userId}
                  >
                    {FRIEND_ACTION_LABEL[action]}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2>Pending requests</h2>
        {requests.isLoading && <Spinner label="Loading requests…" />}
        {requests.isError && <ErrorBanner message={errorMessage(requests.error)} />}
        {requests.data && requests.data.length === 0 && <p className={styles.empty}>No pending requests.</p>}
        <ul className={styles.list}>
          {requests.data?.map((req) => (
            <li key={req.userId} className={styles.row}>
              <span>{req.displayName ?? "Unnamed learner"}</span>
              <div className={styles.actions}>
                <Button onClick={() => acceptRequest.mutate(req.userId)} disabled={acceptRequest.isPending}>
                  Accept
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => declineRequest.mutate(req.userId)}
                  disabled={declineRequest.isPending}
                >
                  Decline
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Your friends</h2>
        {friends.isLoading && <Spinner label="Loading friends…" />}
        {friends.isError && <ErrorBanner message={errorMessage(friends.error)} />}
        {friends.data && friends.data.length === 0 && <p className={styles.empty}>No friends yet — search for a username above.</p>}
        <ul className={styles.list}>
          {friends.data?.map((friend) => (
            <li key={friend.userId} className={styles.row}>
              <span>
                {friend.displayName ?? "Unnamed learner"}
                {friend.username && <span className={styles.handle}> @{friend.username}</span>}
              </span>
              <Link className={styles.viewLink} to={`/friends/${friend.userId}`}>
                View
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
