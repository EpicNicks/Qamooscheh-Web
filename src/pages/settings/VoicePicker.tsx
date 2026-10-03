import { useId, useMemo } from "react";
import { useBootstrap } from "../../hooks/useBootstrap";
import { useAudioIndex, useLexemeIndex } from "../../hooks/useCourseContent";
import { usePhraseAudio } from "../../hooks/usePhraseAudio";
import { contentUrl } from "../../api/content";
import { getLanguageInfo } from "../../domain/language";
import { parseLexemeTag } from "../../domain/lexemeTag";
import { PlayAudioButton } from "../../components/lesson/PlayAudioButton";
import type { SettingsSectionProps } from "./SettingsSectionProps";
import styles from "./SettingsPage.module.css";

/**
 * Which of the course's voices recordings play in (user_prefs.preferred_voice),
 * listed from the course's audio.json under their own names. The first voice
 * is the course default, and choosing it stores null rather than its id, so
 * the learner keeps following the default if the course changes it. A voice
 * without a take of something plays the default's instead (hooks/useRecordings.ts),
 * so a voice that hasn't recorded anything yet is labelled as such rather
 * than hidden. Renders nothing for a course with no audio.json.
 */
export function VoicePicker({ form, editForm }: Pick<SettingsSectionProps, "form" | "editForm">) {
  const course = useBootstrap().data?.course ?? null;
  const voices = useAudioIndex(course).data?.voices ?? [];
  const lexemeIndex = useLexemeIndex(course).data;

  const selectId = useId();
  const defaultVoice = voices[0];
  const selected = voices.find((v) => v.id === form.preferredVoice) ?? defaultVoice;

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
    <div className={styles.field}>
      <label htmlFor={selectId}>Voice</label>
      <span className={styles.voiceRow}>
        <select
          id={selectId}
          value={selected.id}
          onChange={(e) => editForm({ preferredVoice: e.target.value === defaultVoice.id ? null : e.target.value })}
        >
          {voices.map((voice) => (
            <option key={voice.id} value={voice.id}>
              {voice.name}
              {voice.id === defaultVoice.id ? " (default)" : ""}
              {voice.recordings === 0 && (voice.words ?? 0) === 0 ? " — no recordings yet" : ""}
            </option>
          ))}
        </select>
        {sample && <PlayAudioButton status={preview.status} onClick={preview.play} />}
      </span>
      <span className={styles.fieldNote}>
        Recordings play in this voice.
        {selected.id !== defaultVoice.id && ` Anything it hasn't recorded plays in ${defaultVoice.name}'s voice instead.`}
      </span>
    </div>
  );
}
