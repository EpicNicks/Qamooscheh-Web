import { getLanguageInfo } from "../../domain/language";
import { FontPicker } from "../../components/settings/FontPicker";
import { PersianFlagPicker } from "../../components/settings/PersianFlagPicker";
import { useLocalAppPref } from "../../hooks/useLocalAppPref";
import type { ColorVision } from "../../lib/localAppPrefs";
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
  const [colorVision, setColorVision] = useLocalAppPref("colorVision", "default");
  const [smoulderingStreak, setSmoulderingStreak] = useLocalAppPref("smoulderingStreak", true);

  return (
    <div className={styles.section}>
      <h2>Appearance</h2>

      {info && <FontPicker script={info.language} label={`${info.displayName} font`} dir={info.direction} />}
      <FontPicker script="latin" label="English / Latin font" dir="ltr" />

      {info?.language === "fa" && <PersianFlagPicker />}

      <label className={styles.field}>
        Color vision
        <select value={colorVision} onChange={(e) => setColorVision(e.target.value as ColorVision)}>
          <option value="default">Default colors</option>
          <option value="red-green">Red-green colorblind (protanopia, deuteranopia)</option>
          <option value="blue-yellow">Blue-yellow colorblind (tritanopia)</option>
        </select>
        <span className={styles.fieldNote}>Changes the colors that mark answers right, wrong, swapped or missing, and adds ✓ ⇄ ✗ to reviewed tiles.</span>
      </label>

      <label className={`${styles.field} ${styles.checkboxRow}`}>
        <input type="checkbox" checked={smoulderingStreak} onChange={(e) => setSmoulderingStreak(e.target.checked)} />
        Animate my streak: smouldering while it waits on today's Parsle, flames once it's done
      </label>
    </div>
  );
}
