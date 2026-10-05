import { useId, useMemo } from "react";
import { useBootstrap } from "../../hooks/useBootstrap";
import { useAudioIndex, useLexemeIndex } from "../../hooks/useCourseContent";
import { useLocalAppPref } from "../../hooks/useLocalAppPref";
import { usePhraseAudio } from "../../hooks/usePhraseAudio";
import { contentUrl } from "../../api/content";
import { getLanguageInfo } from "../../domain/language";
import { parseLexemeTag } from "../../domain/lexemeTag";
import { PlayAudioButton } from "../lesson/PlayAudioButton";
import styles from "./VoicePicker.module.css";

interface VoicePickerProps {
  /** user_prefs.preferred_voice — null is the course default. */
  value: string | null;
  onChange: (voice: string | null) => void;
  /** The caller's own styling for the select's field, its note and the shuffle checkbox row — Settings' form fields or the lesson cog's popover. */
  classNames?: { field?: string; note?: string; checkbox?: string };
}

/**
 * Which of the course's voices recordings play in (user_prefs.preferred_voice),
 * listed from the course's audio.json under their own names, plus the
 * per-device "shuffle voices" toggle (localAppPrefs' shuffleVoices) that
 * sets the choice aside. Shown on the Settings page and in a lesson's cog.
 * The first voice is the course default, and choosing it stores null rather
 * than its id, so the learner keeps following the default if the course
 * changes it. A voice without a take of something plays the default's
 * instead (hooks/useRecordings.ts), so a voice that hasn't recorded anything
 * yet is labelled as such rather than hidden. Renders nothing for a course
 * with no audio.json.
 */
export function VoicePicker({ value, onChange, classNames }: VoicePickerProps) {
  const course = useBootstrap().data?.course ?? null;
  const voices = useAudioIndex(course).data?.voices ?? [];
  const lexemeIndex = useLexemeIndex(course).data;
  const [shuffleVoices, setShuffleVoices] = useLocalAppPref("shuffleVoices", false);

  const selectId = useId();
  const defaultVoice = voices[0];
  const selected = voices.find((v) => v.id === value) ?? defaultVoice;

  // A word this voice has recorded on its own, to preview it with.
  const sample = useMemo(() => {
    if (!selected || !lexemeIndex || !course) return null;
    for (const [tag, entry] of Object.entries(lexemeIndex)) {
      const path = entry.audio?.[selected.id]?.[0];
      if (path) return { text: parseLexemeTag(tag).surface, url: contentUrl(course.code, course.version, path) };
    }
    return null;
  }, [selected, lexemeIndex, course]);
  const preview = usePhraseAudio({
    text: sample?.text ?? "",
    speechLang: getLanguageInfo(course?.code)?.speechLang ?? null,
    audioUrl: sample?.url,
  });

  if (!defaultVoice || !selected) return null;

  return (
    <>
      <div className={classNames?.field}>
        <label htmlFor={selectId}>Voice</label>
        <span className={styles.row}>
          <select
            id={selectId}
            value={selected.id}
            disabled={shuffleVoices}
            onChange={(e) => onChange(e.target.value === defaultVoice.id ? null : e.target.value)}
          >
            {voices.map((voice) => (
              <option key={voice.id} value={voice.id}>
                {voice.name}
                {voice.id === defaultVoice.id ? " (default)" : ""}
                {voice.recordings === 0 && (voice.words ?? 0) === 0 ? " — no recordings yet" : ""}
              </option>
            ))}
          </select>
          {sample && !shuffleVoices && <PlayAudioButton status={preview.status} onClick={preview.play} />}
        </span>
        <span className={classNames?.note}>
          {shuffleVoices
            ? "Each recording plays in one of the voices that recorded it."
            : "Recordings play in this voice."}
          {!shuffleVoices && selected.id !== defaultVoice.id && ` Anything it hasn't recorded plays in ${defaultVoice.name}'s voice instead.`}
        </span>
      </div>
      {voices.length > 1 && (
        <label className={classNames?.checkbox}>
          <input type="checkbox" checked={shuffleVoices} onChange={(e) => setShuffleVoices(e.target.checked)} />
          Shuffle voices
        </label>
      )}
    </>
  );
}
