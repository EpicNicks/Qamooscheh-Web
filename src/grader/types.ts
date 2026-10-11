// The published offline grader's wire contract (the backend's
// tools/Qamooscheh.<Language>.Grader.Core/GraderContracts.cs, API_SPEC.md §7),
// and the manifest that lists a grader build's files. Plain types only, so
// the Node-side verify script can load this directory without a bundler.

/** One grading call. exerciseType/scriptMode are the grader's own spelling ("TypeIn", "Native"), not the artifacts'. */
export interface GraderRequest {
  exerciseType: string;
  scriptMode: string;
  submitted: string;
  acceptedAnswers: readonly string[];
  /** word_bank/match only: the artifact's other correct tile orders, passed through unchanged. */
  alternativeAnswers?: readonly (readonly string[])[] | null;
  /** The next four only feed the response's `xp`; none changes the verdict. Omitted: a first attempt with no hint. */
  attempt?: number;
  usedHint?: boolean;
  retype?: boolean;
  retypeNumber?: number;
}

/** A wrong answer is a successful call with verdict "Incorrect". `error` means the grader could not interpret the request at all. */
export interface GraderResponse {
  verdict: string | null;
  matchedAnswer?: string | null;
  correct: boolean;
  acceptedWithCorrection: boolean;
  /** The language's own correction taxonomy ("ZwnjOrSpacing", "CodepointSubstitution", ...): display detail, not a cross-language contract. */
  reasons: string[];
  error?: string | null;
  xp?: number | null;
}

/** The loaded grader: the `grader` object main.mjs of the browser build exports. */
export interface Grader {
  gradeEnvelope(request: GraderRequest): GraderResponse;
  xp(verdict: string, attempt: number, usedHint: boolean, retype?: boolean, retypeNumber?: number): number;
}

/** One language's grader as scripts/fetch-grader.mjs shipped it: public/grader/{language}/v{version}/. */
export interface ShippedGrader {
  language: string;
  version: number;
  /** sha256 of the build's manifest.json, as hashed when it was fetched. */
  manifestSha256: string;
  /** Paths under the version directory the app needs, manifest.json aside. */
  files: string[];
  /** The backend's verify vectors, for CI only. */
  vectors: string[];
}

/** public/grader/index.json. */
export interface GraderIndex {
  graders: ShippedGrader[];
}
