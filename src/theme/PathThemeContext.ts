// The swap point for culture-specific path skins. Hybrid on purpose: the TS
// half (PathTheme) carries what CSS can't express — layout numbers the SVG
// geometry needs as numbers, and the per-category icons — while the CSS half
// is a class that sets --path-* custom properties on a wrapper div, so pure
// styling stays in CSS Modules like everything else in this codebase.
//
// Mirrors auth/AuthContext.tsx, this repo's only other Context, with one
// deliberate difference: the default value is defaultPathTheme rather than
// null, because unlike a session there is always a sane fallback theme. That
// removes the null-check every consumer of AuthContext needs. PathPage still
// wraps explicitly with <PathThemeProvider> so the swap point is visible in
// the tree rather than implied.
//
// The context and its hook live here rather than beside the provider
// component for the reason auth/useAuth.ts is split out from
// auth/AuthContext.tsx: a module that exports both a component and a
// non-component breaks Fast Refresh (react/only-export-components).
import { createContext, useContext } from "react";
import { defaultPathTheme, type PathTheme } from "./defaultPathTheme";

export const PathThemeContext = createContext<PathTheme>(defaultPathTheme);

export function usePathTheme(): PathTheme {
  return useContext(PathThemeContext);
}
