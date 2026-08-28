import { useEffect, useState } from "react";

/**
 * Tracks which physical keys (KeyboardEvent.code values, e.g. "KeyD") are
 * currently held down, via one window-level listener pair per mounted
 * keyboard. Lets a VirtualKey light up from real typing, not just tapping —
 * the point being to teach the layout by reflecting the learner's own
 * keystrokes back at them.
 */
export function usePhysicalKeyState(): Set<string> {
  const [downCodes, setDownCodes] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.repeat) return;
      setDownCodes((prev) => new Set(prev).add(event.code));
    }
    function onKeyUp(event: KeyboardEvent) {
      setDownCodes((prev) => {
        if (!prev.has(event.code)) return prev;
        const next = new Set(prev);
        next.delete(event.code);
        return next;
      });
    }
    // blur can strand a key "down" (e.g. alt-tabbing away mid-press) —
    // clearing on blur avoids a permanently-lit key.
    function onBlur() {
      setDownCodes(new Set());
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  return downCodes;
}
