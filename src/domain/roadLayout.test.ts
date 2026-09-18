import { describe, expect, it } from "vitest";
import { computeRoadLayout } from "./roadLayout";

const config = { rowHeight: 190, branchSpread: 110, logicalWidth: 320, nodeHalfWidth: 42 };

describe("computeRoadLayout", () => {
  it("centres a singleton position on logicalWidth / 2", () => {
    const layout = computeRoadLayout([1], config);
    expect(layout.nodes).toEqual([{ positionIndex: 0, skillIndex: 0, x: 160, y: 95 }]);
  });

  it("spreads a fork's alternates symmetrically about the centre", () => {
    const layout = computeRoadLayout([3], config);
    const xs = layout.nodes.map((n) => n.x);
    // Symmetric about 160: the middle alternate sits dead centre, the outer
    // two are equidistant on either side.
    expect(xs[1]).toBe(160);
    expect(160 - xs[0]).toBeCloseTo(xs[2] - 160);
    expect(xs[2] - xs[0]).toBeCloseTo(config.branchSpread * 2);
  });

  it("clamps outer nodes so they can't overhang the viewBox, however branchSpread is tuned", () => {
    // Deliberately wide enough to overhang the shipped theme's own bounds —
    // unreachable with defaultPathTheme's real numbers (its own doc comment
    // says the clamp never fires for that theme), exercised here instead via
    // a config that pushes it.
    const wide = { rowHeight: 190, branchSpread: 300, logicalWidth: 320, nodeHalfWidth: 120 };
    const layout = computeRoadLayout([2], wide);
    const xs = layout.nodes.map((n) => n.x).sort((a, b) => a - b);
    expect(xs).toEqual([120, 200]); // [nodeHalfWidth, logicalWidth - nodeHalfWidth]
  });

  it("produces totalHeight for 0, 1, and n positions", () => {
    expect(computeRoadLayout([], config).totalHeight).toBe(0);
    expect(computeRoadLayout([1], config).totalHeight).toBe(config.rowHeight); // topPadding * 2
    expect(computeRoadLayout([1, 1, 1], config).totalHeight).toBe(config.rowHeight + 2 * config.rowHeight);
  });

  it("draws one edge per pair of adjacent-position skills, matching the content-fork edge count", () => {
    // 1 -> 2 -> 1: 1*2 + 2*1 = 4 edges (fan out, then merge back).
    const layout = computeRoadLayout([1, 2, 1], config);
    expect(layout.edges).toHaveLength(4);
  });

  it("collapsing every position's count to 1 reduces the edge count to n - 1", () => {
    const collapsed = computeRoadLayout([1, 1, 1, 1], config);
    expect(collapsed.edges).toHaveLength(3);
  });
});
