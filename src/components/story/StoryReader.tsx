// The story reader (Qamooscheh-Web#146): a whole chapter as text, to read along
// with or just listen to. A player bar at the top (play/pause and a timeline
// with one segment per line), a play button beside each line, and every word
// hoverable like anywhere else, with a star in its tooltip to save it.
import { useEffect, useRef } from "react";
import { AnnotatedText, type WordSaving } from "../lesson/AnnotatedText";
import { SentenceRomanization } from "../lesson/SentenceRomanization";
import { displayDirection } from "../../domain/annotation";
import { useNativeTextAlign } from "../../hooks/useNativeTextAlign";
import { useLocalAppPref } from "../../hooks/useLocalAppPref";
import type { StoryPlayer } from "../../hooks/useStoryPlayer";
import type { TextDisplaySettings, WordHint } from "../../domain/romanization";
import type { StoryLine } from "../../domain/storyLines";
import styles from "./StoryReader.module.css";

/** Where the playing line is held, as a fraction of the scroller's height from its top. */
const PLAYING_LINE_POSITION = 0.35;

interface StoryReaderProps {
  title: string | null;
  lines: readonly StoryLine[];
  player: StoryPlayer;
  courseHintMap: ReadonlyMap<string, WordHint>;
  textSettings: TextDisplaySettings;
  savingFor: (line: StoryLine) => WordSaving;
  /** The learner scrolled the last line into view: a story read without sound counts as read. Never fires for a chapter short enough to need no scrolling. */
  onReachedEnd: () => void;
  /** Shown at the bottom right: the cloze-style Parsles for this story. */
  practise: { label: string; onPress: () => void };
}

export function StoryReader({ title, lines, player, courseHintMap, textSettings, savingFor, onReachedEnd, practise }: StoryReaderProps) {
  const [autoscroll] = useLocalAppPref("storyAutoscroll", true);
  const { align } = useNativeTextAlign();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLLIElement | null)[]>([]);
  const playing = player.status === "playing";

  // Holds the line being read at one place on screen as the chain moves on.
  useEffect(() => {
    if (!autoscroll || !playing || player.activeIndex === null) return;
    const scroller = scrollerRef.current;
    const line = lineRefs.current[player.activeIndex];
    if (!scroller || !line) return;
    scroller.scrollTo({ top: line.offsetTop - scroller.clientHeight * PLAYING_LINE_POSITION, behavior: "smooth" });
  }, [autoscroll, playing, player.activeIndex]);

  // Reading to the end, by hand: only a scroll counts, so a chapter that fits
  // the screen isn't "read" the moment it opens. Idempotent server-side, so
  // reporting on every scroll that finds the last line in view is harmless,
  // but once per mount is all it needs.
  const reportedEnd = useRef(false);
  const onScroll = () => {
    const scroller = scrollerRef.current;
    const last = lineRefs.current[lines.length - 1];
    if (reportedEnd.current || !scroller || !last) return;
    if (last.offsetTop + last.offsetHeight <= scroller.scrollTop + scroller.clientHeight) {
      reportedEnd.current = true;
      onReachedEnd();
    }
  };

  // Words need their hints whatever the learner's hover toggles say: the hint is how a word is known to be a saved one.
  const readerSettings: TextDisplaySettings = { ...textSettings, translationEnabled: true };

  return (
    <div className={styles.wrap}>
      <div className={styles.playerBar}>
        <button
          type="button"
          className={styles.mainButton}
          onClick={player.toggleMain}
          aria-label={playing ? "Pause the story" : player.status === "paused" ? "Resume the story" : "Play the story"}
        >
          {playing ? "❚❚" : "▶"}
        </button>
        <ol className={styles.timeline} aria-label="Lines of the story">
          {player.segments.map((segment, i) => (
            <li key={i} className={styles.segmentItem}>
              <button
                type="button"
                className={styles.segment}
                data-state={segment.state}
                disabled={!segment.playable}
                onClick={() => player.playFrom(i)}
                aria-label={`Play from line ${i + 1}`}
                aria-current={segment.state === "active" ? "true" : undefined}
              />
            </li>
          ))}
        </ol>
      </div>
      {title && <h1 className={styles.title}>{title}</h1>}

      <div className={styles.scroller} ref={scrollerRef} onScroll={onScroll}>
        <ol className={styles.lines}>
          {lines.map((line, i) => {
            const direction = displayDirection(line.text, textSettings.display);
            const hasClip = player.segments[i]?.playable ?? false;
            return (
              <li
                key={i}
                className={styles.line}
                data-active={player.activeIndex === i ? "" : undefined}
                ref={(element) => {
                  lineRefs.current[i] = element;
                }}
              >
                {/* Pinned to the physical left like StoryTranscript's gutter, outside the RTL text. */}
                <div className={styles.gutter}>
                  {hasClip && (
                    <button
                      type="button"
                      className={styles.lineButton}
                      data-playing={player.soloIndex === i ? "" : undefined}
                      onClick={() => player.playSentence(i)}
                      aria-label={`Play line ${i + 1}`}
                    >
                      ▶
                    </button>
                  )}
                </div>
                <div className={styles.text}>
                  <SentenceRomanization
                    text={line.text}
                    authored={line.romanization}
                    hintMap={courseHintMap}
                    settings={textSettings}
                    tags={line.tags}
                  />
                  <p className={styles.sentence} dir={direction} style={direction === "rtl" ? { textAlign: align } : undefined}>
                    <AnnotatedText
                      text={line.text}
                      hintMap={courseHintMap}
                      settings={readerSettings}
                      tags={line.tags}
                      saving={savingFor(line)}
                    />
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      <button type="button" className={styles.practise} onClick={practise.onPress}>
        {practise.label}
      </button>
    </div>
  );
}
