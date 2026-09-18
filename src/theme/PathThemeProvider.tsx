import { type ReactNode, type Ref } from "react";
import { PathThemeContext } from "./PathThemeContext";
import { defaultPathTheme, type PathTheme } from "./defaultPathTheme";

/**
 * Supplies the active path theme, and applies the CSS Module class that
 * carries its --path-* custom properties to a wrapper the whole path renders
 * inside. Both halves travel together deliberately: a theme whose numbers came
 * from context but whose colours came from an unrelated wrapper would be a
 * theme only half-swapped.
 */
export function PathThemeProvider({
  theme = defaultPathTheme,
  children,
  containerRef,
}: {
  theme?: PathTheme;
  children: ReactNode;
  /** PathPage's own hook onto this wrapper — it measures the sticky header inside it (see PathPage's ResizeObserver) and needs a real DOM node to set --sticky-header-height on. Optional: nothing else this provider wraps has needed the node itself before. */
  containerRef?: Ref<HTMLDivElement>;
}) {
  return (
    <PathThemeContext value={theme}>
      <div ref={containerRef} className={theme.className}>
        {children}
      </div>
    </PathThemeContext>
  );
}
