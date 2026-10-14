import { describe, expect, it } from "vitest";
import { computeRoadLayout, type RoadRowInput } from "./roadLayout";

const config = {
  rowHeight: 190,
  spurRowHeight: 130,
  branchSpread: 110,
  logicalWidth: 320,
  nodeHalfWidth: 42,
  storyOffset: 110,
  storyHalfWidth: 42,
};

const positions = (...counts: number[]): RoadRowInput[] => counts.map((count) => ({ kind: "position", count }));
const right: RoadRowInput = { kind: "story", side: "right" };
const left: RoadRowInput = { kind: "story", side: "left" };

describe("computeRoadLayout", () => {
  it("centres a singleton position on logicalWidth / 2", () => {
    const layout = computeRoadLayout(positions(1), config);
    expect(layout.nodes).toEqual([{ kind: "skill", rowIndex: 0, positionIndex: 0, skillIndex: 0, x: 160, y: 95 }]);
  });

  it("spreads a fork's alternates symmetrically about the centre", () => {
    const layout = computeRoadLayout(positions(3), config);
    const xs = layout.nodes.map((n) => n.x);
    // Symmetric about 160: the middle alternate sits dead centre, the outer
    // two are equidistant on either side.
    expect(xs[1]).toBe(160);
    expect(160 - xs[0]).toBeCloseTo(xs[2] - 160);
    expect(xs[2] - xs[0]).toBeCloseTo(config.branchSpread * 2);
  });

  it("clamps outer nodes so they can't overhang the viewBox, however branchSpread is tuned", () => {
    // Deliberately wide enough to overhang the shipped theme's own bounds,
    // which its doc comment says never happens with its real numbers, so it
    // is exercised here via a config that pushes it.
    const wide = { ...config, branchSpread: 300, nodeHalfWidth: 120 };
    const layout = computeRoadLayout(positions(2), wide);
    const xs = layout.nodes.map((n) => n.x).sort((a, b) => a - b);
    expect(xs).toEqual([120, 200]); // [nodeHalfWidth, logicalWidth - nodeHalfWidth]
  });

  it("produces totalHeight for 0, 1, and n positions", () => {
    expect(computeRoadLayout([], config).totalHeight).toBe(0);
    expect(computeRoadLayout(positions(1), config).totalHeight).toBe(config.rowHeight);
    expect(computeRoadLayout(positions(1, 1, 1), config).totalHeight).toBe(3 * config.rowHeight);
  });

  it("draws one edge per pair of adjacent-position skills, matching the content-fork edge count", () => {
    // 1 -> 2 -> 1: 1*2 + 2*1 = 4 edges (fan out, then merge back).
    expect(computeRoadLayout(positions(1, 2, 1), config).edges).toHaveLength(4);
  });

  it("collapsing every position's count to 1 reduces the edge count to n - 1", () => {
    expect(computeRoadLayout(positions(1, 1, 1, 1), config).edges).toHaveLength(3);
  });

  describe("story rows", () => {
    it("adds nothing to a road with no stories", () => {
      const layout = computeRoadLayout(positions(1, 2, 1), config);
      expect(layout.nodes.every((n) => n.kind === "skill")).toBe(true);
      expect(layout.edges.every((e) => e.kind === "main")).toBe(true);
    });

    it("puts the junction on the centre axis and the story to the chosen side", () => {
      const layout = computeRoadLayout([...positions(1), right, left], config);
      const junctions = layout.nodes.filter((n) => n.kind === "junction");
      const stories = layout.nodes.filter((n) => n.kind === "story");
      expect(junctions.map((n) => n.x)).toEqual([160, 160]);
      expect(stories.map((n) => n.x)).toEqual([270, 50]);
      // Same height as the junction it hangs off, so the connector is horizontal.
      expect(stories.map((n) => n.y)).toEqual(junctions.map((n) => n.y));
    });

    it("stacks a shorter row for each story and extends totalHeight by it", () => {
      const layout = computeRoadLayout([...positions(1, 1), right, right], config);
      expect(layout.totalHeight).toBe(2 * config.rowHeight + 2 * config.spurRowHeight);
      const junctionYs = layout.nodes.filter((n) => n.kind === "junction").map((n) => n.y);
      expect(junctionYs).toEqual([2 * 190 + 65, 2 * 190 + 130 + 65]);
    });

    it("runs the road through the junction and branches one horizontal edge out to the story", () => {
      const layout = computeRoadLayout([...positions(1), right, ...positions(1)], config);
      expect(layout.edges.map((e) => [e.kind, e.fromRowIndex, e.toRowIndex])).toEqual([
        ["branch", 1, 1],
        ["main", 0, 1],
        ["main", 1, 2],
      ]);
      const branch = layout.edges[0];
      expect(branch.y1).toBe(branch.y2);
      expect(branch.fromPositionIndex).toBeNull();
    });

    it("fans a fork into the junction after it and out again to the next position", () => {
      // 2 -> story -> 2: two edges in, two edges out, one branch.
      const layout = computeRoadLayout([...positions(2), left, ...positions(2)], config);
      expect(layout.edges.filter((e) => e.kind === "main")).toHaveLength(4);
      const [into] = layout.edges.filter((e) => e.kind === "main");
      expect(into.fromPositionIndex).toBe(0);
      expect(into.toPositionIndex).toBeNull();
    });

    it("numbers position rows without counting story rows", () => {
      const layout = computeRoadLayout([...positions(1), right, ...positions(1)], config);
      const skills = layout.nodes.filter((n) => n.kind === "skill");
      expect(skills.map((n) => (n.kind === "skill" ? n.positionIndex : -1))).toEqual([0, 1]);
    });

    it("starts a road with a story before the first lesson and ends one on a story", () => {
      const first = computeRoadLayout([left, ...positions(1)], config);
      expect(first.edges.filter((e) => e.kind === "main")).toHaveLength(1);
      const last = computeRoadLayout([...positions(1), right], config);
      expect(last.edges.filter((e) => e.kind === "main")).toHaveLength(1);
    });

    it("clamps the story lane inside the viewBox", () => {
      const far = { ...config, storyOffset: 300 };
      const xs = computeRoadLayout([left, right], far)
        .nodes.filter((n) => n.kind === "story")
        .map((n) => n.x);
      expect(xs).toEqual([42, 278]);
    });
  });
});
