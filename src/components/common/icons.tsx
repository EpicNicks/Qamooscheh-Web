// The handful of icons this app actually draws, inlined as plain SVG.
//
// These were previously two imports from @mui/icons-material, which drags in
// @mui/material and its @emotion peers — a large dependency tree for two
// glyphs, in an app that otherwise styles everything with CSS modules. The
// paths below are Material Symbols' own (24x24 viewBox), copied verbatim from
// the icons that were in use, so nothing about how they look changed.
//
// Sizing/colour follow the MUI SvgIcon convention they replace: `1em` square
// so the icon tracks the surrounding font-size, and `currentColor` so it
// picks up whatever the parent's `color` is (which is what the hover styles
// on .cog / .trigger rely on).

interface IconProps {
  /** Any CSS length. Defaults to `1em` — MUI's `fontSize="inherit"`. */
  size?: string;
  className?: string;
}

/** Material Symbols "Settings" (the cog). */
export function SettingsIcon({ size = "1em", className }: IconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      focusable="false"
      aria-hidden="true"
    >
      <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6" />
    </svg>
  );
}

/** Material Symbols "Flag" (outlined) — the report-an-issue trigger. */
export function FlagOutlinedIcon({ size = "1em", className }: IconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      focusable="false"
      aria-hidden="true"
    >
      <path d="m12.36 6 .4 2H18v6h-3.36l-.4-2H7V6zM14 4H5v17h2v-7h5.6l.4 2h7V6h-5.6z" />
    </svg>
  );
}
