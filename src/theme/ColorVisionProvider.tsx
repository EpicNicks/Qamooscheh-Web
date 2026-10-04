import { useLayoutEffect, type ReactNode } from "react";
import { useLocalAppPref } from "../hooks/useLocalAppPref";

/**
 * Writes the learner's color vision choice (localAppPrefs.colorVision, issue
 * #41) onto `:root` as `data-color-vision`, which index.css's retuned review
 * palettes and Exercise.module.css's tile marks key off. Left off entirely
 * for the default palette, so `[data-color-vision]` alone means "some
 * colorblind mode is on". On `:root` for the same reason FontProvider writes
 * there: portalled popovers inherit it too.
 */
export function ColorVisionProvider({ children }: { children: ReactNode }) {
  const [colorVision] = useLocalAppPref("colorVision", "default");

  useLayoutEffect(() => {
    const root = document.documentElement;
    if (colorVision === "default") delete root.dataset.colorVision;
    else root.dataset.colorVision = colorVision;
  }, [colorVision]);

  return children;
}
