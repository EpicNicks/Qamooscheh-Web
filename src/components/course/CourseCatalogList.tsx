import { useEffect, useId, useRef, useState } from "react";
import { useCourseCatalog } from "../../hooks/useCourseCatalog";
import { useListNavigation } from "../../hooks/useListNavigation";
import { getLanguageInfo } from "../../domain/language";
import { Button } from "../common/Button";
import { DirectionalText } from "../common/DirectionalText";
import { ErrorBanner } from "../common/ErrorBanner";
import { Spinner } from "../common/Spinner";
import { errorMessage } from "../../lib/errors";
import badgeStyles from "../layout/LanguageBadge.module.css";
import styles from "./CourseCatalogList.module.css";

interface CourseCatalogListProps {
  /**
   * `single` — clicking or pressing Enter on a row confirms it immediately
   * (the switcher's "+" flow, where picking one language is the whole task).
   * `multi` — rows toggle and an explicit Continue confirms (onboarding,
   * where the learner is deciding, not answering).
   */
  mode: "single" | "multi";
  /**
   * Whether to show the highlighted row's culture fact. A PROP, not something
   * inferred from the mount point: "facts only while adding a language" is a
   * rule about where this list is rendered, so it's enforced by who passes it —
   * the catalog modal and onboarding do, the course switcher doesn't.
   */
  showFacts?: boolean;
  /** Rendered disabled rather than hidden — this stays a real catalog browser, not a list of what's left. */
  alreadyEnrolledCodes: string[];
  onConfirm: (courseCodes: string[]) => void;
  onCancel?: () => void;
  confirmLabel?: string;
  /** Disables the whole list while enrollment is in flight, so a second Enter can't fire a second enroll. */
  isSubmitting?: boolean;
  autoFocusSearch?: boolean;
}

function matchesQuery(nativeName: string, latinName: string, code: string, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (needle === "") return true;
  return (
    latinName.toLowerCase().includes(needle) ||
    code.toLowerCase().includes(needle) ||
    // Native names are matched un-lowercased as well: toLowerCase is a no-op
    // for Persian and Japanese script, but it costs nothing and keeps this
    // honest for a future course in a cased non-Latin script (Greek, Cyrillic).
    nativeName.toLowerCase().includes(needle) ||
    nativeName.includes(query.trim())
  );
}

/**
 * The keyboard-navigable course listbox, shared by the "+ add a language"
 * modal and onboarding's language step — one implementation because they are
 * the same interaction (browse a catalog, read a fact, pick), differing only
 * in how many you may pick and what chrome surrounds it.
 *
 * Focus stays in the search input the whole time (typing is the point), so the
 * highlight is a roving `aria-activedescendant` rather than real DOM focus —
 * the standard listbox-with-external-input wiring.
 */
export function CourseCatalogList({
  mode,
  showFacts = false,
  alreadyEnrolledCodes,
  onConfirm,
  onCancel,
  confirmLabel = "Continue",
  isSubmitting = false,
  autoFocusSearch = false,
}: CourseCatalogListProps) {
  const catalog = useCourseCatalog();
  const listId = useId();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const listRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const enrolled = new Set(alreadyEnrolledCodes);
  const courses = catalog.data?.courses ?? [];
  const filtered = courses.filter((c) => matchesQuery(c.nativeName, c.latinName, c.code, query));

  function select(index: number) {
    const entry = filtered[index];
    if (!entry || enrolled.has(entry.code) || isSubmitting) return;

    if (mode === "single") {
      onConfirm([entry.code]);
      return;
    }
    setSelected((current) =>
      current.includes(entry.code) ? current.filter((c) => c !== entry.code) : [...current, entry.code],
    );
  }

  const nav = useListNavigation(filtered.length, select);
  const { activeIndex } = nav;

  useEffect(() => {
    if (autoFocusSearch) searchRef.current?.focus();
  }, [autoFocusSearch]);

  // Keep the highlighted row visible when it moves by keyboard — the list
  // scrolls, and `aria-activedescendant` doesn't move the viewport the way
  // real focus would.
  useEffect(() => {
    if (activeIndex < 0) return;
    listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  if (catalog.isPending) return <Spinner label="Loading languages…" />;
  if (catalog.isError) {
    return <ErrorBanner message={errorMessage(catalog.error, "Couldn't load the list of languages.")} />;
  }

  const activeEntry = activeIndex >= 0 ? filtered[activeIndex] : undefined;
  const fact = showFacts ? activeEntry?.cultureFacts[0] : undefined;
  const optionId = (index: number) => `${listId}-option-${index}`;

  return (
    <div className={styles.wrap}>
      <input
        ref={searchRef}
        type="search"
        className={styles.search}
        placeholder="Search languages…"
        value={query}
        disabled={isSubmitting}
        onChange={(event) => {
          setQuery(event.target.value);
          // A filtered list is a different list; leaving the highlight where
          // it was would point it at an unrelated row.
          nav.setActiveIndex(0);
        }}
        onKeyDown={nav.onKeyDown}
        role="combobox"
        aria-expanded="true"
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={activeIndex >= 0 ? optionId(activeIndex) : undefined}
        aria-label="Search languages"
      />

      <div id={listId} ref={listRef} className={styles.list} role="listbox" aria-label="Languages">
        {filtered.length === 0 && <p className={styles.empty}>No languages match “{query.trim()}”.</p>}
        {filtered.map((course, index) => {
          const info = getLanguageInfo(course.code);
          const isEnrolled = enrolled.has(course.code);
          const isSelected = selected.includes(course.code);
          const classes = [
            styles.option,
            index === activeIndex ? styles.active : "",
            isEnrolled ? styles.disabled : "",
            isSelected ? styles.selected : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <div
              key={course.code}
              id={optionId(index)}
              data-index={index}
              className={classes}
              role="option"
              aria-selected={mode === "multi" ? isSelected : index === activeIndex}
              aria-disabled={isEnrolled || undefined}
              onMouseMove={() => nav.setActiveIndex(index)}
              onClick={() => select(index)}
            >
              <span
                className={badgeStyles.badge}
                style={
                  info
                    ? { backgroundImage: `linear-gradient(to bottom, ${info.flagColors.join(", ")})` }
                    : { background: "var(--color-locked)" }
                }
                aria-hidden="true"
              >
                {info?.flagCode ?? course.code.toUpperCase()}
              </span>
              <DirectionalText courseCode={course.code} className={styles.nativeName}>
                {course.nativeName}
              </DirectionalText>
              <span className={styles.latinName}>{course.latinName}</span>
              {isEnrolled && <span className={styles.tag}>Already learning</span>}
              {!isEnrolled && mode === "multi" && isSelected && (
                <span className={styles.check} aria-hidden="true">
                  ✓
                </span>
              )}
            </div>
          );
        })}
      </div>

      {showFacts && (
        // Rendered (empty) rather than mounted conditionally so the panel
        // doesn't appear and disappear under the list as the highlight moves
        // between a course that has a fact and one that doesn't.
        <div className={styles.factPanel} aria-live="polite">
          {fact && (
            <>
              <span className={styles.factLabel}>Did you know?</span> {fact}
            </>
          )}
        </div>
      )}

      <div className={styles.actions}>
        {onCancel && (
          <Button variant="secondary" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        )}
        {mode === "multi" && (
          <Button onClick={() => onConfirm(selected)} disabled={selected.length === 0 || isSubmitting}>
            {isSubmitting ? "Setting up…" : confirmLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
