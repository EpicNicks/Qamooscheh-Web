import { useState, type ComponentType } from "react";
import SettingsIcon from "@mui/icons-material/Settings";
import { getLanguageInfo, type Language } from "../../../domain/language";
import { usePrefs, useUpdatePrefs } from "../../../hooks/usePrefs";
import { useShowFurigana } from "../../../hooks/useShowFurigana";
import { useShowRomanizationHints } from "../../../hooks/useShowRomanizationHints";
import { PersianScriptSettings } from "./PersianScriptSettings";
import { JapaneseScriptSettings } from "./JapaneseScriptSettings";
import { LanguageSettingsPopover } from "./LanguageSettingsPopover";
import type { LanguageSettingsProps } from "./LanguageSettingsProps";
import styles from "./LanguageSettingsButton.module.css";

/**
 * The single place deciding which languages get an in-lesson script
 * settings panel at all — a language with nothing configurable simply has
 * no entry here, which is what makes the cog disappear for it (see below)
 * rather than needing a separate "does this language have settings" check
 * to stay in sync with this map by hand.
 */
const LANGUAGE_SETTINGS: Partial<Record<Language, ComponentType<LanguageSettingsProps>>> = {
  fa: PersianScriptSettings,
  ja: JapaneseScriptSettings,
};

/**
 * A cog that opens the current course's language-specific script settings
 * (native/romanized display, plus Japanese's furigana toggle) without
 * leaving the lesson. Renders nothing when the course's language has no
 * panel in LANGUAGE_SETTINGS above.
 */
export function LanguageSettingsButton({ courseCode }: { courseCode: string | null | undefined }) {
  const language = getLanguageInfo(courseCode)?.language;
  const SettingsPanel = language ? LANGUAGE_SETTINGS[language] : undefined;

  const [buttonEl, setButtonEl] = useState<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);

  const prefs = usePrefs();
  const updatePrefs = useUpdatePrefs();
  const furigana = useShowFurigana();
  const romanizationHints = useShowRomanizationHints();

  if (!SettingsPanel) return null;

  return (
    <>
      <button ref={setButtonEl} type="button" className={styles.cog} aria-label="Script settings" onClick={() => setOpen((o) => !o)}>
        <SettingsIcon fontSize="small" />
      </button>
      {open && prefs.data && (
        <LanguageSettingsPopover anchorEl={buttonEl} onClose={() => setOpen(false)}>
          <SettingsPanel
            scriptMode={prefs.data.scriptMode}
            onChangeScriptMode={(scriptMode) => updatePrefs.mutate({ ...prefs.data!, scriptMode })}
            showFurigana={furigana.enabled}
            onChangeShowFurigana={furigana.setShowFurigana}
            showRomanizationHints={romanizationHints.enabled}
            onChangeShowRomanizationHints={romanizationHints.setShowRomanizationHints}
          />
        </LanguageSettingsPopover>
      )}
    </>
  );
}
