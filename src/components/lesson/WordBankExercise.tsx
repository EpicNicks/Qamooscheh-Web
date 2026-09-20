import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "../common/Button";
import { DirectionalText } from "../common/DirectionalText";
import { ExercisePrompt } from "./ExercisePrompt";
import { AnnotatedText } from "./AnnotatedText";
import { EMPTY_HINT_MAP, PLAIN_TEXT, type TextDisplaySettings, type WordHint } from "../../domain/romanization";
import { detectScriptDirection } from "../../domain/language";
import type { ExerciseProps } from "./ExerciseRenderer";
import styles from "./Exercise.module.css";

type ContainerId = "bank" | "answer";

function shuffleIndices(length: number): number[] {
  const order = Array.from({ length }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

// dnd-kit ids must be strings, and tile indices are the only thing that
// uniquely identifies a tile (tile TEXT can repeat, e.g. two identical
// distractor words in the same bank).
function tileId(tileIndex: number): string {
  return `tile-${tileIndex}`;
}

function tileIndexFromId(id: string | number): number {
  return Number(String(id).slice("tile-".length));
}

// Plain `closestCenter` ranks the two ROW containers (full-width, and
// multi-line once the bank wraps) alongside every individual tile, and a
// row's own geometric center is very often closer to the pointer than any
// tile's — including while aiming at the middle of a row to drop BETWEEN
// two tiles — so it would constantly win over the tile actually under the
// pointer and force every drop to the row's end. Preferring an
// under-the-pointer TILE collision, and only falling back to the row
// (`closestCenter`, so an empty/underfull row can still be targeted) when
// the pointer isn't over any tile, keeps drops landing where the pointer
// actually is.
const collisionDetection: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args).filter((collision) => collision.id !== "bank" && collision.id !== "answer");
  return pointerCollisions.length > 0 ? pointerCollisions : closestCenter(args);
};

// Reinserts a tile dropped back into the bank via TAP (not drag) at the
// position it would have occupied in the original shuffle, so a tapped
// tile reappears where the learner last saw it rather than jumping to
// whatever end a drag-drop would use. A drag-drop back into the bank is a
// deliberate placement decision instead, so `handleDragEnd` below inserts
// at the drop position, not the original one.
function reinsertAtOriginalPosition(order: number[], tileIndex: number, originalOrder: number[]): number[] {
  const originalPos = originalOrder.indexOf(tileIndex);
  const insertBeforeId = order.find((i) => originalOrder.indexOf(i) > originalPos);
  const insertAt = insertBeforeId === undefined ? order.length : order.indexOf(insertBeforeId);
  const next = order.slice();
  next.splice(insertAt, 0, tileIndex);
  return next;
}

interface SortableTileProps {
  tileIndex: number;
  container: ContainerId;
  text: string;
  disabled?: boolean;
  courseCode: string | null;
  hintMap: ReadonlyMap<string, WordHint>;
  textSettings: TextDisplaySettings;
  onActivate: () => void;
}

function SortableTile({ tileIndex, container, text, disabled, courseCode, hintMap, textSettings, onActivate }: SortableTileProps) {
  // PointerSensor's activationConstraint (see the DndContext below) is what
  // makes this a press-and-hold drag: a quick tap releases before the delay
  // elapses, no drag ever starts, and the button's own onClick fires
  // normally — so tapping still toggles a tile exactly as before, and
  // holding it instead picks it up.
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: tileId(tileIndex),
    disabled,
    data: { container },
  });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : undefined,
  };
  return (
    <DirectionalText courseCode={courseCode}>
      <button
        ref={setNodeRef}
        style={style}
        type="button"
        className={styles.tile}
        onClick={onActivate}
        disabled={disabled}
        {...attributes}
        {...listeners}
      >
        {/* focusable={false}: the tile's own <button> is already the tab
            stop, and a focusable span inside it would be both invalid
            HTML and a second stop per tile. */}
        <AnnotatedText text={text} hintMap={hintMap} settings={textSettings} focusable={false} />
      </button>
    </DirectionalText>
  );
}

interface DroppableRowProps {
  id: ContainerId;
  className: string;
  dir?: "ltr";
  children: React.ReactNode;
}

function DroppableRow({ id, className, dir, children }: DroppableRowProps) {
  // A container needs to be its own droppable target (not just host to
  // sortable items) so dropping into an EMPTY bank/answer row — or past the
  // last tile in a non-empty one — still resolves to that container in
  // handleDragEnd; SortableContext alone only reports hits on existing items.
  const { setNodeRef } = useDroppable({ id, data: { container: id } });
  return (
    <div ref={setNodeRef} className={className} dir={dir}>
      {children}
    </div>
  );
}

/** Tap tiles in order to build the answer, or press-and-hold to drag them — within a row to reorder, or across rows to move them in/out of the bank. */
export function WordBankExercise({
  exercise,
  onSubmit,
  disabled,
  courseCode,
  autoplayAudio,
  hintMap = EMPTY_HINT_MAP,
  textSettings = PLAIN_TEXT,
  advance,
}: ExerciseProps) {
  const tiles = exercise.tiles ?? [];
  // Shuffled once per exercise (this component is remounted per exercise via
  // ExerciseRenderer's `key`, so this only ever runs once per question) so
  // the bank's on-screen order never leaks the answer via tile position.
  const originalBankOrder = useMemo(() => shuffleIndices(tiles.length), [exercise]);
  // A single object updated atomically (one setState per drag event) rather
  // than two separate `bank`/`answer` state variables — a cross-container
  // move removes from one array and inserts into the other, and splitting
  // that across two setState calls would let either array be read (e.g. by
  // a render effect) in a transient state that's missing or duplicating the
  // dragged tile.
  const [order, setOrder] = useState<Record<ContainerId, number[]>>({ bank: originalBankOrder, answer: [] });
  const bankOrder = order.bank;
  const answerOrder = order.answer;

  // PointerSensor only: dnd-kit's KeyboardSensor binds its drag-pickup
  // shortcut to Space/Enter on the focused draggable node, which would
  // hijack those keys from the tile <button>'s own native
  // click-on-Enter/Space toggle (and race the window-level Enter-to-submit
  // handler below mid-drag). Keyboard users still get the tap-to-toggle
  // path via the button's normal focus/Enter/Space activation; they just
  // can't drag-reorder with the keyboard.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { delay: 200, tolerance: 5 } }));

  // Each tile is individually RTL-wrapped via DirectionalText, but that only
  // fixes glyph shaping within a tile — the answer row's own layout is
  // handled separately (see .answerRowRtl below) so a Persian answer reads
  // right-to-left (first-tapped tile rightmost, each new tile added to its
  // left) even though the submitted string (built from tap order) is a
  // plain left-to-right array. In "romanized" display every tile's BASE text
  // is Latin regardless of its source script, so there is no RTL layout to
  // apply at all.
  const isNativeScript = textSettings.display !== "romanized" && tiles.some((tile) => detectScriptDirection(tile) === "rtl");
  // DirectionalText decides dir/font from courseCode alone, so a romanized
  // tile (Latin letters) would otherwise get Persian's RTL/font treatment
  // too — passing null for it here is the same as "not Persian" to that
  // component, leaving romanized tiles plain LTR text.
  const tileCourseCode = isNativeScript ? (courseCode ?? null) : null;

  function toggle(tileIndex: number) {
    if (answerOrder.includes(tileIndex)) {
      setOrder((prev) => ({
        bank: reinsertAtOriginalPosition(prev.bank, tileIndex, originalBankOrder),
        answer: prev.answer.filter((i) => i !== tileIndex),
      }));
    } else {
      setOrder((prev) => ({
        bank: prev.bank.filter((i) => i !== tileIndex),
        answer: [...prev.answer, tileIndex],
      }));
    }
  }

  function resolveContainer(id: string, dataContainer: unknown): ContainerId | undefined {
    if (id === "bank" || id === "answer") return id;
    return dataContainer === "bank" || dataContainer === "answer" ? dataContainer : undefined;
  }

  // Moves the dragged tile across containers live, as the pointer crosses
  // into the other row — this is what lets `handleDragEnd` below treat
  // "drop over a specific tile" as a plain same-container reorder (the tile
  // has already landed in that container by drag end), instead of having to
  // hand-derive an insert-before-vs-after position from scratch.
  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    const activeContainer = resolveContainer(activeId, active.data.current?.container);
    const overContainer = resolveContainer(overId, over.data.current?.container);
    if (!activeContainer || !overContainer || activeContainer === overContainer) return;
    const activeIndex = tileIndexFromId(activeId);

    setOrder((prev) => {
      const activeItems = prev[activeContainer];
      const overItems = prev[overContainer];
      if (!activeItems.includes(activeIndex)) return prev;
      const overIsContainer = overId === overContainer;
      let newIndex: number;
      if (overIsContainer) {
        newIndex = overItems.length;
      } else {
        const overIndex = overItems.indexOf(tileIndexFromId(overId));
        const activeRect = active.rect.current.translated;
        const isAfterOverItem = !!activeRect && activeRect.top > over.rect.top + over.rect.height / 2;
        newIndex = overIndex >= 0 ? overIndex + (isAfterOverItem ? 1 : 0) : overItems.length;
      }
      const nextOverItems = overItems.slice();
      nextOverItems.splice(newIndex, 0, activeIndex);
      return { ...prev, [activeContainer]: activeItems.filter((i) => i !== activeIndex), [overContainer]: nextOverItems };
    });
  }

  // By the time a drag ends, any cross-container move already happened in
  // handleDragOver above — this only ever finalizes ordering WITHIN a
  // single container (the row `over` settled on).
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    const activeContainer = resolveContainer(activeId, active.data.current?.container);
    const overContainer = resolveContainer(overId, over.data.current?.container);
    if (!activeContainer || !overContainer || activeContainer !== overContainer) return;
    const activeIndex = tileIndexFromId(activeId);

    setOrder((prev) => {
      const items = prev[activeContainer];
      const oldIndex = items.indexOf(activeIndex);
      const newIndex = overId === activeContainer ? items.length - 1 : items.indexOf(tileIndexFromId(overId));
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return prev;
      return { ...prev, [activeContainer]: arrayMove(items, oldIndex, newIndex) };
    });
  }

  function submit() {
    onSubmit(answerOrder.map((i) => tiles[i]).join(" "));
    setOrder((prev) => ({ ...prev, answer: [] }));
  }

  // Enter submits, the same as TypeInExercise's own window-level handling —
  // tapping tiles never focuses a text input, so there's nothing for a
  // native "Enter activates the focused control" behavior to land on
  // otherwise. Skipped while `advance` is set: at that point the exercise
  // is the disabled post-answer review, and useAnswerConfirmation's own
  // page-level Enter handling (wired to the Continue button) already owns
  // the key then.
  useEffect(() => {
    if (disabled || advance) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Enter") {
        event.preventDefault();
        if (answerOrder.length > 0) submit();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  return (
    <DndContext sensors={sensors} collisionDetection={collisionDetection} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
      <div className={styles.wrap}>
        <ExercisePrompt text={exercise.prompt} courseCode={courseCode} autoplayAudio={autoplayAudio} hintMap={hintMap} textSettings={textSettings} />
        <DroppableRow id="answer" className={isNativeScript ? `${styles.answerRow} ${styles.answerRowRtl}` : styles.answerRow} dir="ltr">
          <SortableContext items={answerOrder.map(tileId)} strategy={rectSortingStrategy}>
            {answerOrder.map((tileIndex) => (
              <SortableTile
                key={tileIndex}
                tileIndex={tileIndex}
                container="answer"
                text={tiles[tileIndex]}
                disabled={disabled}
                courseCode={tileCourseCode}
                hintMap={hintMap}
                textSettings={textSettings}
                onActivate={() => toggle(tileIndex)}
              />
            ))}
          </SortableContext>
        </DroppableRow>
        {/* Unlike .answerRow above, the unpicked bank deliberately stays LTR
            regardless of language — these boxes are read by position while
            scanning for the next tile to tap, not in sentence order, so
            pinning them to a consistent left-to-right layout (the same
            "reduce eye travel" reasoning as StoryTranscript's left-aligned
            lines) matters more here than mirroring the language's direction.
            Only a tile's own text (via DirectionalText) still shapes/reads
            right-to-left for Persian. */}
        <DroppableRow id="bank" className={styles.tiles} dir="ltr">
          <SortableContext items={bankOrder.map(tileId)} strategy={rectSortingStrategy}>
            {bankOrder.map((tileIndex) => (
              <SortableTile
                key={tileIndex}
                tileIndex={tileIndex}
                container="bank"
                text={tiles[tileIndex]}
                disabled={disabled}
                courseCode={tileCourseCode}
                hintMap={hintMap}
                textSettings={textSettings}
                onActivate={() => toggle(tileIndex)}
              />
            ))}
          </SortableContext>
        </DroppableRow>
        {advance ? (
          <Button onClick={advance.onAdvance}>{advance.label}</Button>
        ) : (
          <Button onClick={submit} disabled={disabled || answerOrder.length === 0}>
            Submit
          </Button>
        )}
      </div>
    </DndContext>
  );
}
