import { type ReactNode } from "react";
import { PathThemeContext } from "./PathThemeContext";
import { defaultPathTheme, type PathTheme } from "./defaultPathTheme";

/**
 * Supplies the active path theme, and applies the CSS Module class that
 * carries its --path-* custom properties to a wrapper the whole path renders
 * inside. Both halves travel together deliberately: a theme whose numbers came
 * from context but whose colours came from an unrelated wrapper would be a
 * theme only half-swapped.
 */
export function PathThemeProvider({ theme = defaultPathTheme, children }: { theme?: PathTheme; children: ReactNode }) {
  return (
    <PathThemeContext value={theme}>
      <div className={theme.className}>{children}</div>
    </PathThemeContext>
  );
}
