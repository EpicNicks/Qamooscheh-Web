// Reading the correct answer aloud when an answer's review comes up — most
// recorded sentences in a course are answers, not prompts (an English →
// Persian exercise has no Persian prompt to record). Plays the answer's
// recording (ExerciseArtifact.answerAudio) when there is one, text-to-speech
// otherwise, and only for an answer in the course's language.
import { useEffect, useRef } from "react";
import { usePhraseAudio, type PhraseAudio } from "./usePhraseAudio";
import { useRecordings } from "./useRecordings";
import { useVoiceAvailability } from "./useVoiceAvailability";
import { useLocalAppPref } from "./useLocalAppPref";
import { getLanguageInfo, getSpeechLang } from "../domain/language";
import type { ExerciseArtifact } from "../types/content";
import type { ExerciseType } from "../domain/enums";
import { playSound, soundLength } from "../domain/sfx";

/**
 * The answer's playback control, or null when there's nothing to play: no
 * answer under review, an answer not in the course's language, or neither a
 * recording nor a voice for it. Plays once on its own each time a new review
 * comes up (`submissionCount`), when localAppPrefs.speakAnswers is on — except
 * after a correct one-tile answer, whose tile the learner just heard read out
 * when they tapped it (issue #31); its play button still replays it. A typed
 * one-word answer, or a wrong tile, still gets the answer read out. Goes by
 * how the exercise was shown (`renderType`), since a new word's type-in is
 * shown as tiles too (domain/exerciseResolution.ts).
 *
 * Each review also gets its right/wrong sound first (domain/sfx.ts, issue
 * #32) when localAppPrefs.soundEffects is on, and the answer is read once
 * that sound is over rather than on top of it.
 */
export function useAnswerAudio(
  exercise: ExerciseArtifact | null,
  courseCode: string | null,
  submissionCount: number,
  renderType: ExerciseType | null,
  correct: boolean,
): PhraseAudio | null {
  const [speakAnswers] = useLocalAppPref("speakAnswers", true);
  const [speakTiles] = useLocalAppPref("speakWordBankTiles", true);
  const [soundEffects] = useLocalAppPref("soundEffects", true);
  const tokenized = exercise?.type === "word_bank" || exercise?.type === "match";
  const text = exercise ? (tokenized ? exercise.answer.join(" ") : (exercise.answer[0] ?? "")) : "";
  const courseLang = getLanguageInfo(courseCode)?.speechLang ?? null;
  const inCourseLanguage = !!text && !!courseLang && getSpeechLang(courseCode, text) === courseLang;
  const audioUrl = useRecordings().phraseUrl(inCourseLanguage ? exercise?.answerAudio : null, exercise?.speaker);
  const voiceAvailable = useVoiceAvailability(inCourseLanguage ? courseLang : null);
  const playable = inCourseLanguage && (audioUrl != null || voiceAvailable);
  const audio = usePhraseAudio({ text, speechLang: inCourseLanguage ? courseLang : null, audioUrl });
  const shownAsTiles = renderType === "word_bank" || renderType === "match";
  // The text read out is one whole tile: a word bank's single token, or a
  // composite type-in's first answer. A longer answer still plays.
  const justHeardTile = shownAsTiles && correct && speakTiles && !!exercise?.tiles?.includes(text);

  // The read-back waiting for its sound to finish. It's dropped if the review
  // is over first (the learner moved on, and the next prompt is what should
  // be heard) or the learner plays the answer themselves.
  const readBack = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!exercise) return;
    const sound = correct ? "correct" : "wrong";
    if (soundEffects) playSound(sound);
    if (!speakAnswers || !playable || justHeardTile) return;
    if (!soundEffects) return audio.play();
    readBack.current = setTimeout(audio.play, soundLength(sound) * 1000);
    return () => clearTimeout(readBack.current);
    // Once per review, keyed on the counter: the same exercise answered twice
    // in a row (a requeued retry) has the same text but is a new review.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submissionCount]);

  useEffect(() => {
    if (!exercise) clearTimeout(readBack.current);
  }, [exercise]);

  if (!playable) return null;
  return {
    ...audio,
    play: () => {
      clearTimeout(readBack.current);
      audio.play();
    },
    playSlow: () => {
      clearTimeout(readBack.current);
      audio.playSlow();
    },
  };
}
