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

export interface BootstrapResponse {
  course: CourseRef;
  position: PositionRef | null;
  graders: GraderRef[];
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
// Shared error shape — every controller returns `{ error: string }` (and
// checkpoint submit's SessionRejectedException case adds `reason`).
// ---------------------------------------------------------------------------

export interface ApiErrorBody {
  error: string;
  reason?: string;
}
