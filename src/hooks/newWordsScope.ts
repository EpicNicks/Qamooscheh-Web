// The new words of the Parsle the exercise below belongs to (domain/newWords.ts)
// — set by ExerciseSessionScreen around the exercise being asked and around its
// review. NO_NEW_WORDS outside a Parsle (a Repack, a story, flashcards).
import { createContext } from "react";
import { NO_NEW_WORDS, type NewWords } from "../domain/newWords";

export const NewWordsScope = createContext<NewWords>(NO_NEW_WORDS);
