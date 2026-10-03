// Reading the correct answer aloud when an answer's review comes up — most
// recorded sentences in a course are answers, not prompts (an English →
// Persian exercise has no Persian prompt to record). Plays the answer's
// recording (ExerciseArtifact.answerAudio) when there is one, text-to-speech
// otherwise, and only for an answer in the course's language.
import { useEffect } from "react";
import { usePhraseAudio, type PhraseAudio } from "./usePhraseAudio";
import { useRecordings } from "./useRecordings";
import { useVoiceAvailability } from "./useVoiceAvailability";
import { useLocalAppPref } from "./useLocalAppPref";
import { getLanguageInfo, getSpeechLang } from "../domain/language";
import type { ExerciseArtifact } from "../types/content";

/**
 * The answer's playback control, or null when there's nothing to play: no
 * answer under review, an answer not in the course's language, or neither a
 * recording nor a voice for it. Plays once on its own each time a new review
 * comes up (`submissionCount`), when localAppPrefs.speakAnswers is on — except
 * after a correct one-tile answer, whose tile the learner just heard read out
 * when they tapped it (issue #31); its play button still replays it. A typed
 * one-word answer, or a wrong tile, still gets the answer read out.
 */
export function useAnswerAudio(
  exercise: ExerciseArtifact | null,
  courseCode: string | null,
  submissionCount: number,
  correct: boolean,
): PhraseAudio | null {
  const [speakAnswers] = useLocalAppPref("speakAnswers", true);
  const [speakTiles] = useLocalAppPref("speakWordBankTiles", true);
  const tokenized = exercise?.type === "word_bank" || exercise?.type === "match";
  const text = exercise ? (tokenized ? exercise.answer.join(" ") : (exercise.answer[0] ?? "")) : "";
  const courseLang = getLanguageInfo(courseCode)?.speechLang ?? null;
  const inCourseLanguage = !!text && !!courseLang && getSpeechLang(courseCode, text) === courseLang;
  const audioUrl = useRecordings().phraseUrl(inCourseLanguage ? exercise?.answerAudio : null, exercise?.speaker);
  const voiceAvailable = useVoiceAvailability(inCourseLanguage ? courseLang : null);
  const playable = inCourseLanguage && (audioUrl != null || voiceAvailable);
  const audio = usePhraseAudio({ text, speechLang: inCourseLanguage ? courseLang : null, audioUrl });
  const justHeardTile = tokenized && exercise.answer.length === 1 && correct && speakTiles;

  useEffect(() => {
    if (speakAnswers && playable && !justHeardTile) audio.play();
    // Once per review, keyed on the counter: the same exercise answered twice
    // in a row (a requeued retry) has the same text but is a new review.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submissionCount]);

  return playable ? audio : null;
}
