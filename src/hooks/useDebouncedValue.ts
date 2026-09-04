import { useEffect, useState } from "react";

/**
 * Trails `value` by `delayMs`, resetting the timer on every change — so a
 * fast-changing input (a search box being typed into) settles to one value
 * instead of producing one of every intermediate state.
 *
 * Used to keep a react-query key off the keystroke path: the input itself
 * stays controlled by its own instant state, and only the debounced value is
 * handed to the query, so typing stays responsive while the network doesn't
 * see a request per character.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
