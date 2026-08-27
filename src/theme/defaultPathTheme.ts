// The one theme this pass ships. Everything a culture-specific skin would
// want to change lives here or in the matching CSS module — the road geometry
// (SkillRoad/computeRoadLayout) and the list (SkillList) read all of it
// through PathThemeContext and hardcode none of it.
import type { ComponentType, ReactNode } from "react";
import type { SkillCategory } from "../domain/enums";
import type { RoadLayoutConfig } from "../domain/roadLayout";
import styles from "./defaultPathTheme.module.css";

export interface PathTheme {
  id: string;
  /** Scopes the --path-* custom properties; applied to the wrapper PathThemeProvider renders. */
  className: string;
  layout: RoadLayoutConfig;
  /** What each skill category's node shows. Previously a hardcoded map inside SkillNode. */
  icons: Record<SkillCategory, ReactNode>;
  /**
   * An optional decorative layer painted behind the road — where a
   * culture-specific skin would put its accent artwork (a Persian tile
   * pattern, a Japanese wave motif). Undefined means none, which is the
   * neutral default this pass ships.
   *
   * A component rather than a background-image custom property because the
   * interesting cases are inline SVG that has to scale with the road and
   * react to the theme's own colour tokens. It receives a className that
   * positions it; it should not position itself.
   */
  motif?: ComponentType<{ className?: string }>;
}

/**
 * Tuned to SkillNode's 84px card inside a 320-unit logical width:
 * `amplitude` and `branchSpread` are both small enough that no node's centre
 * comes within 42 logical units of either edge, so computeRoadLayout's clamp
 * never actually has to fire for this theme.
 */
export const defaultPathTheme: PathTheme = {
  id: "default",
  className: styles.theme,
  layout: {
    rowHeight: 190,
    amplitude: 90,
    branchSpread: 110,
    logicalWidth: 320,
  },
  icons: {
    standard: "●",
    story: "📖",
    conversation: "💬",
    song: "🎵",
  },
  // No motif: the default theme is deliberately neutral, and "none" is a
  // supported answer rather than a gap waiting for placeholder artwork.
  motif: undefined,
};
