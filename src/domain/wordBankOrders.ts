// A word_bank/match exercise can have more than one correct tile order: the
// authored `answer`, plus any `alternativeAnswers` (e.g. a Persian sentence
// with its optional pronoun left out, or a time word on the other side of the
// subject). Both the server's SessionGrader and the on-device grader accept
// any of them, so the client's instant feedback, wrong-answer tile colors and
// revealed answer all have to consider every order too — and agree with each
// other about WHICH order a wrong answer is measured against.
import type { ExerciseArtifact } from "../types/content";

/** Every correct tile order for a word_bank/match exercise, the authored `answer` first. */
export function acceptedTileOrders(exercise: Pick<ExerciseArtifact, "answer" | "alternativeAnswers">): string[][] {
  return [exercise.answer, ...(exercise.alternativeAnswers ?? [])];
}

// Recovers which tiles a submitted answer string was built from — the
// review screen is a fresh mount that only gets the submitted TEXT (tiles
// joined with spaces). A backtracking search rather than splitting on
// spaces, since a single tile can itself contain a space. Falls back to an
// empty selection if nothing matches (shouldn't happen for a real
// submission).
export function tilesForSubmission(tiles: string[], submitted: string): number[] {
  const used = new Set<number>();
  const picked: number[] = [];
  function search(rest: string): boolean {
    if (rest === "") return true;
    for (let i = 0; i < tiles.length; i++) {
      if (used.has(i) || tiles[i] === "") continue;
      const tile = tiles[i];
      if (rest === tile || rest.startsWith(tile + " ")) {
        used.add(i);
        picked.push(i);
        if (search(rest.slice(tile.length).replace(/^ /, ""))) return true;
        used.delete(i);
        picked.pop();
      }
    }
    return false;
  }
  return search(submitted) ? picked : [];
}

export type TileMark = "right" | "swapped" | "wrong";

// Grades each submitted tile against one correct order. The same special
// case Duolingo makes: if the answer is off by EXACTLY one swap of two
// tiles (every tile present, only that pair trading places), the pair is
// marked "swapped" (yellow) and everything else green. Otherwise, the
// tiles in the right ORDER are the longest common subsequence of the two
// token lists — unlike a straight index-by-index comparison, one extra or
// misplaced tile doesn't shift every tile after it out of line and turn
// them all red; only the tiles outside the best alignment are wrong.
export function gradeTiles(submitted: string[], answer: string[]): TileMark[] {
  const n = submitted.length;
  const m = answer.length;

  if (n === m) {
    const mismatches = submitted.flatMap((token, i) => (token === answer[i] ? [] : [i]));
    if (mismatches.length === 2) {
      const [a, b] = mismatches;
      if (submitted[a] === answer[b] && submitted[b] === answer[a]) {
        return submitted.map((_, i) => (i === a || i === b ? "swapped" : "right"));
      }
    }
  }

  const marks = new Array<TileMark>(n).fill("wrong");
  for (const step of alignTiles(submitted, answer)) {
    if (step.kind === "match") marks[step.submitted] = "right";
  }
  return marks;
}

/** One step through a submission measured against an answer: a submitted token in its right place, one that isn't, or an answer token left out. */
export type AlignmentStep =
  | { kind: "match"; submitted: number; answer: number }
  | { kind: "extra"; submitted: number }
  | { kind: "missing"; answer: number };

/**
 * gradeTiles's longest-common-subsequence alignment, step by step in reading
 * order — so a caller can also say where each left-out answer token belonged
 * (typedAnswerMarks.ts's missing words).
 */
export function alignTiles(submitted: string[], answer: string[]): AlignmentStep[] {
  const n = submitted.length;
  const m = answer.length;
  const lcs = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] = submitted[i] === answer[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const steps: AlignmentStep[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (submitted[i] === answer[j]) {
      steps.push({ kind: "match", submitted: i++, answer: j++ });
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      steps.push({ kind: "extra", submitted: i++ });
    } else {
      steps.push({ kind: "missing", answer: j++ });
    }
  }
  while (i < n) steps.push({ kind: "extra", submitted: i++ });
  while (j < m) steps.push({ kind: "missing", answer: j++ });
  return steps;
}

export interface ClosestTileOrder {
  /** The correct order the submission is closest to — what "Reveal Answer" shows. */
  order: string[];
  /** Each submitted tile graded against `order`. */
  marks: TileMark[];
}

/**
 * The correct order a submission comes closest to, and its tiles graded
 * against it: fewest red tiles first, then fewest of that order's tiles left
 * unplaced, then fewest yellow. Ties go to the earlier order, so the authored
 * `answer` wins whenever no alternative is strictly closer.
 */
export function closestTileOrder(submitted: string[], orders: string[][]): ClosestTileOrder {
  let best: (ClosestTileOrder & { score: number[] }) | null = null;
  for (const order of orders) {
    const marks = gradeTiles(submitted, order);
    const wrong = marks.filter((m) => m === "wrong").length;
    const placed = marks.length - wrong;
    const swapped = marks.filter((m) => m === "swapped").length;
    const score = [wrong, order.length - placed, swapped];
    if (best === null || isLower(score, best.score)) best = { order, marks, score };
  }
  return best ? { order: best.order, marks: best.marks } : { order: [], marks: submitted.map(() => "wrong") };
}

function isLower(a: number[], b: number[]): boolean {
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return a[i] < b[i];
  }
  return false;
}

/**
 * The correct order to show for a word_bank/match exercise given what the
 * learner submitted — the one their tiles were graded against, so the
 * revealed answer and the tile colors never disagree. A submission whose
 * tiles can't be recovered measures against the authored `answer`.
 */
export function revealedTileOrder(
  exercise: Pick<ExerciseArtifact, "tiles" | "answer" | "alternativeAnswers">,
  submittedText: string | undefined,
): string[] {
  const orders = acceptedTileOrders(exercise);
  if (submittedText === undefined || orders.length === 1) return exercise.answer;
  const tiles = exercise.tiles ?? [];
  const submitted = tilesForSubmission(tiles, submittedText).map((i) => tiles[i]);
  if (submitted.length === 0) return exercise.answer;
  return closestTileOrder(submitted, orders).order;
}

/**
 * The bank tiles (by tile index) the learner left out but the correct order
 * needed: each of `order`'s tokens that no right or swapped submitted tile
 * already accounts for claims one unused bank tile with the same text.
 */
export function missingBankTiles(tiles: string[], bankIndices: number[], submitted: string[], marks: TileMark[], order: string[]): Set<number> {
  const needed = new Map<string, number>();
  for (const token of order) needed.set(token, (needed.get(token) ?? 0) + 1);
  submitted.forEach((token, i) => {
    if (marks[i] !== "wrong" && (needed.get(token) ?? 0) > 0) needed.set(token, needed.get(token)! - 1);
  });
  const missing = new Set<number>();
  for (const index of bankIndices) {
    const count = needed.get(tiles[index]) ?? 0;
    if (count > 0) {
      missing.add(index);
      needed.set(tiles[index], count - 1);
    }
  }
  return missing;
}
