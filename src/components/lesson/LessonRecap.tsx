import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { useLocalAppPref } from "../../hooks/useLocalAppPref";
import { useRecapSequence } from "../../hooks/useRecapSequence";
import { playFillSound, playSound, soundLength } from "../../domain/sfx";
import { burstParticleCount, isPerfectScore, RECAP_FILL_MS, showPassMarkTick } from "../../domain/lessonRecap";
import { ScoreRing } from "./ScoreRing";
import styles from "./LessonRecap.module.css";

const BURST_COLOURS = ["--color-primary", "--color-current", "--color-placement", "--color-deepdive", "--color-streak"];

export interface RecapNote {
  tone: "ok" | "info" | "muted";
  text: string;
}

/**
 * The end-of-lesson recap card: score ring, title, the first-try fraction,
 * stat tiles, notes and actions, with an optional panel (`after`) beneath it.
 *
 * The ring fills first; only when it lands does a celebrated lesson burst, and
 * only then is everything else revealed (domain/lessonRecap.ts, driven by
 * hooks/useRecapSequence). Until then that text is hidden but keeps its space,
 * so nothing shifts. A failed lesson fills in amber with no burst. Reduced
 * motion shows the final state straight away.
 *
 * `celebrate` is whether there's anything to cheer (a pass, or XP credited);
 * the burst is bigger and the title reads "Perfect Delivery!" on a flawless
 * score. `sound` plays once, as the fill lands, followed by a chime on a
 * perfect pass; a rising cue plays while the ring fills (not under reduced
 * motion, where there is no fill).
 */
export function LessonRecap({
  correct,
  total,
  score,
  passMark,
  tone,
  celebrate,
  title,
  body,
  notes,
  stats,
  actions,
  after,
  sound,
}: {
  correct: number;
  total: number;
  /** Weighted score 0..1 (a forgiven typo counts half). */
  score: number;
  /** Draws a tick on the ring where passing starts. */
  passMark?: number;
  tone: "success" | "warning";
  celebrate: boolean;
  title?: string;
  body?: ReactNode;
  notes: RecapNote[];
  /** The stat tiles; told once the recap's text is revealed. */
  stats: (revealed: boolean) => ReactNode;
  actions: ReactNode;
  after?: ReactNode;
  sound?: "lessonPassed" | "lessonFailed";
}) {
  const pct = Math.round(score * 100);
  const { phase, progress, value, reduced } = useRecapSequence(pct, celebrate);
  const revealed = phase === "reveal";
  const perfect = celebrate && isPerfectScore(score);

  const [soundEffects] = useLocalAppPref("soundEffects", true);
  // Once, as the fill lands — not again if the setting changes after, nor on
  // development StrictMode's second run of this effect.
  const played = useRef(false);
  useEffect(() => {
    if (played.current || phase === "fill") return;
    played.current = true;
    if (!sound || !soundEffects) return;
    playSound(sound);
    // A flawless lesson adds a chime once the landing sound has played out.
    if (perfect && sound === "lessonPassed") playSound("lessonPerfect", soundLength(sound));
  }, [phase, sound, soundEffects, perfect]);

  // The fill cue, for the length of the fill; cut off if the recap goes first.
  useEffect(() => {
    if (reduced || !sound || !soundEffects || phase !== "fill") return;
    return playFillSound(RECAP_FILL_MS / 1000);
  }, [reduced, sound, soundEffects, phase]);

  const particles = !reduced && celebrate && phase !== "fill" ? burstParticleCount(perfect) : 0;

  return (
    <div className={styles.recap} data-revealed={revealed}>
      <div className={styles.card}>
        <div className={styles.hero}>
          {particles > 0 && (
            <div className={styles.burst} aria-hidden="true">
              {Array.from({ length: particles }, (_, i) => (
                <i
                  key={i}
                  style={
                    {
                      "--a": `${(i * 360) / particles}deg`,
                      "--r": `${(i % 2 === 0 ? 96 : 72) + (perfect ? 16 : 0)}px`,
                      "--k": `var(${BURST_COLOURS[i % BURST_COLOURS.length]})`,
                    } as CSSProperties
                  }
                />
              ))}
            </div>
          )}
          <ScoreRing pct={pct} progress={progress} shown={value} passMark={showPassMarkTick(phase) ? passMark : undefined} tone={tone} />
        </div>
        <div className={styles.reveal}>
          {(perfect || title) && <h1 className={styles.title}>{perfect ? "Perfect Delivery!" : title}</h1>}
          <p className={styles.fraction}>
            {correct} of {total} right first try
          </p>
          {body && <p className={styles.body}>{body}</p>}
          {stats(revealed)}
          {notes.map((note) => (
            <p key={note.text} className={`${styles.note} ${styles[note.tone]}`}>
              {note.text}
            </p>
          ))}
          <div className={styles.actions}>{actions}</div>
        </div>
      </div>
      {after && <div className={styles.reveal}>{after}</div>}
    </div>
  );
}
