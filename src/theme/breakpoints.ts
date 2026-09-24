// The app's one responsive boundary. A media-query condition cannot read a CSS
// custom property and this repo doesn't carry postcss-preset-env (no
// @custom-media), so the 768px literal is necessarily repeated in CSS. Every
// place it appears is listed below — change all of them together:
//
//   src/components/layout/AppShell.module.css
//   src/components/layout/Sidebar.module.css
//   src/components/layout/NavDrawer.module.css
//   src/components/layout/CourseSwitcher.module.css
//   src/theme/defaultPathTheme.module.css
//   src/components/path/SkillGroupModal.module.css
//   src/components/lesson/keyboard/Keyboard.module.css
//   src/components/lesson/PersianKeyboard.module.css
//
// Each of those carries `/* keep in sync with src/theme/breakpoints.ts */`
// above its @media block.

/** Phone and tablet-portrait: drawer nav, icon navbar, collapsed forks, mobile road metrics. */
export const BREAKPOINT_MOBILE_PX = 768;

/** The matchMedia string every JS consumer passes to useMediaQuery. */
export const MEDIA_MOBILE = `(max-width: ${BREAKPOINT_MOBILE_PX}px)`;

/**
 * Desktop and landscape-tablet: on-screen keyboards switch from a
 * mobile-portrait, edge-to-edge condensed shape to a naturally-proportioned,
 * staggered one (see Keyboard.module.css/PersianKeyboard.module.css) — and,
 * for the phonetic/native Persian keyboards, from a 3-row layout with
 * space/shift/ZWNJ/backspace folded into the letter rows to a dedicated 4th
 * utility row. Same 769px boundary as MEDIA_MOBILE plus a min-aspect-ratio
 * so a tablet held in portrait still gets the condensed/3-row mobile shape.
 * The two CSS files above hardcode this same condition (see the file header
 * above) — keep it in sync with them too, not just with BREAKPOINT_MOBILE_PX.
 */
export const MEDIA_KEYBOARD_WIDE = `(min-width: ${BREAKPOINT_MOBILE_PX + 1}px) and (min-aspect-ratio: 1/1)`;
