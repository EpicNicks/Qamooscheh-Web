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
  /**
   * Road metrics for the phone/tablet-portrait breakpoint
   * (theme/breakpoints.ts). Optional: a skin that doesn't supply one just
   * uses `layout` everywhere.
   */
  mobileLayout?: RoadLayoutConfig;
  /** What each skill category's node shows. Previously a hardcoded map inside SkillNode. `null` shows no icon, leaving the card to its title. */
  icons: Record<SkillCategory, ReactNode>;
  /**
   * A symbol per tag id (themes.json), shown with a lesson tile's title on a
   * phone for the lesson's main tag. A tag missing here borrows its nearest
   * ancestor's (domain/mainTag.ts), so covering the roots is enough; a tag
   * with no symbol anywhere up its chain just shows none.
   */
  tagSymbols: Record<string, string>;
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
 * Tuned to SkillNode's 100px square card (--skill-node-width, defaultPathTheme.module.css)
 * inside a 320-unit logical width: `branchSpread` is small enough that no
 * node's centre comes within 50 logical units of either edge, so
 * computeRoadLayout's clamp never actually has to fire for this theme.
 *
 * `mobileLayout` lowers `rowHeight` (more of the road fits above the fold on
 * a phone) and `nodeHalfWidth` to match the phone's 84px tile
 * (--skill-node-width in the module's @media block) — `logicalWidth` is a
 * coordinate space, not a size, so changing it alone would change nothing
 * visually; only the RATIOS `branchSpread/logicalWidth` and
 * `nodeHalfWidth/logicalWidth` matter. `branchSpread`/`nodeHalfWidth`
 * are restated (not omitted) so a future skin can't lose them by forgetting
 * `mobileLayout` inherits nothing from `layout`.
 */
export const defaultPathTheme: PathTheme = {
  id: "default",
  className: styles.theme,
  layout: {
    rowHeight: 190,
    spurRowHeight: 130,
    branchSpread: 110,
    logicalWidth: 320,
    nodeHalfWidth: 50,
    // Story nodes are 84px round (--story-node-width): 42 either side of a
    // lane 110 units out, which on a 720px column clears a 100px lesson tile
    // by a wide margin and stays inside the edge.
    storyOffset: 110,
    storyHalfWidth: 42,
  },
  // On a phone the lesson tile is 84px (--skill-node-width) and the story
  // node 72px, so the horizontal branch stays visible between them.
  mobileLayout: {
    rowHeight: 150,
    spurRowHeight: 108,
    branchSpread: 108,
    logicalWidth: 320,
    nodeHalfWidth: 42,
    storyOffset: 110,
    storyHalfWidth: 36,
  },
  icons: {
    // No bullet: an ordinary lesson is the default, so its card is just its title.
    standard: null,
    story: "📖",
    conversation: "💬",
    song: "🎵",
  },
  tagSymbols: {
    // Roots of the tag tree (ThemeTaxonomy.cs) first — they are every other tag's fallback.
    Grammar: "✍️",
    Time: "⏰",
    People: "👥",
    Places: "📍",
    Life: "🌿",
    Greetings: "👋",
    Numbers: "🔢",
    // Grammar
    Questions: "❓",
    Tenses: "🕰️",
    PastTense: "⏪",
    PresentTense: "▶️",
    FutureTense: "⏩",
    Possession: "🤝",
    Demonstratives: "👉",
    Modals: "💭",
    // Time
    Clock: "🕒",
    Calendar: "📅",
    Routine: "🔁",
    // People
    Family: "👪",
    Personality: "🙂",
    Feelings: "💗",
    Romance: "💞",
    Work: "💼",
    // Places
    Home: "🏠",
    Directions: "🧭",
    Travel: "✈️",
    Government: "🏛️",
    // Life
    Food: "🍽️",
    Restaurant: "🍴",
    Cooking: "🍳",
    Health: "🩺",
    Clothing: "👕",
    Shopping: "🛍️",
    Colors: "🎨",
    Weather: "⛅",
    Hobbies: "🎯",
    Leisure: "🎲",
    Culture: "🎭",
    Holidays: "🎉",
    Communication: "💬",
    Nature: "🌳",
    Animals: "🐾",
  },
  // No motif: the default theme is deliberately neutral, and "none" is a
  // supported answer rather than a gap waiting for placeholder artwork.
  motif: undefined,
};
