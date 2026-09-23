import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import { createPortal } from "react-dom";
import { Button } from "../common/Button";
import styles from "./LessonStartPopover.module.css";

/** Gap between the popover's bottom edge and the node's top edge — keeps the tapped tile fully visible underneath, rather than the popover touching or overlapping it. */
const VERTICAL_OFFSET_PX = 12;

/**
 * Widens the above/below flip boundary so a node parked right at the edge
 * doesn't flip back and forth on every pixel of scroll — the standard
 * hysteresis fix for a single hard threshold. Only guards the "below" ->
 * "above" direction (see the flip effect below): flipping down still happens
 * the instant space runs out, since there's no risk of oscillating on the way
 * down.
 */
const FLIP_HYSTERESIS_PX = 24;

/** Must match LessonStartPopover.module.css's `.popover` max-width. */
const MAX_WIDTH_PX = 240;

/** Breathing room kept between the popover and either side of the viewport. */
const EDGE_GUTTER_PX = 8;

/**
 * The popover is centred on its node (`translateX(-50%)`), and a node parked
 * at the right-hand end of the road sits close enough to the edge that half
 * the popover would hang off it — invisible, since it's `position: fixed` and
 * so can't be scrolled to. Clamping the centre point to a band half a
 * max-width in from each side keeps the whole popover on screen at any
 * viewport width. MAX_WIDTH_PX is used rather than the measured width so this
 * needs no extra layout pass; a popover narrower than the cap simply ends up
 * slightly further from the edge than it strictly had to be.
 */
function clampedCenterX(center: number): number {
  const half = MAX_WIDTH_PX / 2 + EDGE_GUTTER_PX;
  const rightLimit = window.innerWidth - half;
  // On a viewport too narrow for even the clamped band, centring is the least
  // bad answer — `max` would otherwise push it off the right instead.
  if (rightLimit <= half) return window.innerWidth / 2;
  return Math.min(Math.max(center, half), rightLimit);
}

interface LessonStartPopoverProps {
  /** The tapped node itself — its position is re-measured on every scroll/resize so the popover tracks it instead of freezing at click-time coordinates. */
  anchorRef: RefObject<HTMLElement | null>;
  /** "Start lesson" for the current skill, "Practice" for a past one being revisited, "Take the placement test" for a future unit's entry node (SkillNode's placement variant) — see SkillNode. */
  primaryLabel: string;
  onPrimary: () => void;
  /** Opens the Deep Dive chooser modal — only offered on a standard-category skill tagged with at least one theme (useSkillActions.hasDeepDive). */
  onDeepDive?: () => void;
  /** Only ever offered on the current skill, and only when there's a position ahead to test into — see domain/pathProgress.ts's findNextStandardTarget. A skill already passed has nothing left to test out of. */
  onSkip?: () => void;
  /** Omitted by the placement variant: a locked future unit's node offers only the one placement-test action, not Start/Practice/Review-vocab. */
  onReviewVocabulary?: () => void;
  /** A line of explanatory copy above the buttons — the placement variant's only use, since jumping past a whole unit on one attempt (no retries) deserves a beat of "here's what happens" before the tap that starts it. */
  description?: string;
  onClose: () => void;
}

/**
 * A small popover hovering directly above the tapped lesson node,
 * Duolingo-style — offset up by VERTICAL_OFFSET_PX so the node itself stays
 * fully visible underneath — or below it, with the same offset, when the
 * node sits too close to the top of the viewport for that to fit. Offers a
 * primary action (Start or Practice,
 * see SkillNode) alongside Skip (test out of the current lesson — see
 * PathPage's use of findNextStandardTarget) and Review vocabulary (browse
 * every lexeme in the course, whichever node this was opened from — the
 * vocab screen is course-wide, not lesson-specific) instead of jumping
 * straight into a lesson/practice the moment a node is tapped.
 *
 * Rendered through a portal into document.body rather than in place:
 * SkillRoad.module.css's `.nodeWrap` (this popover's DOM ancestor otherwise)
 * carries `transform: translateY(-50%)` to centre a node on its curve, and a
 * transformed ancestor becomes the containing block for any `position:
 * fixed` descendant in every modern browser — so without the portal, `top`/
 * `bottom`/`left` below would resolve against that 84px node box instead of
 * the viewport, not against where anchorRect was actually measured.
 */
export function LessonStartPopover({
  anchorRef,
  primaryLabel,
  onPrimary,
  onDeepDive,
  onSkip,
  onReviewVocabulary,
  description,
  onClose,
}: LessonStartPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  // Defaults to opening upward (the common case — most nodes aren't near the
  // very top of the viewport); flipped to "below" post-render below when that
  // would clip it.
  const [placement, setPlacement] = useState<"above" | "below">("above");

  // Re-measure on every scroll (capture phase, so a scroll on the path's own
  // scroll container — not just the window — is caught too) and resize,
  // rather than freezing the rect from the click that opened this popover.
  // The road scrolls independently of the window, so without this the
  // popover would drift away from the node the moment the learner scrolled.
  useLayoutEffect(() => {
    function measure() {
      setAnchorRect(anchorRef.current?.getBoundingClientRect() ?? null);
    }
    measure();
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [anchorRef]);

  // The popover's own last-measured height, kept across placement flips.
  // Refreshed after every render (not just anchorRect changes) since it's the
  // one piece the flip decision below needs and can't get any other way
  // without a height guess.
  const popoverHeightRef = useRef<number | null>(null);
  useLayoutEffect(() => {
    if (popoverRef.current) popoverHeightRef.current = popoverRef.current.getBoundingClientRect().height;
  });

  // Flips to below the node when opening upward would clip the popover
  // against the top of the viewport (a node near the top of the road, or a
  // short window), and back to above once there's clearly room again.
  //
  // Decided from anchorRect + the cached height rather than by checking
  // whether the CURRENTLY rendered placement happens to clip: that approach
  // (this component's first cut) only works one way — once flipped "below",
  // the popover's own rendered top is anchor.bottom + gap, which is never
  // negative and says nothing about whether "above" would now fit, so it
  // could never flip back. Worse, right at the boundary it could toggle every
  // scroll tick, each toggle forcing an extra render/commit that painted
  // before settling — the visible flicker while scrolling with the popover
  // open. Computing both directions from the same two numbers up front
  // avoids both problems in one pass.
  useLayoutEffect(() => {
    if (!anchorRect) return;
    const height = popoverHeightRef.current;
    if (height == null) return;
    const spaceAbove = anchorRect.top - VERTICAL_OFFSET_PX;
    setPlacement((current) => {
      if (current === "above" && spaceAbove < height) return "below";
      if (current === "below" && spaceAbove > height + FLIP_HYSTERESIS_PX) return "above";
      return current;
    });
  }, [anchorRect]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    function onPointerDown(event: PointerEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) onClose();
    }
    // Capture phase so a tap on another skill node closes this popover
    // before that node's own click handler runs, rather than racing it.
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [onClose]);

  // Open focused on the primary action, and hand focus back to whatever
  // opened this (the tapped skill node) on close — this popover only exists
  // while it's open, so mount/unmount is open/close. Without the return, a
  // keyboard user who presses Escape is left with focus on nothing and has to
  // Tab from the top of the document to reach the road again. A node that's
  // since been unmounted (the popover closed by starting the lesson, which
  // navigates away) simply can't take focus, which is harmless.
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    popoverRef.current?.querySelector<HTMLElement>("button")?.focus();
    return () => opener?.focus();
  }, []);

  if (!anchorRect) return null;

  // Anchored via `bottom` (above) or `top` (below), never a measured height
  // directly: either lets the browser grow the popover away from a fixed
  // point, so it always ends up flush against the node with the same gap
  // regardless of how many buttons it renders.
  const centerX = clampedCenterX(anchorRect.left + anchorRect.width / 2);
  const style: CSSProperties =
    placement === "above"
      ? {
          position: "fixed",
          left: centerX,
          bottom: window.innerHeight - anchorRect.top + VERTICAL_OFFSET_PX,
          transform: "translateX(-50%)",
        }
      : {
          position: "fixed",
          left: centerX,
          top: anchorRect.bottom + VERTICAL_OFFSET_PX,
          transform: "translateX(-50%)",
        };

  return createPortal(
    <div ref={popoverRef} className={styles.popover} style={style} role="dialog" aria-label={primaryLabel}>
      {description && <p className={styles.description}>{description}</p>}
      <Button onClick={onPrimary}>{primaryLabel}</Button>
      {onDeepDive && (
        <Button variant="deepDive" onClick={onDeepDive}>
          Deep Dive
        </Button>
      )}
      {onSkip && (
        <Button variant="secondary" onClick={onSkip} title="Complete a shorter quiz instead of the full lesson to advance">
          Test out
        </Button>
      )}
      {onReviewVocabulary && (
        <Button variant="secondary" onClick={onReviewVocabulary}>
          Review vocabulary
        </Button>
      )}
    </div>,
    document.body,
  );
}
