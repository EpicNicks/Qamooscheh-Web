// Same shape as useSkipConfirmation.ts: a thin wrapper over
// lib/localAppPrefs.ts for one specific local (not server-synced) setting.
import { useState } from "react";
import { useAuth } from "../auth/useAuth";
import { loadLocalAppPrefs, saveLocalAppPrefs, type KeyboardInputMethod } from "../lib/localAppPrefs";

export function useKeyboardInputMethod<L extends "fa" | "ja">(language: L) {
  const { userId } = useAuth();
  const [method, setMethod] = useState<KeyboardInputMethod[L]>(
    () => (userId ? loadLocalAppPrefs(userId).keyboardInputMethod[language] : (language === "fa" ? "layout" : "phonetic")) as KeyboardInputMethod[L],
  );

  function setInputMethod(next: KeyboardInputMethod[L]) {
    setMethod(next);
    if (!userId) return;
    const current = loadLocalAppPrefs(userId).keyboardInputMethod;
    saveLocalAppPrefs(userId, { keyboardInputMethod: { ...current, [language]: next } });
  }

  return { method, setInputMethod };
}
