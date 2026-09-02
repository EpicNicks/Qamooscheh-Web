// Whether the browser currently has a matching TTS voice for a language —
// reactive because the voice list can populate asynchronously after mount
// (domain/tts.ts's onVoicesChanged), so a check made on first render can
// legitimately flip from "unavailable" to "available" a moment later.
import { useEffect, useState } from "react";
import { hasVoiceFor, onVoicesChanged } from "../domain/tts";

export function useVoiceAvailability(speechLang: string | null): boolean {
  const [available, setAvailable] = useState(() => (speechLang ? hasVoiceFor(speechLang) : false));
  // The language this render's `available` was actually computed for — a
  // plain render-time re-seed (matching useStarredLexemes.ts's own pattern)
  // when `speechLang` changes, rather than a useEffect just to recompute a
  // value that's already derivable during render.
  const [checkedFor, setCheckedFor] = useState(speechLang);

  if (speechLang !== checkedFor) {
    setCheckedFor(speechLang);
    setAvailable(speechLang ? hasVoiceFor(speechLang) : false);
  }

  // The one thing that IS synchronizing with an external system: the
  // browser loading its voice list asynchronously after mount, with no
  // render-time signal of its own — this is what onVoicesChanged exists for.
  useEffect(() => {
    if (!speechLang) return;
    return onVoicesChanged(() => setAvailable(hasVoiceFor(speechLang)));
  }, [speechLang]);

  return available;
}
