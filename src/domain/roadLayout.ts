// Pure geometry for the straight, branching standard-skill road that
// components/path/SkillRoad.tsx draws. Kept out of the component (and free of
// React) for the same reason pathProgress.ts is: it's arithmetic with an
// obvious right answer, and it's far easier to reason about as a function
// from "what is on each row" to "where every node and connector goes" than as
// JSX.
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
  /** Height of the short row a story's junction sits in, in px. */
  spurRowHeight: number;
  /** Distance between adjacent alternates at a branching position, in logical units. */
  branchSpread: number;
  /** The coordinate space x is computed in; SkillRoad renders it as `viewBox="0 0 logicalWidth H"`. */
  logicalWidth: number;
  /**
   * Half a node's width, in logical units — so a fork's spread can't push one
   * off the edge. No default: a skin that changes `logicalWidth` without
   * restating this would silently break the clamp with no compiler
   * complaint, so every theme has to say what its own node card is half as
   * wide as, in this same coordinate space.
   */
  nodeHalfWidth: number;
  /** How far a story node sits from the road's centre axis, in logical units. */
  storyOffset: number;
  /** Half a story node's width, in logical units; the same clamp as `nodeHalfWidth`, for the story lane. */
  storyHalfWidth: number;
}

/** One row of the road, top to bottom. */
export type RoadRowInput =
  /** `count` skills side by side: 1 is a single lesson, 2+ a fork. */
  | { kind: "position"; count: number }
  /** A junction on the road with a story node off to one side. */
  | { kind: "story"; side: "left" | "right" };

export type RoadNode =
  | {
      kind: "skill";
      rowIndex: number;
      /** Index among the position rows only (not counting story rows). */
      positionIndex: number;
      skillIndex: number;
      /** In logical units, not px. */
      x: number;
      /** In px. */
      y: number;
    }
  | { kind: "junction"; rowIndex: number; x: number; y: number }
  | { kind: "story"; rowIndex: number; x: number; y: number };

export interface RoadEdge {
  /** `main` runs along the road between consecutive rows; `branch` is the horizontal connector from a junction to its story. */
  kind: "main" | "branch";
  /** An SVG path `d` — a straight segment (`M … L …`) from one node to the next, not a curve. */
  d: string;
  fromRowIndex: number;
  toRowIndex: number;
  /** Null when that end is a junction or a story rather than a position's skill. */
  fromPositionIndex: number | null;
  toPositionIndex: number | null;
  fromSkillIndex: number | null;
  toSkillIndex: number | null;
  /** Endpoints, x in logical units and y in px — what `d` is drawn between. */
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface RoadLayout {
  nodes: RoadNode[];
  edges: RoadEdge[];
  totalHeight: number;
}

export function computeRoadLayout(rows: RoadRowInput[], config: RoadLayoutConfig): RoadLayout {
  const { rowHeight, spurRowHeight, branchSpread, logicalWidth, nodeHalfWidth, storyOffset, storyHalfWidth } = config;
  const centre = logicalWidth / 2;

  // Clamped so no node can overhang the viewBox at either edge however a
  // theme has tuned branchSpread.
  const clamp = (x: number, halfWidth: number) => Math.min(logicalWidth - halfWidth, Math.max(halfWidth, x));

  const nodes: RoadNode[] = [];
  const edges: RoadEdge[] = [];
  // The nodes the road itself passes through on the previous row: a
  // position's skills, or a story row's junction (never the story node).
  let previous: RoadNode[] = [];
  let top = 0;
  let positionIndex = 0;

  rows.forEach((row, rowIndex) => {
    const height = row.kind === "position" ? rowHeight : spurRowHeight;
    const y = top + height / 2;
    top += height;

    let onRoad: RoadNode[];
    if (row.kind === "position") {
      // Every position is centred on the same vertical axis: a singleton sits
      // dead on `centre`, and a fork spreads its alternates symmetrically
      // around it. That keeps same-level nodes in the same column (straight
      // connectors) instead of the road zigzagging left/right row to row.
      const count = Math.max(1, row.count);
      onRoad = Array.from({ length: count }, (_, skillIndex) => ({
        kind: "skill" as const,
        rowIndex,
        positionIndex,
        skillIndex,
        x: count === 1 ? centre : clamp(centre + (skillIndex - (count - 1) / 2) * branchSpread, nodeHalfWidth),
        y,
      }));
      positionIndex++;
      nodes.push(...onRoad);
    } else {
      const junction: RoadNode = { kind: "junction", rowIndex, x: centre, y };
      const story: RoadNode = {
        kind: "story",
        rowIndex,
        x: clamp(centre + (row.side === "left" ? -storyOffset : storyOffset), storyHalfWidth),
        y,
      };
      onRoad = [junction];
      nodes.push(junction, story);
      edges.push(edgeBetween("branch", junction, story));
    }

    // One straight segment per (node on the previous row) × (node on this
    // one). That single rule covers every case the content model allows: 1→1,
    // 1→N (fanning out into a fork), N→1 (merging back), and N→M.
    for (const from of previous) {
      for (const to of onRoad) edges.push(edgeBetween("main", from, to));
    }
    previous = onRoad;
  });

  return { nodes, edges, totalHeight: top };
}

function edgeBetween(kind: RoadEdge["kind"], from: RoadNode, to: RoadNode): RoadEdge {
  return {
    kind,
    d: `M ${from.x},${from.y} L ${to.x},${to.y}`,
    fromRowIndex: from.rowIndex,
    toRowIndex: to.rowIndex,
    fromPositionIndex: from.kind === "skill" ? from.positionIndex : null,
    toPositionIndex: to.kind === "skill" ? to.positionIndex : null,
    fromSkillIndex: from.kind === "skill" ? from.skillIndex : null,
    toSkillIndex: to.kind === "skill" ? to.skillIndex : null,
    x1: from.x,
    y1: from.y,
    x2: to.x,
    y2: to.y,
  };
}
