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
}

// ---------------------------------------------------------------------------
// v1/sessions/next (SessionPlan/SessionPlanContracts.cs)
// ---------------------------------------------------------------------------

export interface SkillRef {
  unitKey: string;
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
  unitKey: string;
  skillKey: string;
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

export interface CheckpointPlanResponse {
  courseVersion: number;
  targetUnitKey: string;
  targetSkillKey: string;
  skills: CheckpointSkillPlan[];
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
  dailyGoalMinutes: number;
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
}
