import { useState } from "react";
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
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import styles from "./FriendsPage.module.css";

/** Long enough to swallow a burst of typing, short enough that results still feel like they answer the current input. */
const SEARCH_DEBOUNCE_MS = 250;

export function FriendsPage() {
  const friends = useFriends();
  const requests = usePendingFriendRequests();
  // The input stays on `query` (instant), the request keys off the debounced
  // copy — without this every keystroke is its own query key and its own
  // request.
  const [query, setQuery] = useState("");
  const search = useFriendSearch(useDebouncedValue(query, SEARCH_DEBOUNCE_MS));

  const requestFriendship = useRequestFriendship();
  // Which search hit's Add button is mid-request. `requestFriendship.isPending`
  // alone is one flag for the whole mutation, so using it directly greys out
  // every Add button in the results, not the one that was pressed.
  const [addingUserId, setAddingUserId] = useState<string | null>(null);
  const acceptRequest = useAcceptFriendRequest();
  const declineRequest = useDeclineFriendRequest();

  return (
    <div className={styles.wrap}>
      <section>
        <h1>Friends</h1>
        <input
          className={styles.search}
          placeholder="Search by display name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {search.data && search.data.length > 0 && (
          <ul className={styles.list}>
            {search.data.map((hit) => (
              <li key={hit.userId} className={styles.row}>
                <span>{hit.displayName}</span>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setAddingUserId(hit.userId);
                    requestFriendship.mutate(hit.userId, { onSettled: () => setAddingUserId(null) });
                  }}
                  disabled={addingUserId === hit.userId}
                >
                  Add
                </Button>
              </li>
            ))}
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
        {friends.data && friends.data.length === 0 && <p className={styles.empty}>No friends yet — search above.</p>}
        <ul className={styles.list}>
          {friends.data?.map((friend) => (
            <li key={friend.userId} className={styles.row}>
              <span>{friend.displayName ?? "Unnamed learner"}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
