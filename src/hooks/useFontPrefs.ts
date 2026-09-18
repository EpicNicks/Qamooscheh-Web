// Same shape as useKeyboardInputMethod.ts for a different per-script local
// setting — see localAppPrefs.ts's own doc on fontPrefs for why this stays
// local rather than joining user_prefs.
import { useLocalAppPref } from "./useLocalAppPref";
import type { FontScript } from "../domain/fonts";

function signedOutDefault(): { family: string | null; sizePct: number; custom: string[] } {
  return { family: null, sizePct: 100, custom: [] };
}

export function useFontPref(script: FontScript) {
  const [prefs, setPrefs] = useLocalAppPref("fontPrefs", {
    fa: signedOutDefault(),
    ja: signedOutDefault(),
    latin: signedOutDefault(),
  });

  function update(patch: Partial<{ family: string | null; sizePct: number; custom: string[] }>) {
    // Written back whole: the stored field holds every script's choice, and
    // only this one script's entry is being replaced.
    setPrefs({ ...prefs, [script]: { ...prefs[script], ...patch } });
  }

  return { ...prefs[script], update };
}
