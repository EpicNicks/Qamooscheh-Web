// Thin wrapper over the Web Speech API's speech synthesis
// (window.speechSynthesis / SpeechSynthesisUtterance) — every browser this
// app targets ships it natively, so it's what backs read-aloud playback
// wherever content has no real recorded audio file (today: everywhere —
// nothing in the content schema authors one yet). See hooks/usePhraseAudio.ts
// for the fallback-to-a-real-file logic; this module only knows how to speak.

export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/**
 * Voices load asynchronously in some browsers (Chrome populates the list
 * only after a `voiceschanged` event fires, once, post-startup) — calling
 * this before that has fired can legitimately return `[]`. Callers that
 * need a specific voice tolerate that by falling back to just setting
 * `utterance.lang`, which every implementation honors even with zero voices
 * loaded.
 */
function availableVoices(): SpeechSynthesisVoice[] {
  return isSpeechSynthesisSupported() ? window.speechSynthesis.getVoices() : [];
}

/** The best available voice for a BCP-47 tag — an exact match first, then any voice sharing the bare language subtag (e.g. "ja" for "ja-JP"), else null. */
export function pickVoice(speechLang: string): SpeechSynthesisVoice | null {
  const bareLang = speechLang.split("-")[0];
  const voices = availableVoices();
  return voices.find((v) => v.lang === speechLang) ?? voices.find((v) => v.lang.startsWith(bareLang)) ?? null;
}

export function hasVoiceFor(speechLang: string): boolean {
  return pickVoice(speechLang) != null;
}

/**
 * Subscribes to the browser's own "voice list changed" event — Chrome in
 * particular populates `getVoices()` asynchronously, firing this once after
 * startup, so a check made before that fires can read as "no voice" only
 * because the list hasn't loaded yet, not because the OS truly has none
 * installed. See hooks/useVoiceAvailability.ts, the only caller.
 */
export function onVoicesChanged(callback: () => void): () => void {
  if (!isSpeechSynthesisSupported()) return () => {};
  window.speechSynthesis.addEventListener("voiceschanged", callback);
  return () => window.speechSynthesis.removeEventListener("voiceschanged", callback);
}

/**
 * Speaks `text` in `speechLang`, cancelling anything already speaking first
 * — the Web Speech API queues utterances by default, and this player only
 * ever wants the most recent one. Returns a `stop` function; `onEnd` fires
 * exactly once, whether the utterance finished naturally, was stopped, or
 * failed, so a caller never has to distinguish those to know playback is over.
 */
export function speak(text: string, speechLang: string, onEnd: () => void): { stop: () => void } {
  if (!isSpeechSynthesisSupported()) {
    onEnd();
    return { stop: () => {} };
  }

  const synth = window.speechSynthesis;
  synth.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = speechLang;
  const voice = pickVoice(speechLang);
  if (voice) utterance.voice = voice;

  let ended = false;
  function finish() {
    if (ended) return;
    ended = true;
    onEnd();
  }
  utterance.onend = finish;
  utterance.onerror = finish;

  synth.speak(utterance);
  return { stop: () => synth.cancel() };
}
