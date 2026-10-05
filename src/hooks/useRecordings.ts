// The active course's recordings, resolved to playable URLs: which voice the
// learner prefers (user_prefs.preferred_voice), which is the course default
// (audio.json's first voice), and who's in its cast — the inputs
// domain/recordings.ts picks a take from. Every query here is one the lesson
// screens already make, so calling this from an exercise costs no extra fetch
// beyond audio.json itself, once per course version.
import { useCallback, useContext, useMemo } from "react";
import { useBootstrap } from "./useBootstrap";
import { usePrefs } from "./usePrefs";
import { useLocalAppPref } from "./useLocalAppPref";
import { useAudioIndex, useLexemeIndex } from "./useCourseContent";
import { contentUrl } from "../api/content";
import { exerciseVoice, lineVoice, pickRecording, wordRecording, type ShuffleExercise, type VoiceChoice } from "../domain/recordings";
import { ExerciseVoiceScope } from "./exerciseVoiceScope";
import type { AudioMap } from "../types/content";

/**
 * One seed per page load: with shuffleVoices on, a question keeps the voice it
 * drew for the whole visit (replays, its report, coming round again after a
 * wrong answer) and may draw another next time.
 */
const SHUFFLE_SEED = Math.floor(Math.random() * 0x7fffffff);

export interface Recordings {
  /** URL of a phrase's recording (an exercise's promptAudio/answerAudio), or null. `speaker` keeps a story line to its character's voices. */
  phraseUrl: (audio: AudioMap | null | undefined, speaker?: string | null) => string | null;
  /** The same take as phraseUrl, as its version-root-relative path — what an exercise report cites. */
  phrasePath: (audio: AudioMap | null | undefined, speaker?: string | null) => string | null;
  /** URL of one written word's recording (a word-bank tile), or null — see wordRecording for how the word is found. */
  wordUrl: (text: string, exerciseTags: readonly string[]) => string | null;
}

/**
 * `exercise` names the exercise these recordings belong to, for a caller
 * outside its ExerciseVoiceScope (the answer's read-back, its report);
 * otherwise the nearest scope's is used.
 */
export function useRecordings(exercise?: ShuffleExercise | null): Recordings {
  const scoped = useContext(ExerciseVoiceScope);
  const scope = exercise === undefined ? scoped : exercise;
  const course = useBootstrap().data?.course ?? null;
  const preferredVoice = usePrefs().data?.preferredVoice ?? null;
  const [shuffleVoices] = useLocalAppPref("shuffleVoices", false);
  const audioIndex = useAudioIndex(course).data;
  const lexemeIndex = useLexemeIndex(course).data;

  const voicesOf = useCallback(
    (speaker: string | null | undefined) => (speaker ? audioIndex?.speakers.find((s) => s.id === speaker)?.voices : null),
    [audioIndex],
  );

  // The voice the whole exercise plays in while shuffling — a story line's
  // exercise is said by its own speaker, so it draws among their voices.
  const questionVoice = useMemo(() => {
    if (!shuffleVoices || !scope || !audioIndex) return null;
    const cast = audioIndex.voices.filter((v) => v.recordings > 0 || (v.words ?? 0) > 0).map((v) => v.id);
    return exerciseVoice(scope, cast, voicesOf(scope.speaker), SHUFFLE_SEED);
  }, [shuffleVoices, scope, audioIndex, voicesOf]);

  const choiceFor = useCallback(
    (audio: AudioMap | null | undefined, speaker?: string | null): VoiceChoice => {
      const speakerVoices = voicesOf(speaker);
      const shuffled = shuffleVoices ? (questionVoice ?? lineVoice(audio, speakerVoices, SHUFFLE_SEED)) : null;
      return {
        preferredVoice: shuffled ?? preferredVoice,
        defaultVoice: audioIndex?.voices[0]?.id ?? null,
        speakerVoices,
      };
    },
    [preferredVoice, shuffleVoices, questionVoice, audioIndex, voicesOf],
  );

  return useMemo<Recordings>(() => {
    const toUrl = (path: string | null) => (path && course ? contentUrl(course.code, course.version, path) : null);
    return {
      phraseUrl: (audio, speaker) => toUrl(pickRecording(audio, choiceFor(audio, speaker))),
      phrasePath: (audio, speaker) => pickRecording(audio, choiceFor(audio, speaker)),
      // Outside a question a word has no one recording to draw by, so it keeps the learner's own choice.
      wordUrl: (text, exerciseTags) => toUrl(wordRecording(text, exerciseTags, lexemeIndex, choiceFor(null))),
    };
  }, [course, choiceFor, lexemeIndex]);
}
