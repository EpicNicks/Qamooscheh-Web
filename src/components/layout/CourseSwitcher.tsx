import { useEffect, useRef, useState } from "react";
import { useBootstrap } from "../../hooks/useBootstrap";
import { useCourseCatalog } from "../../hooks/useCourseCatalog";
import { useEnrollCourse, useSwitchActiveCourse } from "../../hooks/useEnrollment";
import { getLanguageInfo } from "../../domain/language";
import { CourseCatalogModal } from "../course/CourseCatalogModal";
import { DirectionalText } from "../common/DirectionalText";
import { errorMessage } from "../../lib/errors";
import badgeStyles from "./LanguageBadge.module.css";
import styles from "./CourseSwitcher.module.css";

function flagStyle(courseCode: string) {
  const info = getLanguageInfo(courseCode);
  return info
    ? { backgroundImage: `linear-gradient(to bottom, ${info.flagColors.join(", ")})` }
    : { background: "var(--color-locked)" };
}

/**
 * The top-right course switcher — what a learner enrolled in more than one
 * language uses to change which one they're studying, plus the way into the
 * catalog.
 *
 * <b>An anchored panel, not a modal.</b> Switching languages is routine
 * navigation; it shouldn't dim the page, trap focus, or stop what's behind it
 * from being read. Adding a language (CourseCatalogModal) is the deliberate,
 * infrequent act, and that one IS a modal.
 *
 * <b>No culture facts here, on purpose.</b> They belong to the browse-and-choose
 * context only — see CourseCatalogList's `showFacts`, which this deliberately
 * never passes.
 *
 * Every row is drawn from two queries that are already cached (bootstrap for
 * which courses, the catalog for their names), so opening this costs no
 * network round trip — the same "derive from an already-fetched query" model
 * Sidebar.tsx uses.
 */
export function CourseSwitcher() {
  const bootstrap = useBootstrap();
  const catalog = useCourseCatalog();
  const switchActive = useSwitchActiveCourse();
  const enroll = useEnrollCourse();
  const [isOpen, setIsOpen] = useState(false);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Opening puts focus on the first row (a menu that can't be reached with
  // the keyboard is a menu keyboard users can't use), and closing hands focus
  // back to the flag button it came from. The `document.body` check is what
  // keeps that hand-back from fighting a close caused by clicking something
  // else: focus only falls back to the body when the still-focused row was
  // removed out from under it, i.e. when the menu closed by Escape or by
  // picking a row.
  useEffect(() => {
    if (!isOpen) return;
    // Captured now rather than read from the ref in the cleanup: by the time
    // that runs, the ref may already point somewhere else.
    const trigger = triggerRef.current;
    panelRef.current?.querySelector<HTMLElement>("button")?.focus();
    return () => {
      if (document.activeElement === null || document.activeElement === document.body) trigger?.focus();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    function onPointerDown(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setIsOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  const activeCode = bootstrap.data?.course?.code ?? null;
  const enrolledCodes = bootstrap.data?.enrolledCourseCodes ?? [];
  const activeInfo = getLanguageInfo(activeCode);

  // Nothing to switch between and nothing to show — a user with no active
  // course is on their way to onboarding (RequireOnboarded), not looking at
  // this header.
  if (!activeCode) return null;

  const nameOf = (code: string) => catalog.data?.courses.find((c) => c.code === code);

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button
        ref={triggerRef}
        type="button"
        className={`${badgeStyles.badge} ${styles.trigger}`}
        style={flagStyle(activeCode)}
        onClick={() => setIsOpen((open) => !open)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={`Current language: ${activeInfo?.displayName ?? activeCode}. Change language.`}
        title={activeInfo?.displayName ?? activeCode}
      >
        {activeInfo?.flagCode ?? activeCode.toUpperCase()}
      </button>

      {isOpen && (
        <div
          ref={panelRef}
          className={styles.panel}
          role="menu"
          aria-label="Your languages"
          // Up/Down walk the rows (wrapping), Home/End jump to either end —
          // what a `role="menu"` promises its users. Enter/Space need no
          // handling: every row is a real <button>.
          onKeyDown={(event) => {
            const rows = Array.from(panelRef.current?.querySelectorAll<HTMLButtonElement>("button") ?? []);
            if (rows.length === 0) return;
            // Focus outside the panel (indexOf -1) starts the walk from the
            // first row rather than doing nothing.
            const at = rows.indexOf(document.activeElement as HTMLButtonElement);
            const from = at === -1 ? 0 : at;
            const to =
              event.key === "ArrowDown"
                ? (from + 1) % rows.length
                : event.key === "ArrowUp"
                  ? (from - 1 + rows.length) % rows.length
                  : event.key === "Home"
                    ? 0
                    : event.key === "End"
                      ? rows.length - 1
                      : -1;
            if (to === -1) return;
            event.preventDefault();
            rows[to].focus();
          }}
        >
          {enrolledCodes.map((code) => {
            const entry = nameOf(code);
            const info = getLanguageInfo(code);
            const isActive = code === activeCode;

            return (
              <button
                key={code}
                type="button"
                role="menuitemradio"
                aria-checked={isActive}
                className={`${styles.row} ${isActive ? styles.rowActive : ""}`}
                disabled={switchActive.isPending}
                onClick={() => {
                  // Closed on SUCCESS rather than on click: closing immediately
                  // would unmount the only place a failed switch has to say so.
                  if (isActive) setIsOpen(false);
                  else switchActive.mutate(code, { onSuccess: () => setIsOpen(false) });
                }}
              >
                <span className={badgeStyles.badge} style={flagStyle(code)} aria-hidden="true">
                  {info?.flagCode ?? code.toUpperCase()}
                </span>
                <span className={styles.names}>
                  {entry && (
                    <DirectionalText courseCode={code} className={styles.nativeName}>
                      {entry.nativeName}
                    </DirectionalText>
                  )}
                  <span className={styles.latinName}>{entry?.latinName ?? info?.displayName ?? code}</span>
                </span>
                {isActive && (
                  <span className={styles.check} aria-hidden="true">
                    ✓
                  </span>
                )}
              </button>
            );
          })}

          {/* The "+" wears the same .badge as every language above it, so it
              reads as "another one of these" rather than as a settings link. */}
          <button
            type="button"
            role="menuitem"
            className={styles.row}
            onClick={() => {
              setIsOpen(false);
              setIsCatalogOpen(true);
            }}
          >
            <span className={`${badgeStyles.badge} ${styles.addBadge}`} aria-hidden="true">
              +
            </span>
            <span className={styles.names}>
              <span className={styles.latinName}>Add a language</span>
            </span>
          </button>

          {switchActive.error && (
            <p className={styles.error}>{errorMessage(switchActive.error, "Couldn't change language.")}</p>
          )}
        </div>
      )}

      {isCatalogOpen && (
        <CourseCatalogModal
          alreadyEnrolledCodes={enrolledCodes}
          isSubmitting={enroll.isPending}
          error={enroll.error ? errorMessage(enroll.error, "Couldn't add that language.") : null}
          onCancel={() => setIsCatalogOpen(false)}
          onConfirm={(code) => {
            // Enrolling does NOT switch — the learner stays in the course
            // they're mid-way through until they choose otherwise, which is
            // what the switcher above is for.
            enroll.mutate(code, { onSuccess: () => setIsCatalogOpen(false) });
          }}
        />
      )}
    </div>
  );
}
