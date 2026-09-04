// Same shape as useShowFurigana.ts/useSkipConfirmation.ts: a thin wrapper
// over lib/localAppPrefs.ts for one specific local (not server-synced)
// setting, reading it through useLocalAppPref so every mounted reader
// re-renders when ANY of them changes it — the language-settings popover's
// keyboard toggle has to switch the keyboard on the lesson page underneath it
// immediately, not only once that page happens to remount.
import { useLocalAppPref } from "./useLocalAppPref";
import type { KeyboardInputMethod } from "../lib/localAppPrefs";

/** Only ever used signed out, where there's no per-user blob to read — mirrors localAppPrefs.ts's own DEFAULTS for this field. */
const SIGNED_OUT_DEFAULT: KeyboardInputMethod = { fa: "layout", ja: "phonetic" };

export function useKeyboardInputMethod<L extends "fa" | "ja">(language: L) {
  const [methods, setMethods] = useLocalAppPref("keyboardInputMethod", SIGNED_OUT_DEFAULT);

  function setInputMethod(next: KeyboardInputMethod[L]) {
    // Written back whole: the stored field holds every language's choice, and
    // only this one language's entry is being replaced.
    setMethods({ ...methods, [language]: next });
  }

  return { method: methods[language], setInputMethod };
}
