/**
 * Animates `element` as though it grew out of `originRect` (or shrank back
 * into it, with `direction: "reverse"`). Returns null — and animates
 * nothing — when the user has asked for reduced motion or there's no origin
 * to grow from, so every caller's fallback is simply "it appears/disappears
 * instantly".
 *
 * The scale is UNIFORM and clamped, not the true width/height ratio. An 84px
 * node growing into a ~480x400 dialog is a 0.18x/0.21x non-uniform scale,
 * which visibly squashes the text inside for the whole animation; countering
 * that needs an inverse-scaled inner wrapper. A single clamped factor reads
 * as "it came from there" with none of that machinery.
 */
export function flipFromOrigin(
  element: HTMLElement,
  originRect: DOMRect | null,
  opts?: { direction?: "normal" | "reverse"; duration?: number },
): Animation | null {
  if (!originRect || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return null;

  const to = element.getBoundingClientRect();
  const dx = originRect.left + originRect.width / 2 - (to.left + to.width / 2);
  const dy = originRect.top + originRect.height / 2 - (to.top + to.height / 2);
  const scale = Math.min(0.5, Math.max(0.3, originRect.width / to.width));

  return element.animate(
    [
      { transform: `translate(${dx}px, ${dy}px) scale(${scale})`, opacity: 0 },
      { transform: "none", opacity: 1 },
    ],
    {
      duration: opts?.duration ?? 220,
      easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
      fill: "none",
      direction: opts?.direction ?? "normal",
    },
  );
}
