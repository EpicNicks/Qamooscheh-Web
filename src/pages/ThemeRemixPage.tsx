import { useId, useMemo, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  closestCenter,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
  type Active,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type Over,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, useSortable, type SortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useBootstrap } from "../hooks/useBootstrap";
import { useAllThemeSkillArtifacts, useThemeIndex, refKey } from "../hooks/useCourseContent";
import { ancestorsOf, dfsAllThemes } from "../domain/themeTree";
import { buildRemixPool } from "../domain/deepDiveRemix";
import { Spinner } from "../components/common/Spinner";
import { ErrorBanner } from "../components/common/ErrorBanner";
import { Button } from "../components/common/Button";
import { errorMessage } from "../lib/errors";
import styles from "./ThemeRemixPage.module.css";

type ContainerId = "browse" | "selected";

const MAX_SUGGESTIONS = 8;

// dnd-kit ids share one namespace with the two container ids, so a theme
// literally named "browse" or "selected" mustn't collide with them.
function tileId(themeId: string): string {
  return `theme:${themeId}`;
}

function themeIdFromTileId(id: UniqueIdentifier): string {
  return String(id).slice("theme:".length);
}

function isContainerId(id: UniqueIdentifier): id is ContainerId {
  return id === "browse" || id === "selected";
}

// Same rationale as WordBankExercise's: prefer the tile actually under the
// pointer, then the pane the pointer is inside, and only then fall back to
// closestCenter — otherwise a pane's own (large) rect center out-ranks the
// tile being aimed at.
const collisionDetection: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);
  const itemCollisions = pointerCollisions.filter((collision) => !isContainerId(collision.id));
  if (itemCollisions.length > 0) return itemCollisions;
  if (pointerCollisions.length > 0) return pointerCollisions;
  return closestCenter(args);
};

// The selected pane is flex-wrap, so before/after the hovered tile is judged
// in reading order (same line → x, otherwise y) — lifted from WordBankExercise.
function isAfterOverItem(active: Active, over: Over): boolean {
  const activeRect = active.rect.current.translated;
  if (!activeRect) return false;
  const activeCenter = { x: activeRect.left + activeRect.width / 2, y: activeRect.top + activeRect.height / 2 };
  const overCenter = { x: over.rect.left + over.rect.width / 2, y: over.rect.top + over.rect.height / 2 };
  const sameRow = Math.abs(activeCenter.y - overCenter.y) < over.rect.height / 2;
  return sameRow ? activeCenter.x > overCenter.x : activeCenter.y > overCenter.y;
}

// The browse pane's order is the theme tree's own (derived, never
// user-reordered), so its tiles must NOT shuffle aside while something is
// dragged over them the way a sortable list normally would.
const fixedOrderStrategy: SortingStrategy = () => null;

interface SortableThemeTileProps {
  themeId: string;
  container: ContainerId;
  depth?: number;
  count: number;
  breadcrumb: string;
  onActivate: () => void;
}

function SortableThemeTile({ themeId, container, depth, count, breadcrumb, onActivate }: SortableThemeTileProps) {
  // Click-to-toggle doubles as the drag handle: the sensors' distance
  // thresholds (below) let a press that never moves far release as a plain
  // click — same arrangement as WordBankExercise's SortableTile.
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: tileId(themeId),
    data: { container },
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : undefined,
    "--depth": depth ?? 1,
  } as CSSProperties;
  const isSelected = container === "selected";
  return (
    <button
      ref={setNodeRef}
      style={style}
      type="button"
      className={isSelected ? `${styles.tile} ${styles.selectedTile}` : `${styles.tile} ${styles.browseTile}`}
      title={breadcrumb}
      onClick={onActivate}
      {...attributes}
      aria-label={isSelected ? `Remove ${breadcrumb}` : `Add ${breadcrumb}`}
      {...listeners}
    >
      <span className={styles.tileName}>{themeId}</span>
      <span className={styles.tileCount}>{count}</span>
      {isSelected && (
        <span className={styles.tileRemove} aria-hidden="true">
          ×
        </span>
      )}
    </button>
  );
}

function DroppablePane({ id, className, label, children }: { id: ContainerId; className: string; label: string; children: React.ReactNode }) {
  // Its own droppable (not just a host of sortables) so dropping into an
  // empty pane, or past its last tile, still resolves to the pane.
  const { setNodeRef, isOver } = useDroppable({ id, data: { container: id } });
  return (
    <div ref={setNodeRef} className={isOver ? `${className} ${styles.paneOver}` : className} aria-label={label} role="group">
      {children}
    </div>
  );
}

/**
 * Sidebar Deep Dives → Remix: pick any mix of tags (at any depth of the
 * theme tree) and practice a blend of their lessons, via the lesson-less
 * `/lesson/deep-dive-remix?themeIds=…` route in LessonPage.
 *
 * Two panes on the WordBankExercise dnd-kit pattern: the left "browse" pane
 * lists every not-yet-picked tag in tree (DFS pre-order) order, indented by
 * depth — flat as far as dnd-kit is concerned — and the right "selected"
 * pane holds the picks. Tiles move between panes by click OR drag. The
 * search box above both filters the browse pane and offers autocomplete
 * suggestions (with breadcrumbs, since a bare id can be ambiguous once
 * nested) that add a tag directly.
 */
export function ThemeRemixPage() {
  const navigate = useNavigate();
  const bootstrap = useBootstrap();
  const course = bootstrap.data?.course ?? null;
  const themeIndex = useThemeIndex(course);
  const { skills: skillArtifacts, isLoading: skillsLoading, isError: skillsError } = useAllThemeSkillArtifacts(
    course,
    themeIndex.data,
  );

  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const [activeThemeId, setActiveThemeId] = useState<string | null>(null);
  const listboxId = useId();

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { distance: 15 } }),
  );

  const entries = useMemo(() => dfsAllThemes(themeIndex.data?.themes ?? []), [themeIndex.data]);
  const breadcrumbs = useMemo(() => {
    const map = new Map<string, string>();
    for (const { theme } of entries) {
      map.set(
        theme.id,
        ancestorsOf(themeIndex.data, theme.id)
          .map((t) => t.id)
          .join(" › "),
      );
    }
    return map;
  }, [entries, themeIndex.data]);
  const standardCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const { theme } of entries) {
      map.set(
        theme.id,
        theme.lessons.filter((lesson) => skillArtifacts.get(refKey({ unitKey: null, skillKey: lesson.id }))?.category === "standard")
          .length,
      );
    }
    return map;
  }, [entries, skillArtifacts]);
  const poolSize = useMemo(
    () => buildRemixPool(themeIndex.data, skillArtifacts, { themeIds: selected }).length,
    [themeIndex.data, skillArtifacts, selected],
  );

  const normalizedQuery = query.trim().toLowerCase();
  const selectedSet = new Set(selected);
  const matchesQuery = (id: string) => normalizedQuery === "" || id.toLowerCase().includes(normalizedQuery);
  const browseEntries = entries.filter(({ theme }) => !selectedSet.has(theme.id) && matchesQuery(theme.id));
  const suggestions = normalizedQuery === "" ? [] : browseEntries.slice(0, MAX_SUGGESTIONS);
  const activeSuggestion = suggestions.length > 0 ? Math.min(highlight, suggestions.length - 1) : -1;

  if (bootstrap.isLoading || themeIndex.isLoading || skillsLoading) return <Spinner label="Loading themes…" />;
  if (bootstrap.isError) return <ErrorBanner message={errorMessage(bootstrap.error, "Couldn't load your course.")} />;
  if (themeIndex.isError) return <ErrorBanner message="Couldn't load themes from the CDN." />;
  if (entries.length === 0) return <p>No themed lessons yet for this course.</p>;

  function add(themeId: string) {
    setSelected((prev) => (prev.includes(themeId) ? prev : [...prev, themeId]));
  }

  function remove(themeId: string) {
    setSelected((prev) => prev.filter((id) => id !== themeId));
  }

  function pickSuggestion(themeId: string) {
    add(themeId);
    setQuery("");
    setHighlight(0);
  }

  function onSearchKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" && suggestions.length > 0) {
      event.preventDefault();
      setHighlight((activeSuggestion + 1) % suggestions.length);
    } else if (event.key === "ArrowUp" && suggestions.length > 0) {
      event.preventDefault();
      setHighlight((activeSuggestion - 1 + suggestions.length) % suggestions.length);
    } else if (event.key === "Enter" && activeSuggestion >= 0) {
      event.preventDefault();
      pickSuggestion(suggestions[activeSuggestion].theme.id);
    } else if (event.key === "Escape" && query !== "") {
      event.preventDefault();
      setQuery("");
      setHighlight(0);
    }
  }

  function containerOf(id: UniqueIdentifier): ContainerId {
    if (isContainerId(id)) return id;
    return selected.includes(themeIdFromTileId(id)) ? "selected" : "browse";
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveThemeId(themeIdFromTileId(event.active.id));
  }

  // Crossing panes moves the tag live (as WordBankExercise does), so the
  // drop itself only ever has to finalize ordering within "selected". The
  // browse pane's contents are derived (everything not selected, in tree
  // order), so moving INTO it is just removal from `selected`.
  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;
    const from = containerOf(active.id);
    const to = containerOf(over.id);
    if (from === to) return;
    const themeId = themeIdFromTileId(active.id);
    if (to === "browse") {
      remove(themeId);
      return;
    }
    setSelected((prev) => {
      if (prev.includes(themeId)) return prev;
      const overIndex = isContainerId(over.id) ? -1 : prev.indexOf(themeIdFromTileId(over.id));
      const insertAt = overIndex >= 0 ? overIndex + (isAfterOverItem(active, over) ? 1 : 0) : prev.length;
      const next = prev.slice();
      next.splice(insertAt, 0, themeId);
      return next;
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveThemeId(null);
    const { active, over } = event;
    if (!over || containerOf(active.id) !== "selected" || containerOf(over.id) !== "selected") return;
    const themeId = themeIdFromTileId(active.id);
    setSelected((prev) => {
      const oldIndex = prev.indexOf(themeId);
      const newIndex = isContainerId(over.id) ? prev.length - 1 : prev.indexOf(themeIdFromTileId(over.id));
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  }

  function remix() {
    navigate(`/lesson/deep-dive-remix?themeIds=${selected.map(encodeURIComponent).join(",")}`);
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Remix topics</h1>
        <Button variant="secondary" onClick={() => navigate("/themes")}>
          Back to Deep Dives
        </Button>
      </div>
      <p className={styles.intro}>
        Pick one or more topics — click or drag them across — then practice a blend of their lessons.
      </p>

      {skillsError && <ErrorBanner message="Some lessons couldn't be loaded." />}

      <div className={styles.search}>
        <input
          type="search"
          className={styles.searchInput}
          placeholder="Search topics…"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setHighlight(0);
          }}
          onKeyDown={onSearchKeyDown}
          role="combobox"
          aria-label="Search topics"
          aria-autocomplete="list"
          aria-expanded={suggestions.length > 0}
          aria-controls={listboxId}
          aria-activedescendant={activeSuggestion >= 0 ? `${listboxId}-${activeSuggestion}` : undefined}
        />
        {suggestions.length > 0 && (
          <ul id={listboxId} role="listbox" className={styles.suggestions}>
            {suggestions.map(({ theme }, index) => (
              <li
                key={theme.id}
                id={`${listboxId}-${index}`}
                role="option"
                aria-selected={index === activeSuggestion}
                className={index === activeSuggestion ? `${styles.suggestion} ${styles.suggestionActive}` : styles.suggestion}
                // mousedown, not click: keeps focus in the input (no blur flicker) while picking.
                onMouseDown={(event) => {
                  event.preventDefault();
                  pickSuggestion(theme.id);
                }}
                onMouseEnter={() => setHighlight(index)}
              >
                <span className={styles.suggestionName}>{theme.id}</span>
                <span className={styles.suggestionTrail}>{breadcrumbs.get(theme.id)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveThemeId(null)}
      >
        <div className={styles.panes}>
          <section className={styles.column}>
            <h2 className={styles.paneTitle}>All topics</h2>
            <DroppablePane id="browse" className={`${styles.pane} ${styles.browsePane}`} label="All topics">
              <SortableContext items={browseEntries.map(({ theme }) => tileId(theme.id))} strategy={fixedOrderStrategy}>
                {browseEntries.map(({ theme, depth }) => (
                  <SortableThemeTile
                    key={theme.id}
                    themeId={theme.id}
                    container="browse"
                    depth={depth}
                    count={standardCounts.get(theme.id) ?? 0}
                    breadcrumb={breadcrumbs.get(theme.id) ?? theme.id}
                    onActivate={() => add(theme.id)}
                  />
                ))}
              </SortableContext>
              {browseEntries.length === 0 && (
                <p className={styles.empty}>{normalizedQuery ? "No topics match your search." : "Every topic is picked."}</p>
              )}
            </DroppablePane>
          </section>

          <section className={styles.column}>
            <h2 className={styles.paneTitle}>Your mix</h2>
            <DroppablePane id="selected" className={`${styles.pane} ${styles.selectedPane}`} label="Your mix">
              <SortableContext items={selected.map(tileId)} strategy={rectSortingStrategy}>
                {selected.map((themeId) => (
                  <SortableThemeTile
                    key={themeId}
                    themeId={themeId}
                    container="selected"
                    count={standardCounts.get(themeId) ?? 0}
                    breadcrumb={breadcrumbs.get(themeId) ?? themeId}
                    onActivate={() => remove(themeId)}
                  />
                ))}
              </SortableContext>
              {selected.length === 0 && <p className={styles.empty}>Nothing picked yet — click or drag topics here.</p>}
            </DroppablePane>
            <div className={styles.actions}>
              <span className={styles.poolSize}>
                {selected.length === 0 ? "" : `${poolSize} ${poolSize === 1 ? "lesson" : "lessons"} in the mix`}
              </span>
              {selected.length > 0 && (
                <Button variant="secondary" onClick={() => setSelected([])}>
                  Clear
                </Button>
              )}
              <Button variant="deepDive" onClick={remix} disabled={selected.length === 0}>
                Remix
              </Button>
            </div>
          </section>
        </div>

        <DragOverlay>
          {activeThemeId !== null ? (
            <div className={`${styles.tile} ${styles.overlayTile}`}>
              <span className={styles.tileName}>{activeThemeId}</span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
