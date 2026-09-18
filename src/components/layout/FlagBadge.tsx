import { useState } from "react";
import { getLanguageInfo } from "../../domain/language";
import { useLocalAppPref } from "../../hooks/useLocalAppPref";
import pahlaviFlagUrl from "../../assets/flags/flag-ir-lion-emoji.svg";
import iriFlagUrl from "flag-icons/flags/4x3/ir.svg";
import jpFlagUrl from "flag-icons/flags/4x3/jp.svg";
import styles from "./LanguageBadge.module.css";

interface FlagBadgeProps {
  courseCode: string;
  className?: string;
}

// Which real flag image represents each language. Hardcoded per language
// (fa/ja) rather than derived from a generic country-code table, matching
// how the rest of the app already keys per-language data (localAppPrefs'
// KeyboardInputMethod, fontPrefs) — domain/language.ts's own header note on
// code and language coinciding today applies here too. A language with no
// entry here falls back to the color-gradient badge below, same as a real
// image failing to load.
function flagUrlFor(language: string | undefined, persianFlag: "pahlavi" | "iri"): string | null {
  if (language === "fa") return persianFlag === "pahlavi" ? pahlaviFlagUrl : iriFlagUrl;
  if (language === "ja") return jpFlagUrl;
  return null;
}

/**
 * The flag chip for one course — shared by CourseSwitcher and
 * CourseCatalogList so both draw the same badge for the same code.
 *
 * Every language gets a real flag image (flag-icons' bundled SVGs) by
 * default. Persian is the one exception with a choice at all: a learner can
 * pick the current Islamic Republic flag or the Pahlavi-era lion-and-sun
 * tricolour, remembered locally (PersianFlagPicker, localAppPrefs.
 * persianFlag) — every other language just gets its one real flag.
 *
 * The flat color-gradient chip (domain/language.ts's flagColors) is no
 * longer the default; it's now only a defensive fallback for a language
 * with no mapped flag yet, or for the rare case the image itself fails to
 * load (hence the plain <img>+onError here instead of a CSS background-image,
 * which has no failure signal to react to).
 */
export function FlagBadge({ courseCode, className }: FlagBadgeProps) {
  const info = getLanguageInfo(courseCode);
  const [persianFlag] = useLocalAppPref("persianFlag", "pahlavi");
  const [imageFailed, setImageFailed] = useState(false);

  const flagUrl = flagUrlFor(info?.language, persianFlag);

  // A new URL (switching the Persian flag pref, or in principle a different
  // course reusing this same mounted instance) deserves its own fresh
  // attempt rather than inheriting a previous URL's failure — adjusted
  // during render (React's own pattern for resetting state on a prop-like
  // change) rather than in an effect, which would cost an extra render pass.
  const [lastFlagUrl, setLastFlagUrl] = useState(flagUrl);
  if (flagUrl !== lastFlagUrl) {
    setLastFlagUrl(flagUrl);
    setImageFailed(false);
  }

  if (flagUrl && !imageFailed) {
    const imageClasses = [styles.badge, styles.imageBadge, className].filter(Boolean).join(" ");
    return (
      <span className={imageClasses} aria-hidden="true">
        <img src={flagUrl} alt="" className={styles.flagImage} onError={() => setImageFailed(true)} />
      </span>
    );
  }

  const classes = [styles.badge, className].filter(Boolean).join(" ");

  const style = info
    ? { backgroundImage: `linear-gradient(to bottom, ${info.flagColors.join(", ")})` }
    : { background: "var(--color-locked)" };

  return (
    <span className={classes} style={style} aria-hidden="true">
      {info?.flagCode ?? courseCode.toUpperCase()}
    </span>
  );
}
