// How the Journey plays a JourneyTransition. The page and the road only know this
// interface (the same two calls Android's JourneyAnimator has), so the
// renderer can be swapped for Rive later without touching either.
import type { JourneyTransition } from "../domain/pathProgress";

export interface JourneyAnimator {
  /** Draws the newly walked edges in path order. Resolves when done. */
  drawEdges(edges: JourneyTransition["edges"]): Promise<void>;
  /** Plays the unlock on the newly unlocked Parsles' nodes together (a fork unlocks several). Resolves when done. */
  playUnlock(skillKeys: string[]): Promise<void>;
}

const EDGE_MS = 450;
const UNLOCK_MS = 700;

function screenLength(path: SVGPathElement): number {
  const ctm = path.getScreenCTM();
  const total = path.getTotalLength();
  if (!ctm) return total;
  // The road's svg is stretched non-uniformly, so measure on screen, where the non-scaling stroke's dashes live.
  let length = 0;
  let prev: DOMPoint | null = null;
  for (let i = 0; i <= 16; i++) {
    const p = path.getPointAtLength((total * i) / 16);
    const q = new DOMPoint(p.x, p.y).matrixTransform(ctm);
    if (prev) length += Math.hypot(q.x - prev.x, q.y - prev.y);
    prev = q;
  }
  return length;
}

/** Web Animations on the road's own elements (SkillRoad tags them with data-edge-from/-to and data-skill-key). */
export const domJourneyAnimator: JourneyAnimator = {
  async drawEdges(edges) {
    for (const { from, to } of edges) {
      const paths = document.querySelectorAll<SVGPathElement>(
        `path[data-edge-from="${CSS.escape(from)}"][data-edge-to="${CSS.escape(to)}"]`,
      );
      await Promise.all(
        [...paths].map((path) => {
          const length = screenLength(path);
          // The walked colour draws over a copy in the not-yet-walked colour, so the line visibly extends.
          const under = path.cloneNode() as SVGPathElement;
          under.removeAttribute("class");
          under.style.stroke = "var(--path-stroke-locked)";
          under.style.fill = "none";
          under.style.strokeWidth = "var(--path-stroke-width)";
          under.style.vectorEffect = "non-scaling-stroke";
          under.style.strokeLinecap = "round";
          path.before(under);
          const animation = path.animate(
            [
              { strokeDasharray: `${length}`, strokeDashoffset: `${length}` },
              { strokeDasharray: `${length}`, strokeDashoffset: "0" },
            ],
            { duration: EDGE_MS, easing: "ease-out" },
          );
          return animation.finished
            .catch(() => undefined)
            .finally(() => under.remove());
        }),
      );
    }
  },
  async playUnlock(skillKeys) {
    // A collapsed fork (phone) is one node tagged with its first skill, so keys without a node are skipped.
    const nodes = skillKeys.flatMap((key) => [
      ...document.querySelectorAll<HTMLElement>(
        `[data-skill-key="${CSS.escape(key)}"]`,
      ),
    ]);
    await Promise.all(
      nodes.map((node) =>
        node
          .animate(
            [
              { transform: "scale(0.9)", filter: "grayscale(1)" },
              { transform: "scale(1.12)", filter: "grayscale(0)", offset: 0.6 },
              { transform: "scale(1)", filter: "grayscale(0)" },
            ],
            { duration: UNLOCK_MS, easing: "ease-out" },
          )
          .finished.catch(() => undefined),
      ),
    );
  },
};
