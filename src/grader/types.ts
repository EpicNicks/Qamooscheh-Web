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

/** `GraderRef` from bootstrap (types/api.ts), narrowed to what loading a build needs. */
export interface GraderPointer {
  language: string;
  variant: string;
  version: number;
  manifestSha256: string;
}

export interface GraderManifestFile {
  path: string;
  sha256: string;
  size: number;
}

/** grader/{language}/{variant}/v{version}/manifest.json. */
export interface GraderManifest {
  language: string;
  variant: string;
  version: number;
  files: GraderManifestFile[];
}
