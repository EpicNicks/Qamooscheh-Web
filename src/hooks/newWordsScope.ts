// The new words of the Parsle the exercise below belongs to (domain/newWords.ts)
// — set by ExerciseSessionScreen around the exercise being asked and around its
// review, and read by ExercisePrompt alone: only prompt words are marked.
// NO_NEW_WORDS anywhere else (a checkpoint, Repack, story or flashcard).
import { createContext } from "react";
import { NO_NEW_WORDS, type NewWords } from "../domain/newWords";

export const NewWordsScope = createContext<NewWords>(NO_NEW_WORDS);
