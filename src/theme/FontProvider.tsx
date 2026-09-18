import { useLayoutEffect, type ReactNode } from "react";
import { useLocalAppPref } from "../hooks/useLocalAppPref";
import { resolveFontStack } from "../domain/fonts";

const CSS_PROPERTY: Record<"fa" | "ja" | "latin", string> = {
  fa: "--font-script-fa",
  ja: "--font-script-ja",
  // Overrides index.css's own --font-sans default directly — body already
  // reads --font-sans, so this is the one property that makes a Latin font
  // choice apply app-wide (English UI text and romanized course text alike)
  // rather than to a single component.
  latin: "--font-sans",
};

const CSS_SIZE_PROPERTY: Record<"fa" | "ja" | "latin", string> = {
  fa: "--font-size-script-fa",
  ja: "--font-size-script-ja",
  latin: "--font-size-script-latin",
};

/**
 * Writes a learner's chosen fonts (hooks/useFontPrefs.ts, domain/fonts.ts)
 * onto `:root` as CSS custom properties — the one place font PREFERENCE
 * turns into an actual rendered font, so every consumer (DirectionalText,
 * TypeInExercise, SpeakExercise, body's own --font-sans) just reads a
 * variable and never touches localAppPrefs directly.
 *
 * A side-effect-only wrapper (renders `children` unchanged) rather than
 * writing these inline on some layout element: the properties belong on
 * `:root` so components arbitrarily deep in the tree (a portalled popover,
 * for instance) inherit them too, which only a real `:root`/`documentElement`
 * write guarantees.
 */
export function FontProvider({ children }: { children: ReactNode }) {
  const [fontPrefs] = useLocalAppPref("fontPrefs", {
    fa: { family: null, sizePct: 100, custom: [] },
    ja: { family: null, sizePct: 100, custom: [] },
    latin: { family: null, sizePct: 100, custom: [] },
  });

  useLayoutEffect(() => {
    const root = document.documentElement.style;
    for (const script of ["fa", "ja", "latin"] as const) {
      root.setProperty(CSS_PROPERTY[script], resolveFontStack(script, fontPrefs[script].family));
      root.setProperty(CSS_SIZE_PROPERTY[script], `${fontPrefs[script].sizePct}%`);
    }
  }, [fontPrefs]);

  return children;
}
