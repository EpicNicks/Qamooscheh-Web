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
  since: string;
}

export interface FriendRequestResponse {
  status: FriendshipStatus;
}

export interface UserSearchResultResponse {
  userId: string;
  displayName: string;
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
  /** Newest day first. Deliberately not the streak — that stays one shared number across every enrolled language. */
  days: ActivityDay[];
}

// ---------------------------------------------------------------------------
// v1/vocab (Vocab/VocabContracts.cs). Not course-scoped — every tag the
// caller has ever starred, in any course; the client already holds the CDN
// lexemes.json for whichever course is on screen and intersects locally,
// the same client-joins-locally idiom session-plan/checkpoint already use.
// ---------------------------------------------------------------------------

export interface StarredVocabResponse {
  tags: string[];
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
}
