import { getLanguageInfo } from "../../domain/language";
import { FontPicker } from "../../components/settings/FontPicker";
import type { SettingsSectionProps } from "./SettingsSectionProps";
import styles from "./SettingsPage.module.css";

/**
 * Per-script font choices — system fonts only (no bundled webfont), so a
 * choice here either renders as itself or falls back to the same stack that
 * rendered before this preference existed (domain/fonts.ts's
 * resolveFontStack). Scoped by SCRIPT, not literally by course: fa/ja each
 * only ever back one course today (domain/language.ts's own coincidence
 * caveat), so "this course's native font" and "the fa font" mean the same
 * thing, and there's exactly one Latin/English font app-wide rather than a
 * per-course one with an "apply to all courses" checkbox — nothing yet
 * needs two different English fonts for two different courses at once.
 */
export function AppearanceSection({ courseCode }: SettingsSectionProps) {
  const info = getLanguageInfo(courseCode);

  return (
    <div className={styles.section}>
      <h2>Appearance</h2>

      {info && <FontPicker script={info.language} label={`${info.displayName} font`} dir={info.direction} />}
      <FontPicker script="latin" label="English / Latin font" dir="ltr" />
    </div>
  );
}
