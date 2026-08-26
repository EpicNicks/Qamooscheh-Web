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
  const style: CSSProperties = info
    ? { direction: info.direction, fontFamily: info.nativeFontStack, unicodeBidi: "isolate" }
    : {};

  const Tag = block ? "div" : "span";
  return (
    <Tag className={className} dir={info?.direction} style={style}>
      {children}
    </Tag>
  );
}
