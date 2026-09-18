import type { CSSProperties, ReactNode } from "react";
import { getLanguageInfo } from "../../domain/language";

interface DirectionalTextProps {
  courseCode: string | null | undefined;
  children: ReactNode;
  block?: boolean;
  className?: string;
}

/**
 * Wraps native-script course content (prompts, tiles, typed answers) with
 * the right `dir` and font stack for that course's language — RTL for
 * Persian, LTR otherwise (domain/language.ts). App chrome (nav, buttons,
 * instructional text) is never wrapped in this and stays LTR always.
 */
export function DirectionalText({ courseCode, children, block, className }: DirectionalTextProps) {
  const info = getLanguageInfo(courseCode);
  // The CSS variable (theme/FontProvider.tsx writes it) rather than a
  // hardcoded stack — it already resolves to the same fallback chain by
  // default, plus a learner's chosen font in front of it when there is one.
  const style: CSSProperties = info
    ? {
        direction: info.direction,
        fontFamily: `var(--font-script-${info.language})`,
        fontSize: `var(--font-size-script-${info.language})`,
        unicodeBidi: "isolate",
      }
    : {};

  const Tag = block ? "div" : "span";
  return (
    <Tag className={className} dir={info?.direction} style={style}>
      {children}
    </Tag>
  );
}
