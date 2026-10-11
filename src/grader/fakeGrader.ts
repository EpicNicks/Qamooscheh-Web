// A Grader that answers from a script, for tests of the code around the real
// one. What the real one says is checked against the backend's own vectors by
// scripts/verify-grader.mjs.
import type { Grader, GraderRequest, GraderResponse } from "./types";

export interface FakeGrader extends Grader {
  requests: GraderRequest[];
}

const INCORRECT: GraderResponse = { verdict: "Incorrect", matchedAnswer: null, correct: false, acceptedWithCorrection: false, reasons: [], xp: 0 };

/** `reply` fills in what a test cares about; the rest is an Incorrect response. */
export function fakeGrader(reply: (request: GraderRequest) => Partial<GraderResponse>): FakeGrader {
  const requests: GraderRequest[] = [];
  return {
    requests,
    gradeEnvelope(request) {
      requests.push(request);
      return { ...INCORRECT, ...reply(request) };
    },
    xp: () => 0,
  };
}

export const correct = (matchedAnswer: string, xp = 10): Partial<GraderResponse> => ({ verdict: "Correct", matchedAnswer, correct: true, xp });

export const accepted = (matchedAnswer: string, reasons: string[], xp = 7): Partial<GraderResponse> => ({
  verdict: "AcceptedWithCorrection",
  matchedAnswer,
  correct: true,
  acceptedWithCorrection: true,
  reasons,
  xp,
});
