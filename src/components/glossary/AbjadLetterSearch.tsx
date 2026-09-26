import { useRef, useState, type KeyboardEvent, type PointerEvent, type RefObject } from "react";
import { parseLetterSearch, type LetterSearchToken } from "../../domain/persian/abjadSearch";
import { DirectionalText } from "../common/DirectionalText";
import { CloseIcon } from "../common/icons";
import styles from "./AbjadLetterSearch.module.css";

interface AbjadLetterSearchProps {
  tokens: LetterSearchToken[];
  onTokensChange: (tokens: LetterSearchToken[]) => void;
  courseCode: string | null | undefined;
}

/** How far a pointer has to move before a press on a chip counts as a drag rather than a click. */
const DRAG_THRESHOLD_PX = 4;

interface ChipProps {
  token: LetterSearchToken;
  boxRef: RefObject<HTMLDivElement | null>;
  courseCode: string | null | undefined;
  onRemove: (via: "pointer" | "keyboard") => void;
}

/**
 * One search token. Removable three ways: its × button, Delete/Backspace
 * while that button has focus, or dragging it out of the search box and
 * letting go. The drag is plain pointer events with capture (so it keeps
 * tracking once the pointer leaves the chip, on touch as well as mouse) and
 * a transform while it moves — it never reorders anything, so there's
 * nothing here for dnd-kit's sorting machinery to do.
 */
function Chip({ token, boxRef, courseCode, onRemove }: ChipProps) {
  // The gesture's own bookkeeping lives in a ref, not state: a release can
  // arrive before the render for the last move has committed, so the
  // pointerup handler must not depend on `drag` being current. `drag` only
  // drives what the chip looks like mid-gesture.
  const gesture = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const [drag, setDrag] = useState<{ dx: number; dy: number; outside: boolean } | null>(null);

  function isOutsideBox(event: PointerEvent) {
    const box = boxRef.current?.getBoundingClientRect();
    return !box || event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom;
  }

  function onPointerDown(event: PointerEvent<HTMLSpanElement>) {
    if (event.button !== 0 || (event.target as HTMLElement).closest("button")) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    gesture.current = { x: event.clientX, y: event.clientY, moved: false };
  }

  function onPointerMove(event: PointerEvent<HTMLSpanElement>) {
    const g = gesture.current;
    if (!g) return;
    const dx = event.clientX - g.x;
    const dy = event.clientY - g.y;
    if (!g.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
    g.moved = true;
    setDrag({ dx, dy, outside: isOutsideBox(event) });
  }

  function endDrag() {
    gesture.current = null;
    setDrag(null);
  }

  function onPointerUp(event: PointerEvent<HTMLSpanElement>) {
    if (gesture.current?.moved && isOutsideBox(event)) onRemove("pointer");
    endDrag();
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "Delete" && event.key !== "Backspace") return;
    event.preventDefault();
    onRemove("keyboard");
  }

  const matches = token.letters.join(" ");

  return (
    <span
      className={styles.chip}
      data-kind={token.kind}
      data-dragging={!!drag}
      data-outside={drag?.outside ?? false}
      style={drag ? { transform: `translate(${drag.dx}px, ${drag.dy}px)` } : undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={endDrag}
    >
      {token.kind === "persian" ? (
        <DirectionalText courseCode={courseCode} className={styles.chipLetter}>
          {token.label}
        </DirectionalText>
      ) : (
        <>
          <span className={styles.chipLatin}>{token.label}</span>
          <DirectionalText courseCode={courseCode} className={styles.chipMatches}>
            {matches}
          </DirectionalText>
        </>
      )}
      <button
        type="button"
        className={styles.remove}
        aria-label={`Remove ${token.label}${token.kind === "latin" ? ` (${matches})` : ""}`}
        onClick={() => onRemove("keyboard")}
        onKeyDown={onKeyDown}
      >
        <CloseIcon />
      </button>
    </span>
  );
}

/**
 * The abjad page's letter filter: a text box that turns every valid
 * character typed into a chip (domain/persian/abjadSearch.ts decides what's
 * valid and what each character selects) and silently drops the rest.
 * Only an unfinished "c" (waiting to become "ch") ever stays in the input
 * itself as text.
 */
export function AbjadLetterSearch({ tokens, onTokensChange, courseCode }: AbjadLetterSearchProps) {
  const [pending, setPending] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function onChange(text: string) {
    const parsed = parseLetterSearch(text, tokens);
    setPending(parsed.pending);
    if (parsed.tokens !== tokens) onTokensChange(parsed.tokens);
  }

  function remove(key: string, via: "pointer" | "keyboard") {
    onTokensChange(tokens.filter((t) => t.key !== key));
    // A keyboard removal takes its focused × button with it; land on the
    // input rather than letting focus fall back to <body>. A drag leaves
    // focus alone — it never moved it in the first place.
    if (via === "keyboard") inputRef.current?.focus();
  }

  function onInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && pending === "" && tokens.length > 0) {
      event.preventDefault();
      onTokensChange(tokens.slice(0, -1));
    }
  }

  function clear() {
    setPending("");
    onTokensChange([]);
    inputRef.current?.focus();
  }

  const hasFilter = tokens.length > 0 || pending !== "";

  return (
    <div className={styles.row}>
      {/* A click anywhere in the box that isn't a chip's button focuses the
          input, so the whole box behaves like one text field. */}
      <div ref={boxRef} className={styles.box} onClick={(event) => event.target === event.currentTarget && inputRef.current?.focus()}>
        {tokens.map((token) => (
          <Chip key={token.key} token={token} boxRef={boxRef} courseCode={courseCode} onRemove={(via) => remove(token.key, via)} />
        ))}
        <input
          ref={inputRef}
          className={styles.input}
          value={pending}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onInputKeyDown}
          placeholder={tokens.length === 0 ? "Search: type ث, s, sh…" : ""}
          aria-label="Search letters by Persian letter or Latin sound"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
        />
      </div>
      <button type="button" className={styles.clear} onClick={clear} disabled={!hasFilter}>
        Clear
      </button>
    </div>
  );
}
