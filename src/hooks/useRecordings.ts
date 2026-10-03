// The active course's recordings, resolved to playable URLs: which voice the
// learner prefers (user_prefs.preferred_voice), which is the course default
// (audio.json's first voice), and who's in its cast — the inputs
// domain/recordings.ts picks a take from. Every query here is one the lesson
// screens already make, so calling this from an exercise costs no extra fetch
// beyond audio.json itself, once per course version.
import { useCallback, useMemo } from "react";
import { useBootstrap } from "./useBootstrap";
import { usePrefs } from "./usePrefs";
import { useAudioIndex, useLexemeIndex } from "./useCourseContent";
import { contentUrl } from "../api/content";
import { pickRecording, wordRecording, type VoiceChoice } from "../domain/recordings";
import type { AudioMap } from "../types/content";

export interface Recordings {
  /** URL of a phrase's recording (an exercise's promptAudio/answerAudio), or null. `speaker` keeps a story line to its character's voices. */
  phraseUrl: (audio: AudioMap | null | undefined, speaker?: string | null) => string | null;
  /** URL of one written word's recording (a word-bank tile), or null — see wordRecording for how the word is found. */
  wordUrl: (text: string, exerciseTags: readonly string[]) => string | null;
}

export function useRecordings(): Recordings {
  const course = useBootstrap().data?.course ?? null;
  const preferredVoice = usePrefs().data?.preferredVoice ?? null;
  const audioIndex = useAudioIndex(course).data;
  const lexemeIndex = useLexemeIndex(course).data;

  const choiceFor = useCallback(
    (speaker?: string | null): VoiceChoice => ({
      preferredVoice,
      defaultVoice: audioIndex?.voices[0]?.id ?? null,
      speakerVoices: speaker ? audioIndex?.speakers.find((s) => s.id === speaker)?.voices : null,
    }),
    [preferredVoice, audioIndex],
  );

  return useMemo<Recordings>(() => {
    const toUrl = (path: string | null) => (path && course ? contentUrl(course.code, course.version, path) : null);
    return {
      phraseUrl: (audio, speaker) => toUrl(pickRecording(audio, choiceFor(speaker))),
      wordUrl: (text, exerciseTags) => toUrl(wordRecording(text, exerciseTags, lexemeIndex, choiceFor())),
    };
  }, [course, choiceFor, lexemeIndex]);
}
