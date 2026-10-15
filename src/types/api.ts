// Wire types for Qamooscheh.Api, one section per controller. Field names and
// shapes are copied directly from each *Contracts.cs file (System.Text.Json's
// default camelCase output), not re-derived — keep this file in sync with the
// backend by re-reading those files, not by guessing.
import type {
  ExerciseScriptMode,
  ExerciseType,
  FriendshipStatus,
  KeyboardMode,
  Register,
  ScriptMode,
} from "../domain/enums";
import type { ExerciseReportReason } from "../domain/exerciseReport";

// ---------------------------------------------------------------------------
// v1/auth (Auth/AuthContracts.cs)
// ---------------------------------------------------------------------------

export interface RegisterRequest {
  email: string;
  password: string;
  confirmPassword: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface GoogleAuthRequest {
  idToken: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface AuthResponse {
  userId: string;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
}

export interface RegistrationStatusResponse {
  enabled: boolean;
}

// ---------------------------------------------------------------------------
// v1/bootstrap (Bootstrap/BootstrapContracts.cs)
// ---------------------------------------------------------------------------

export interface CourseRef {
  code: string;
  version: number;
  manifestSha256: string;
}

export interface PositionRef {
  unitKey: string;
  skillKey: string;
}

export interface GraderRef {
  language: string;
  variant: "browser" | "wasi";
  version: number;
  manifestSha256: string;
}

/**
 * A newer published version of the active course than the one it's currently
 * pinned to. `eligible` is now a purely STRUCTURAL check (the target version
 * still ships the learner's current unit/skill, or a clamp target for it) —
 * it is no longer about how far the learner has progressed, so it is false
 * only for the abandoned-branch case, not the routine "keep studying" case
 * roll-forward used to refuse on. The client should still show the offer when
 * `eligible` is false rather than hide it, so the learner understands why
 * their course stopped growing.
 */
export interface CourseUpdateRef {
  version: number;
  manifestSha256: string;
  eligible: boolean;
  /** Authored release notes for this version, or null. */
  notes: string | null;
}

/** One resolved cursor position in `RollForwardPreviewResponse` — 0-based indices, add 1 for display. */
export interface RollForwardPositionRef {
  unitKey: string;
  skillKey: string;
  unitIndex: number;
  lessonIndex: number;
}

/**
 * GET /v1/courses/{code}/roll-forward-preview?toVersion={n}'s response.
 * Read-only and safe to call any number of times — it never advances
 * anything, unlike the POST below, which shares this same computation so the
 * two can never disagree about where the learner will land.
 *
 * `from` is null when there's no cursor yet, or the cursor sits on a lesson
 * the CURRENT version never shipped — render that as "you'll start at the
 * first lesson you still owe," not as an error. `to` is null when there's
 * nothing to land on, meaning the cursor won't move. Neither carries a
 * title — there's no title column in Api's schema, so unitKey/skillKey must
 * be resolved against the CDN manifests for `fromVersion`/`toVersion`
 * (types/content.ts) to render human names.
 */
export interface RollForwardPreviewResponse {
  courseCode: string;
  fromVersion: number;
  toVersion: number;
  manifestSha256: string;
  updateNotes: string | null;
  from: RollForwardPositionRef | null;
  to: RollForwardPositionRef | null;
  /** unitClamped || lessonClamped — the one flag a confirmation dialog needs to show a "this shortens Unit X" notice. */
  clamped: boolean;
  unitClamped: boolean;
  lessonClamped: boolean;
}

/**
 * Also what `POST /v1/courses/{code}/enroll` and `PUT /v1/courses/active`
 * hand back, so either response drops straight into the `["bootstrap"]` cache
 * slot (see BootstrapContracts.cs).
 *
 * `course` is nullable and null is a NORMAL answer: registration no longer
 * implicitly provisions anyone into a default course, so a brand-new account
 * bootstraps to `course: null` with an empty `enrolledCourseCodes` — which is
 * exactly what `RequireOnboarded` gates on.
 *
 * `enrolledCourseCodes` is oldest enrollment first and INCLUDES the active
 * course, so a switcher can render one row per entry and mark one current
 * without re-inserting `course.code` itself.
 */
export interface BootstrapResponse {
  course: CourseRef | null;
  position: PositionRef | null;
  graders: GraderRef[];
  enrolledCourseCodes: string[];
  /** app_user.onboarding_complete — a one-way flag, never true-then-false. Always false for a not-yet-enrolled account, since the onboarding tutorial only ever runs after language selection. */
  onboardingComplete: boolean;
  /** null when no newer version than `course.version` exists yet. */
  update: CourseUpdateRef | null;
}

// ---------------------------------------------------------------------------
// v1/sessions/next (SessionPlan/SessionPlanContracts.cs)
// ---------------------------------------------------------------------------

/** `unitKey` is null for a theme lesson with no journey position — only `GET /v1/sessions/for-lesson`'s deep-dive plan can report one; the cursor-driven `GET /v1/sessions/next` never does. */
export interface SkillRef {
  unitKey: string | null;
  skillKey: string;
}

export interface SessionPlanResponse {
  courseVersion: number;
  skills: SkillRef[];
  reviewTags: string[];
  newTags: string[];
  prefetchTags: string[];
}

// ---------------------------------------------------------------------------
// v1/sessions/submit (SessionSubmit/SessionSubmitContracts.cs)
// ---------------------------------------------------------------------------

export interface SubmittedItem {
  exerciseOrdinal: number;
  lexemeTag: string;
  exerciseType: ExerciseType;
  scriptMode: ExerciseScriptMode;
  submittedText: string;
  usedHint: boolean;
  latencyMs: number | null;
  attempt: number;
  /**
   * The correct answer retyped after this wrong typed attempt (domain/retype.ts),
   * sent only when it matched. Earns retype XP only; never changes the grade,
   * review_log, score or completion (API_SPEC.md §2.3 point 8).
   */
  retypeText?: string;
}

export interface SubmittedSession {
  submissionId: string;
  /** Null for a theme lesson with no journey position. */
  unitKey: string | null;
  skillKey: string;
  /** Which course this session was answered in — the server grades against this course explicitly, not whichever one is currently active for the caller. */
  courseCode: string;
  courseVersion: number;
  occurredAt: string;
  completed: boolean;
  items: SubmittedItem[];
}

export interface SubmitSessionsRequest {
  sessions: SubmittedSession[];
}

export type SessionOutcome = "Processed" | "AlreadyProcessed" | "Rejected";

export interface CardState {
  lexemeTag: string;
  stability: number;
  difficulty: number;
  lastReviewedAt: string | null;
  dueAt: string | null;
  reviewCount: number;
  lapseCount: number;
}

export interface SubmittedSessionResponse {
  submissionId: string;
  outcome: SessionOutcome;
  rejectionReason: string | null;
  cards: CardState[];
  /** First-attempt score, 0..1 (domain/lessonScore.ts) — null unless `outcome` is "Processed". */
  score?: number | null;
  /** Whether this session completed its skill: every exercise answered and `score` at or above the pass mark. Null unless `outcome` is "Processed". */
  lessonCompleted?: boolean | null;
  /** XP this session credited (API_SPEC.md §2.3 point 8, summed per answer as the grader prices it). Null unless `outcome` is "Processed". */
  xp?: number | null;
}

export interface SubmitSessionsResponse {
  sessions: SubmittedSessionResponse[];
}

// ---------------------------------------------------------------------------
// v1/checkpoint (Checkpoint/CheckpointContracts.cs)
// ---------------------------------------------------------------------------

export interface CheckpointSkillPlan {
  unitKey: string;
  skillKey: string;
  exerciseOrdinals: number[];
}

/**
 * One position between the learner's current position and the checkpoint
 * target — grouped by (unitKey, position) rather than by lesson, since side
 * versions (1a/1b) share a position and completing either counts as
 * completing it everywhere else. `positionAlreadyCompleted` is true when the
 * learner has a completion for any lesson at this position (most commonly
 * via deep dive) — that position is excluded from the plan's exercise
 * sampling entirely.
 */
export interface SkippedPosition {
  unitKey: string;
  position: number;
  lessonKeys: string[];
  positionAlreadyCompleted: boolean;
}

export interface CheckpointPlanResponse {
  courseVersion: number;
  targetUnitKey: string;
  targetSkillKey: string;
  skills: CheckpointSkillPlan[];
  skippedLessons: SkippedPosition[];
  skippedCount: number;
  alreadyCompletedCount: number;
  /** False iff every skipped position is already satisfied some other way — the plan may then carry zero skills and `submit` accepts an empty `skills` array. */
  requiresTest: boolean;
}

export interface CheckpointSkillAnswers {
  unitKey: string;
  skillKey: string;
  items: SubmittedItem[];
}

export interface SubmitCheckpointRequest {
  submissionId: string;
  targetUnitKey: string;
  targetSkillKey: string;
  courseVersion: number;
  occurredAt: string;
  skills: CheckpointSkillAnswers[];
}

export interface CheckpointSubmitResponse {
  passed: boolean;
  score: number;
  cards: CardState[];
  skippedLessons: SkippedPosition[];
  skippedCount: number;
  alreadyCompletedCount: number;
  requiresTest: boolean;
  /** Whether this call actually moved the cursor — false covers a failed attempt, a target with no cursor row, and "the learner already reached-or-passed the target another way." */
  applied: boolean;
  /** XP this attempt credited — 0 for an auto-pass that graded nothing, null on a replay. */
  xp?: number | null;
}

// ---------------------------------------------------------------------------
// v1/lessons (Controllers/LessonsController.cs). Raw skill_completion events
// only — deliberately not "passed via checkpoint" or "behind the cursor",
// which a client already has from bootstrap's Position and can derive
// itself. Used to grey out/filter completed lessons in theme-browsing UI.
// ---------------------------------------------------------------------------

export interface CompletedLessonsResponse {
  courseCode: string;
  completedLessonKeys: string[];
}

// ---------------------------------------------------------------------------
// v1/leagues (Leagues/LeagueContracts.cs)
// ---------------------------------------------------------------------------

export interface LeagueStandingResponse {
  userId: string;
  displayName: string | null;
  points: number;
}

export interface CurrentLeagueResponse {
  tier: number;
  periodEndsAt: string;
  standings: LeagueStandingResponse[];
}

// ---------------------------------------------------------------------------
// v1/friends (Friends/FriendsContracts.cs)
// ---------------------------------------------------------------------------

export interface FriendRefResponse {
  userId: string;
  displayName: string | null;
  /** Null in GET /v1/friends/requests: a pending requester is not yet a friend. */
  username?: string | null;
  since: string;
}

/** GET /v1/friends/{userId}/stats (API_SPEC.md §2.6). `league` is null when they aren't in the caller's current cohort. */
export interface FriendStatsResponse {
  userId: string;
  displayName: string | null;
  username: string | null;
  since: string;
  league: { rank: number; points: number } | null;
}

/** The caller's side of a pair (API_SPEC.md §2.6 "Relationship state"). */
export type FriendRelationship = "none" | "request_sent" | "request_received" | "friends";

export interface FriendRequestResponse {
  status: FriendshipStatus;
  relationship: FriendRelationship;
}

export interface UserSearchResultResponse {
  userId: string;
  username: string;
  displayName: string;
  relationship: FriendRelationship;
}

// ---------------------------------------------------------------------------
// v1/username (Usernames/UsernameController.cs)
// ---------------------------------------------------------------------------

export interface UsernameResponse {
  /** Null only if signup auto-assignment collided five times; the account is unfindable until one is picked. */
  username: string | null;
  autoAssigned: boolean;
  findable: boolean;
  /** Null when a change is allowed now. */
  canChangeAt: string | null;
}

// ---------------------------------------------------------------------------
// v1/profile (Profile/ProfileContracts.cs)
// ---------------------------------------------------------------------------

export interface UpdateProfileRequest {
  displayName: string;
  fullName: string | null;
  country: string | null;
}

export interface ProfileResponse {
  displayName: string | null;
  fullName: string | null;
  country: string | null;
}

// ---------------------------------------------------------------------------
// v1/prefs (Prefs/PrefsContracts.cs). Scoped server-side to the caller's
// currently-pinned course (user_prefs' PK is (user_id, course_code)) — the
// client never names a course here, the same way it never names one for
// /v1/profile.
// ---------------------------------------------------------------------------

export interface UpdatePrefsRequest {
  scriptMode: ScriptMode;
  register: Register;
  autoplayAudio: boolean;
  keyboardMode: KeyboardMode;
  desiredRetention: number;
  /** Duolingo-style: a daily XP target, not a time measurement — see GET /v1/activity's own `xp`, which is what this is actually compared against on the client (domain/proficiency.ts). */
  dailyGoalXp: number;
  /** Which of the course's voices (audio.json) to play recordings in; null or missing means the course's default (its first). Carried through a PUT so saving other settings doesn't reset it. */
  preferredVoice?: string | null;
}

export type PrefsResponse = UpdatePrefsRequest;

// ---------------------------------------------------------------------------
// v1/courses (Courses/CourseCatalogContracts.cs). Enroll and switch-active
// both answer with a BootstrapResponse, not a course-shaped body of their own.
// ---------------------------------------------------------------------------

export interface CourseCatalogEntry {
  code: string;
  nativeName: string;
  latinName: string;
  /**
   * Short facts about the language, shown ONLY while browsing (the "+ add a
   * language" modal and onboarding) — never in the routine course switcher,
   * which is a navigation control. The backend ships them on every row and
   * leaves that placement rule to the client, which is why
   * `CourseCatalogList` takes a `showFacts` prop rather than guessing from
   * where it happens to be mounted. Possibly empty.
   */
  cultureFacts: string[];
}

/** No `language` field by design — the client renders a flag from the course CODE (domain/language.ts). */
export interface CourseCatalogResponse {
  courses: CourseCatalogEntry[];
}

/** PUT /v1/courses/active's body — a body rather than a path segment: this is a state change on the CALLER. */
export interface SwitchActiveCourseRequest {
  courseCode: string;
}

/**
 * POST /v1/courses/{code}/roll-forward's body. `toVersion` must be the exact
 * version the client showed the learner via `BootstrapResponse.update` — never
 * "whatever is current now" — since a newer version could publish between the
 * offer being shown and the learner confirming it.
 */
export interface RollForwardCourseRequest {
  toVersion: number;
}

// ---------------------------------------------------------------------------
// v1/activity (Activity/ActivityContracts.cs). The one endpoint that takes an
// explicit course code — "how many days have I been active in Japanese" is a
// legitimate cross-course read, unlike session-plan/checkpoint/prefs, which
// all resolve the active course server-side.
// ---------------------------------------------------------------------------

export interface ActivityDay {
  /** A `DateOnly` on the wire — "2026-08-26", the user's own streak-day bucket, not an instant. */
  localDay: string;
  reviews: number;
  xp: number;
}

export interface ActivityResponse {
  courseCode: string;
  /** Newest day first. Deliberately not the streak — that stays one shared number across every enrolled language (GET /v1/streak). */
  days: ActivityDay[];
}

// ---------------------------------------------------------------------------
// v1/streak (Streak/StreakContracts.cs). ONE streak across every enrolled
// course — no course code anywhere — counted in the learner's own time zone
// and day_start_hour server-side. Moves on every submit, which is why it's
// its own endpoint rather than a bootstrap field.
// ---------------------------------------------------------------------------

export interface StreakResponse {
  /**
   * Derived on every read, never stored. Includes the grace day: practised
   * yesterday but not yet today still counts yesterday's run, since today
   * isn't over.
   */
  currentStreakDays: number;
  /** app_user.longest_streak_days, floored server-side at `currentStreakDays` — never less than it. */
  longestStreakDays: number;
  /** Whether today's streak-day already has activity — false while the streak is alive on the grace day only. */
  practicedToday: boolean;
  /** Whether a pause (learner-booked, or a travel day) covers today — the streak is safe without practice. */
  pausedToday: boolean;
  /** The learner's current or upcoming pause, or null. Travel days never appear here. */
  pause: StreakPauseResponse | null;
  /** Pause days still bookable under the server's per-year allowance (StreakPolicy.PauseDaysPerYear). */
  pauseDaysAvailable: number;
  /** The IANA zone the streak is counted in — the X-Time-Zone this client last reported. */
  timeZone: string;
  /** Local hour (0-23) a new streak-day starts at. */
  dayStartHour: number;
  /** The server's current streak-day ("YYYY-MM-DD") — use this, never a client-side re-derivation (DST makes them disagree). */
  today: string;
  /** ISO instant today's streak-day ends — the deadline for a learner who hasn't practiced yet. */
  nextDayStartsAt: string;
}

/** POST /v1/streak/pause — streak-days ("YYYY-MM-DD"), both inclusive. Start no earlier than `today`; the server enforces length (14) and lead-time (30 days) limits. */
export interface StreakPauseRequest {
  startDay: string;
  endDay: string;
}

/** A booked pause. `started`: it began before today, so DELETE ends it today rather than removing it. */
export interface StreakPauseResponse extends StreakPauseRequest {
  started: boolean;
}

// ---------------------------------------------------------------------------
// v1/vocab (Vocab/VocabContracts.cs). Not course-scoped — every tag the
// caller has ever starred, in any course; the client already holds the CDN
// lexemes.json for whichever course is on screen and intersects locally,
// the same client-joins-locally idiom session-plan/checkpoint already use.
// ---------------------------------------------------------------------------

export interface StarredVocabResponse {
  /** Every saved tag, in any course, most recently saved first. */
  tags: string[];
  /** How many the caller's plan can save (100 free) — across every course, not per course. */
  limit: number;
  /** Batch only: the tags it was asked to save that didn't fit under `limit`. Empty otherwise. */
  refused: string[];
}

/** GET /v1/vocab/starred/practice — a saved-words remix for the active course: the most-due saved words, each with exercises (by key and ordinal, at `courseVersion`) that use only words the learner has met. A word with no exercises is still a flashcard. */
export interface StarredPracticeResponse {
  courseVersion: number;
  words: StarredPracticeWord[];
}

export interface StarredPracticeWord {
  tag: string;
  exercises: { unitKey: string; skillKey: string; ordinal: number }[];
}

/** PUT /v1/vocab/starred's body — absolute state, not a toggle (a retried toggle over a flaky connection would silently flip the wrong way). */
export interface SetStarredRequest {
  tag: string;
  starred: boolean;
}

/** PUT /v1/vocab/starred/batch's body — a diff to reconcile in one call; star wins for a tag in both lists. */
export interface BatchSetStarredRequest {
  star: string[];
  unstar: string[];
}

// ---------------------------------------------------------------------------
// v1/flashcards (Flashcards/FlashcardContracts.cs). Flashcards never touch
// review scheduling; they only earn XP — 5 a card for a correct translation
// card, and for a known self-rated card only inside a saved-words remix —
// counted only for saved tags, once each per round, up to a daily cap. A cloze
// (fill in the blank) round is the exception: any learned word pays, 5/3/1 XP
// by attempt, under a per-word daily cooldown instead of the cap, and it also
// counts as a review.
// ---------------------------------------------------------------------------

export type FlashcardKind = "self_rated" | "translation" | "cloze";

export interface SubmitFlashcardsRequest {
  /** Client-generated; a retry with the same id answers with the first award. */
  submissionId: string;
  courseCode: string;
  occurredAt: string;
  inRemix: boolean;
  /** Cloze rounds only: the round had no typo tolerance. */
  hardcore?: boolean;
  /** A cloze round is all cloze cards. `attempt` is the one the card ended on (1-50), `correct: false` a give-up, `elapsedMs` the client-timed answer (0-600000). */
  cards: { tag: string; kind: FlashcardKind; correct: boolean; attempt?: number; elapsedMs?: number }[];
}

export interface SubmitFlashcardsResponse {
  alreadyProcessed: boolean;
  /** What the round earned, after the daily cap. */
  xp: number;
}

// ---------------------------------------------------------------------------
// v1/onboarding (Onboarding/OnboardingContracts.cs). One endpoint, one field.
// ---------------------------------------------------------------------------

export interface OnboardingCompleteResponse {
  /** Always true — the only thing POST /v1/onboarding/complete can do is set the flag, never clear it. */
  onboardingComplete: boolean;
}

// ---------------------------------------------------------------------------
// v1/exercise-reports (ExerciseReports/ExerciseReportContracts.cs). courseCode
// is not here: resolved server-side from the caller's active course, same as
// UpdatePrefsRequest never naming one.
// ---------------------------------------------------------------------------

export interface SubmitExerciseReportRequest {
  exercisePrompt: string;
  exerciseTags: string[];
  reasons: ExerciseReportReason[];
  details: string | null;
  /** Exactly what was graded (backend 0015 onward — every field below is optional). */
  submittedAnswer?: string | null;
  /** How the exercise was shown. Telemetry only, never graded. */
  renderType?: ExerciseType | null;
  /** courseVersion, skillKey and exerciseOrdinal go together or not at all; unitKey is null for a theme lesson. */
  courseVersion?: number | null;
  unitKey?: string | null;
  skillKey?: string | null;
  exerciseOrdinal?: number | null;
  /** The recordings the exercise played, as version-root-relative paths — the server keeps only each file name. */
  audioFiles?: string[];
}

export interface SubmitExerciseReportResponse {
  id: number;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Shared error shape — every controller returns `{ error: string }` (and
// checkpoint submit's SessionRejectedException case adds `reason`).
// ---------------------------------------------------------------------------

export interface ApiErrorBody {
  error: string;
  reason?: string;
  /** 409 from POST /v1/courses/{code}/roll-forward only: the highest version the caller can legally roll forward to right now. */
  highestEligibleVersion?: number;
  /** 409 reason "cooldown" from PUT /v1/username: when the next change is allowed. */
  canChangeAt?: string;
  /** 429 from POST /v1/auth/login and /v1/auth/google once too many sign-ins have failed from this IP or for this account (API_SPEC.md §3 "Per-client limits"): seconds until it may try again. `error` already says it in words. */
  retryAfterSeconds?: number;
}
