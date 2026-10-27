// Mirrors Qamooscheh.Domain's [JsonStringEnumConverter]-backed enums.
// Kept as string unions (not TS `enum`) so the values ARE the wire strings —
// no separate mapping table to drift from the backend's
// [JsonStringEnumMemberName(...)] attributes.

/** Qamooscheh.Domain.ExerciseType — every type this build can render. The type below is derived from it, so a type added to one cannot be missing from the other. */
export const EXERCISE_TYPES = ["word_bank", "type_in", "match", "speak", "listen_type"] as const;
export type ExerciseType = (typeof EXERCISE_TYPES)[number];

/** False for a type a newer backend added that this build has never heard of (content is typed as if every exercise were known, but the wire can say otherwise). */
export function isKnownExerciseType(type: string): type is ExerciseType {
  return (EXERCISE_TYPES as readonly string[]).includes(type);
}

/**
 * Qamooscheh.Domain.ExerciseScriptMode — which script ONE exercise is
 * authored/graded in. No "both" member (unlike ScriptMode below): no
 * comparator has a "both" reading of one submitted string.
 */
export type ExerciseScriptMode = "native" | "romanized";

/**
 * Qamooscheh.Domain.ScriptMode — a user's *display* preference
 * (user_prefs.script_mode). Has "both"; ExerciseScriptMode does not.
 */
export type ScriptMode = "native" | "romanized" | "both";

/** Qamooscheh.Domain.SkillCategory. Only "standard" advances user_progress's cursor. */
export type SkillCategory = "standard" | "story" | "conversation" | "song";

/** Qamooscheh.Domain.Register (user_prefs.register / lexeme index entries). */
export type Register = "spoken" | "written" | "both";

/** Qamooscheh.Domain.FriendshipStatus (friendship.status). */
export type FriendshipStatus = "pending" | "accepted" | "blocked";

/** Qamooscheh.Domain.KeyboardMode (user_prefs.keyboard_mode). */
export type KeyboardMode = "contextual" | "isolated";

/** Qamooscheh.Domain.LeagueOutcome (league_result.outcome). */
export type LeagueOutcome = "promoted" | "demoted" | "held";

/** Qamooscheh.Domain.AuthProvider (user_credential.provider). */
export type AuthProvider = "password" | "google";
