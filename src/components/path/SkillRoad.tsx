import { computeRoadLayout } from "../../domain/roadLayout";
import type { PathPosition, PositionKey } from "../../domain/pathProgress";
import { usePathTheme } from "../../theme/PathThemeContext";
import { useIsMobile } from "../../hooks/useMediaQuery";
import { SkillNode } from "./SkillNode";
import { SkillGroupNode } from "./SkillGroupNode";
import styles from "./SkillRoad.module.css";

/**
 * `left` for a node centred at `pct`% of the container.
 *
 * The clamp is the load-bearing part, and it has to happen in CSS rather than
 * in computeRoadLayout: the layout's own clamp keeps a node's centre a fixed
 * number of LOGICAL units from the edge, but that many logical units is a
 * fraction of the logical width, and that same fraction of a container
 * narrower than the logical width is fewer REAL pixels than this offset
 * subtracts. Mixing the two on a small phone pushes `left` negative and hangs
 * the card off the edge. min()/max() resolve against the actual used width,
 * whatever it turns out to be, so this stays correct without SkillRoad ever
 * measuring the container.
 *
 * `--skill-node-width` (defaultPathTheme.module.css) is the one place the
 * node's real px width is stated — no JS constant duplicates it here, so a
 * skin can resize the card without touching this file.
 */
function nodeLeft(pct: number): string {
  return `max(0px, min(calc(100% - var(--skill-node-width)), calc(${pct}% - var(--skill-node-width) / 2)))`;
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
export function SkillRoad({
  positions,
  nextSkipTarget,
  placementTarget = null,
}: {
  positions: PathPosition[];
  nextSkipTarget: PositionKey | null;
  /** The single locked node (a future unit's own first standard position) that's clickable anyway, offering a placement test into it — see domain/pathProgress.ts's findNextUnitEntryTarget. Every other locked node stays plain/inert. */
  placementTarget?: PositionKey | null;
}) {
  const theme = usePathTheme();
  const isMobile = useIsMobile();
  // The phone variant when the theme supplies one; a skin that doesn't is
  // simply the same road at every width, which is a legitimate answer for a
  // skin. Picked here, not in PathThemeProvider — the provider's job is to
  // supply a theme value, and returning a different object per viewport
  // would break identity comparisons on an exported const.
  const layoutConfig = (isMobile && theme.mobileLayout) || theme.layout;
  const { logicalWidth } = layoutConfig;
  const Motif = theme.motif;

  // On a phone a forked position renders as ONE composite node
  // (SkillGroupNode) — an 84px card can't show real lesson titles legibly
  // for more than one skill on a narrow screen. The geometry module needs no
  // opinion about why: a collapsed fork is arithmetically a singleton, so it
  // is simply asked for one node at that position instead of N.
  const collapseForks = isMobile;
  const layout = computeRoadLayout(
    positions.map((p) => (collapseForks ? 1 : p.skills.length)),
    layoutConfig,
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
        const position = positions[node.positionIndex];
        const isGroup = collapseForks && position.skills.length > 1;
        const skill = position.skills[node.skillIndex];
        return (
          <div
            // Position-based, not skill-based: a group node has no single
            // skill key, and a skill-keyed list would remount the entire
            // road when the breakpoint is crossed.
            key={`${position.skills[0].unitKey}#${node.positionIndex}#${node.skillIndex}`}
            className={styles.nodeWrap}
            style={{ left: nodeLeft(pct(node.x)), top: `${node.y}px` }}
            // From the POSITION's status, not the skill's — there's at most
            // one "current" standard position across the whole journey, and
            // a collapsed fork has no per-skill node for PathPage's
            // scroll-to-current effect to find otherwise.
            data-current-node={position.status === "current" ? "" : undefined}
          >
            {isGroup ? (
              <SkillGroupNode position={position} nextSkipTarget={nextSkipTarget} />
            ) : (
              <SkillNode skill={skill} nextSkipTarget={nextSkipTarget} placementTarget={placementTarget} />
            )}
          </div>
        );
      })}
    </div>
  );
}
