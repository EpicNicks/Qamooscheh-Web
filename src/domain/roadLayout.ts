// Pure geometry for the straight, branching standard-skill road that
// components/path/SkillRoad.tsx draws. Kept out of the component (and free of
// React) for the same reason pathProgress.ts is: it's arithmetic with an
// obvious right answer, and it's far easier to reason about as a function
// from "how many skills at each position" to "where every node and connector
// goes" than as JSX.
//
// Everything here is computed in a fixed LOGICAL width (config.logicalWidth),
// never in pixels. SkillRoad converts each x into a percentage, which is what
// lets the SVG (a `viewBox` scaled to 100% width) and the absolutely
// positioned nodes on top of it stay locked together at any container width
// with no resize observer. Vertical units ARE real pixels — the road grows
// downward into the existing page flow rather than into a scroll box.

export interface RoadLayoutConfig {
  /** Vertical distance between consecutive positions, in px. */
  rowHeight: number;
  /** Distance between adjacent alternates at a branching position, in logical units. */
  branchSpread: number;
  /** The coordinate space x is computed in; SkillRoad renders it as `viewBox="0 0 logicalWidth H"`. */
  logicalWidth: number;
}

export interface RoadNode {
  positionIndex: number;
  skillIndex: number;
  /** In logical units, not px. */
  x: number;
  /** In px. */
  y: number;
}

export interface RoadEdge {
  /** An SVG cubic-Bezier path `d`. */
  d: string;
  fromPositionIndex: number;
  toPositionIndex: number;
}

export interface RoadLayout {
  nodes: RoadNode[];
  edges: RoadEdge[];
  totalHeight: number;
}

/** Half a node's width in logical units, so a fork's spread can't push one off the edge. */
const NODE_HALF_WIDTH = 42;

/**
 * @param positionSkillCounts how many skills sit at each position, in order —
 *   `[1, 2, 1]` is "one skill, then a two-way fork, then one skill".
 */
export function computeRoadLayout(positionSkillCounts: number[], config: RoadLayoutConfig): RoadLayout {
  const { rowHeight, branchSpread, logicalWidth } = config;
  const centre = logicalWidth / 2;
  const topPadding = rowHeight / 2;

  // Clamped so no node can overhang the viewBox at either edge however a
  // theme has tuned branchSpread.
  const minX = NODE_HALF_WIDTH;
  const maxX = logicalWidth - NODE_HALF_WIDTH;
  const clamp = (x: number) => Math.min(maxX, Math.max(minX, x));

  // Every position is centred on the same vertical axis: a singleton sits
  // dead on `centre`, and a fork spreads its alternates symmetrically around
  // it. That keeps same-level nodes in the same column (straight connectors)
  // instead of the road zigzagging left/right row to row.
  const nodesByPosition: RoadNode[][] = positionSkillCounts.map((count, positionIndex) => {
    const y = topPadding + positionIndex * rowHeight;

    if (count <= 1) {
      return [{ positionIndex, skillIndex: 0, x: centre, y }];
    }

    return Array.from({ length: count }, (_, skillIndex) => ({
      positionIndex,
      skillIndex,
      x: clamp(centre + (skillIndex - (count - 1) / 2) * branchSpread),
      y,
    }));
  });

  // One straight segment per (skill at position i) × (skill at position i+1)
  // pair. That single rule covers every case the content model allows: 1→1,
  // 1→N (fanning out into a fork), N→1 (merging back), and N→M.
  const edges: RoadEdge[] = [];
  for (let i = 0; i < nodesByPosition.length - 1; i++) {
    for (const from of nodesByPosition[i]) {
      for (const to of nodesByPosition[i + 1]) {
        edges.push({
          d: `M ${from.x},${from.y} L ${to.x},${to.y}`,
          fromPositionIndex: from.positionIndex,
          toPositionIndex: to.positionIndex,
        });
      }
    }
  }

  return {
    nodes: nodesByPosition.flat(),
    edges,
    totalHeight: positionSkillCounts.length === 0 ? 0 : topPadding * 2 + (positionSkillCounts.length - 1) * rowHeight,
  };
}
