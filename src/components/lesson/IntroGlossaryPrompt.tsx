import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../auth/useAuth";
import { findGlossaryByRef, glossaryForCourse } from "../../domain/glossaryContent";
import { loadLocalAppPrefs, saveLocalAppPrefs } from "../../lib/localAppPrefs";
import { GlossaryEntryView } from "../glossary/GlossaryEntryView";
import { Button } from "../common/Button";
import styles from "./IntroGlossaryPrompt.module.css";

/**
 * Offered once per Parsle that carries a `glossaryRef` (SkillArtifact): "a
 * quick guide may help", always skippable, with the glossary page opening in
 * a modal over the lesson. "Seen" is local to this device (localAppPrefs'
 * seenIntroGlossary), so a new device asks once more. A ref the course's
 * glossary doesn't have shows nothing.
 */
export function IntroGlossaryPrompt({ skillKey, glossaryRef, courseCode }: { skillKey: string; glossaryRef: string; courseCode: string | null | undefined }) {
  const { userId } = useAuth();
  const entry = findGlossaryByRef(glossaryForCourse(courseCode), glossaryRef);
  const [stage, setStage] = useState<"ask" | "view" | "closed">(() =>
    userId && !loadLocalAppPrefs(userId).seenIntroGlossary[skillKey] ? "ask" : "closed",
  );
  const dialogRef = useRef<HTMLDivElement>(null);

  function markSeen() {
    if (!userId) return;
    const seen = loadLocalAppPrefs(userId).seenIntroGlossary;
    saveLocalAppPrefs(userId, { seenIntroGlossary: { ...seen, [skillKey]: true } });
  }

  function skip() {
    markSeen();
    setStage("closed");
  }

  useEffect(() => {
    if (stage === "closed") return;
    dialogRef.current?.querySelector<HTMLElement>("button")?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      markSeen();
      setStage("closed");
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
    // markSeen reads only userId and skillKey.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  if (!entry || stage === "closed") return null;

  return (
    <div className={styles.overlay} onClick={skip}>
      <div
        ref={dialogRef}
        className={`${styles.dialog} ${stage === "view" ? styles.wide : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="intro-glossary-title"
        onClick={(event) => event.stopPropagation()}
      >
        {stage === "ask" ? (
          <>
            <h2 id="intro-glossary-title" className={styles.title}>
              A quick guide may help
            </h2>
            <p className={styles.body}>This Parsle has a pattern that's easier to learn than to memorize. Want to read about it first?</p>
            <div className={styles.actions}>
              <Button variant="secondary" onClick={skip}>
                Skip
              </Button>
              <Button
                onClick={() => {
                  markSeen();
                  setStage("view");
                }}
              >
                Show me
              </Button>
            </div>
          </>
        ) : (
          <>
            <span id="intro-glossary-title" hidden>
              {entry.title}
            </span>
            <GlossaryEntryView entry={entry} courseCode={courseCode} />
            <div className={styles.actions}>
              <Button onClick={() => setStage("closed")}>Start the Parsle</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
