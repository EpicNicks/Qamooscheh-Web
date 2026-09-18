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
//
// Each of those carries `/* keep in sync with src/theme/breakpoints.ts */`
// above its @media block.

/** Phone and tablet-portrait: drawer nav, icon navbar, collapsed forks, mobile road metrics. */
export const BREAKPOINT_MOBILE_PX = 768;

/** The matchMedia string every JS consumer passes to useMediaQuery. */
export const MEDIA_MOBILE = `(max-width: ${BREAKPOINT_MOBILE_PX}px)`;
