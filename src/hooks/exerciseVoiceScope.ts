// Which exercise the recordings below it belong to — set by ExerciseRenderer
// around an exercise and by ExerciseSessionScreen around an answer's review,
// so that with voices shuffled (localAppPrefs' shuffleVoices) everything
// heard in one question (prompt, answer, tiles, hovered words) plays in the
// one voice domain/recordings.ts's exerciseVoice draws for it. Null outside
// any exercise, where each recording draws its own.
import { createContext } from "react";
import type { ShuffleExercise } from "../domain/recordings";

export const ExerciseVoiceScope = createContext<ShuffleExercise | null>(null);
