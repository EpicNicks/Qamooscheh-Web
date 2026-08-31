import { computeRoadLayout } from "../../domain/roadLayout";
import type { PathPosition } from "../../domain/pathProgress";
import { usePathTheme } from "../../theme/PathThemeContext";
import { SkillNode } from "./SkillNode";
import styles from "./SkillRoad.module.css";

/** SkillNode's card width, and half of it — nodes are centred on their layout x. */
const NODE_WIDTH_PX = 84;
const NODE_HALF_WIDTH_PX = NODE_WIDTH_PX / 2;

/**
 * `left` for a node centred at `pct`% of the container.
 *
 * The clamp is the load-bearing part, and it has to happen in CSS rather than
 * in computeRoadLayout: the layout's own clamp keeps a node's centre 42
 * LOGICAL units from the edge, but 42 logical units is 13.1% of the logical
 * width, and 13.1% of a container narrower than 320px is fewer than the 42
 * REAL pixels this offset subtracts. Mixing the two on a small phone pushes
 * `left` negative and hangs the card off the edge. min()/max() resolve
 * against the actual used width, whatever it turns out to be, so this stays
 * correct without SkillRoad ever measuring the container.
 */
function nodeLeft(pct: number): string {
  return `max(0px, min(calc(100% - ${NODE_WIDTH_PX}px), calc(${pct}% - ${NODE_HALF_WIDTH_PX}px)))`;
}

/**
 * The straight, branching road of a unit's standard skills.
 *
 * Two layers over one geometry: an `<svg>` of connector lines painted
 * underneath, and one absolutely-positioned wrapper per skill holding an
 * otherwise-unmodified <SkillNode>. Both are driven by the same
 * computeRoadLayout output and the same logical width, so they scale together
 * — the SVG through its viewBox, the nodes through percentage `left` values —
 * and stay aligned at any container width without measuring anything.
 */
export function SkillRoad({ positions }: { positions: PathPosition[] }) {
  const theme = usePathTheme();
  const { logicalWidth } = theme.layout;
  const Motif = theme.motif;

  const layout = computeRoadLayout(
    positions.map((p) => p.skills.length),
    theme.layout,
  );

  if (positions.length === 0) return null;

  const pct = (x: number) => (x / logicalWidth) * 100;

  return (
    <div className={styles.road} style={{ height: `${layout.totalHeight}px` }}>
      {/* Behind everything, and inert: decoration, never a hit target. */}
      {Motif && <Motif className={styles.motif} />}

      <svg
        className={styles.connectors}
        viewBox={`0 0 ${logicalWidth} ${layout.totalHeight}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {layout.edges.map((edge) => {
          // An edge takes its look from where it LEADS: road already walked
          // strokes differently from road ahead.
          const status = positions[edge.toPositionIndex].status;
          return (
            <path
              key={`${edge.fromPositionIndex}-${edge.toPositionIndex}-${edge.d}`}
              className={[styles.edge, styles[status]].join(" ")}
              d={edge.d}
            />
          );
        })}
      </svg>

      {layout.nodes.map((node) => {
        const skill = positions[node.positionIndex].skills[node.skillIndex];
        return (
          <div
            key={`${skill.unitKey}/${skill.skillKey}`}
            className={styles.nodeWrap}
            style={{ left: nodeLeft(pct(node.x)), top: `${node.y}px` }}
            // Marks the one node PathPage scrolls to on load — there's at
            // most one "current" standard skill across the whole journey.
            data-current-node={skill.status === "current" ? "" : undefined}
          >
            <SkillNode skill={skill} />
          </div>
        );
      })}
    </div>
  );
}
