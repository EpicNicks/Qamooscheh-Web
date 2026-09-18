import { getLanguageInfo } from "../../domain/language";
import { useLocalAppPref } from "../../hooks/useLocalAppPref";
import pahlaviFlagUrl from "../../assets/flags/flag-ir-lion.svg";
import iriFlagUrl from "flag-icons/flags/4x3/ir.svg";
import styles from "./LanguageBadge.module.css";

interface FlagBadgeProps {
  courseCode: string;
  className?: string;
}

/**
 * The flag chip for one course — shared by CourseSwitcher and
 * CourseCatalogList so both draw the same badge for the same code.
 *
 * Every language but Persian still falls back to the flat color-gradient
 * chip (domain/language.ts's flagColors) rather than a real flag image —
 * see that file's own note on why (inconsistent emoji/font flag rendering).
 * Persian is the deliberate exception: it has a real, locally-chosen flag
 * image to show — either the Pahlavi-era lion-and-sun tricolour (the
 * default) or the current Islamic Republic flag — picked once in Settings ->
 * Appearance (PersianFlagPicker) and remembered per localAppPrefs.persianFlag.
 * Both are bundled SVGs, not a webfont/emoji glyph, so they render
 * identically everywhere.
 */
export function FlagBadge({ courseCode, className }: FlagBadgeProps) {
  const info = getLanguageInfo(courseCode);
  const [persianFlag] = useLocalAppPref("persianFlag", "pahlavi");

  const classes = [styles.badge, className].filter(Boolean).join(" ");

  if (info?.language === "fa") {
    const flagUrl = persianFlag === "pahlavi" ? pahlaviFlagUrl : iriFlagUrl;
    return (
      <span
        className={classes}
        style={{ backgroundImage: `url(${flagUrl})`, backgroundSize: "cover", backgroundPosition: "center" }}
        aria-hidden="true"
      />
    );
  }

  const style = info
    ? { backgroundImage: `linear-gradient(to bottom, ${info.flagColors.join(", ")})` }
    : { background: "var(--color-locked)" };

  return (
    <span className={classes} style={style} aria-hidden="true">
      {info?.flagCode ?? courseCode.toUpperCase()}
    </span>
  );
}
