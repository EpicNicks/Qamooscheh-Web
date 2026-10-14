import { computeRoadLayout } from "../../domain/roadLayout";
import { buildRoadRows, type RoadRow } from "../../domain/roadRows";
import type { PathUnit, PositionKey } from "../../domain/pathProgress";
import { forkLineKind } from "../../domain/forkLines";
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
 * `--skill-node-width` / `--story-node-width` (defaultPathTheme.module.css)
 * are the one place a node's real px width is stated — no JS constant
 * duplicates it here, so a skin can resize the card without touching this
 * file.
 */
function nodeLeft(pct: number, widthVar: "--skill-node-width" | "--story-node-width"): string {
  return `max(0px, min(calc(100% - var(${widthVar})), calc(${pct}% - var(${widthVar}) / 2)))`;
}

/** Logical units between the parallel lines of a collapsed fork's connector; wider than the stroke so they read as separate. */
const FORK_LINE_SPACING = 9;

type StoryRow = Extract<RoadRow, { kind: "story" }>;

/**
 * The straight, branching road of a unit's standard skills, with each of its
 * stories hung off it: a junction dot on the road and a horizontal connector
 * out to a round story node on either side (issue #60).
 *
 * Two layers over one geometry: an `<svg>` of connector lines painted
 * underneath, and one absolutely-positioned wrapper per skill holding an
 * otherwise-unmodified <SkillNode>. Both are driven by the same
 * computeRoadLayout output and the same logical width, so they scale together
 * — the SVG through its viewBox, the nodes through percentage `left` values —
 * and stay aligned at any container width without measuring anything.
 */
export function SkillRoad({ unit, nextSkipTarget }: { unit: PathUnit; nextSkipTarget: PositionKey | null }) {
  const positions = unit.standardPositions;
  const rows = buildRoadRows(unit);
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
  // (SkillGroupNode) — a 100px card can't show real lesson titles legibly
  // for more than one skill on a narrow screen. The geometry module needs no
  // opinion about why: a collapsed fork is arithmetically a singleton, so it
  // is simply asked for one node at that position instead of N.
  const collapseForks = isMobile;
  const layout = computeRoadLayout(
    rows.map((row) =>
      row.kind === "position"
        ? { kind: "position", count: collapseForks ? 1 : positions[row.positionIndex].skills.length }
        : { kind: "story", side: row.side },
    ),
    layoutConfig,
  );

  if (rows.length === 0) return null;

  const pct = (x: number) => (x / logicalWidth) * 100;
  const storyRow = (rowIndex: number) => rows[rowIndex] as StoryRow;
  // A story's own state: grey locked, blue open, green done.
  const storyLineKind = (rowIndex: number) =>
    forkLineKind(storyRow(rowIndex).skill.roadStatus, storyRow(rowIndex).skill.completed, false);
  // A road edge into a junction looks as the direct edge to the next position
  // would; at the road's end there is no next position, so it takes the story's.
  const throughClass = (junctionRowIndex: number) => {
    const next = rows.slice(junctionRowIndex + 1).find((r) => r.kind === "position");
    return next?.kind === "position" ? styles[positions[next.positionIndex].status] : styles[storyLineKind(junctionRowIndex)];
  };

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
          const key = `${edge.kind}-${edge.fromRowIndex}-${edge.toRowIndex}-${edge.d}`;

          // The connector out to a story takes that story's own state.
          if (edge.kind === "branch") {
            return <path key={key} className={[styles.edge, styles[storyLineKind(edge.toRowIndex)]].join(" ")} d={edge.d} />;
          }

          // Null at a junction: there the road passes through a dot, not a lesson.
          const to = edge.toPositionIndex == null ? null : positions[edge.toPositionIndex];
          const from = edge.fromPositionIndex == null ? null : positions[edge.fromPositionIndex];

          if (collapseForks) {
            // The fork this connector stands for (entering one wins over
            // leaving one): one line per lesson, left to right in lesson
            // order, each in that lesson's own state.
            const fork = [to, from].find((p) => p != null && p.skills.length > 1);
            if (fork) {
              const leaving = fork !== to;
              return fork.skills.map((s, i) => {
                const dx = (i - (fork.skills.length - 1) / 2) * FORK_LINE_SPACING;
                return (
                  <path
                    key={`${key}#${i}`}
                    className={[styles.edge, styles[forkLineKind(fork.status, s.completed, leaving)]].join(" ")}
                    d={`M ${edge.x1 + dx},${edge.y1} L ${edge.x2 + dx},${edge.y2}`}
                  />
                );
              });
            }
          }

          if (to == null) {
            return <path key={key} className={[styles.edge, throughClass(edge.toRowIndex)].join(" ")} d={edge.d} />;
          }

          // An edge takes its look from where it LEADS: road already walked
          // strokes differently from road ahead — except one leading to a
          // fork alternate still to do, which is blue.
          const target = to.skills[edge.toSkillIndex!];
          const open = !collapseForks && to.skills.length > 1 && to.status !== "locked" && !target.completed;
          return <path key={key} className={[styles.edge, open ? styles.open : styles[to.status]].join(" ")} d={edge.d} />;
        })}
      </svg>

      {layout.nodes.map((node) => {
        if (node.kind === "junction") {
          // An HTML dot rather than an SVG circle: the SVG is stretched
          // non-uniformly (preserveAspectRatio="none") and would squash it.
          return (
            <span
              key={`${unit.unitKey}#junction#${storyRow(node.rowIndex).skill.skillKey}`}
              className={[styles.junction, styles[`junction_${storyLineKind(node.rowIndex)}`]].join(" ")}
              style={{ left: `${pct(node.x)}%`, top: `${node.y}px` }}
              aria-hidden="true"
            />
          );
        }

        if (node.kind === "story") {
          // Never `data-current-node`: a story does not move the cursor, so
          // scroll-to-current and the jump button ignore it.
          const { skill } = storyRow(node.rowIndex);
          return (
            <div
              key={`${unit.unitKey}#story#${skill.skillKey}`}
              className={styles.nodeWrap}
              style={{ left: nodeLeft(pct(node.x), "--story-node-width"), top: `${node.y}px` }}
            >
              <SkillNode skill={skill} layout="story" />
            </div>
          );
        }

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
            style={{ left: nodeLeft(pct(node.x), "--skill-node-width"), top: `${node.y}px` }}
            // From the POSITION's status, not the skill's — there's at most
            // one "current" standard position across the whole journey, and
            // a collapsed fork has no per-skill node for PathPage's
            // scroll-to-current effect to find otherwise.
            data-current-node={position.status === "current" ? "" : undefined}
          >
            {isGroup ? (
              <SkillGroupNode position={position} nextSkipTarget={nextSkipTarget} />
            ) : (
              <SkillNode skill={skill} nextSkipTarget={nextSkipTarget} markCompleted={position.skills.length > 1} siblings={position.skills} />
            )}
          </div>
        );
      })}
    </div>
  );
}
