import { useState, type ComponentType } from "react";
import { SettingsIcon } from "../../common/icons";
import { getLanguageInfo, type Language } from "../../../domain/language";
import { usePrefs, useUpdatePrefs } from "../../../hooks/usePrefs";
import { useShowFurigana } from "../../../hooks/useShowFurigana";
import { useShowRomanizationHints } from "../../../hooks/useShowRomanizationHints";
import { useShowTranslationHints } from "../../../hooks/useShowTranslationHints";
import { useNativeTextAlign } from "../../../hooks/useNativeTextAlign";
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
interface LanguageSettingsButtonProps {
  courseCode: string | null | undefined;
  /** Only LessonPage passes this — the popover grows a "Replay the lesson walkthrough" section when it's present, even for a language with no script panel above. */
  onReplayTutorial?: () => void;
}

export function LanguageSettingsButton({ courseCode, onReplayTutorial }: LanguageSettingsButtonProps) {
  const language = getLanguageInfo(courseCode)?.language;
  const SettingsPanel = language ? LANGUAGE_SETTINGS[language] : undefined;

  const [buttonEl, setButtonEl] = useState<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);

  const prefs = usePrefs();
  const updatePrefs = useUpdatePrefs();
  const furigana = useShowFurigana();
  const romanizationHints = useShowRomanizationHints();
  const translationHints = useShowTranslationHints();
  const nativeTextAlign = useNativeTextAlign();

  if (!SettingsPanel && !onReplayTutorial) return null;

  return (
    <>
      <button ref={setButtonEl} type="button" className={styles.cog} aria-label="Lesson settings" onClick={() => setOpen((o) => !o)}>
        <SettingsIcon size="1.25rem" />
      </button>
      {open && prefs.data && (
        <LanguageSettingsPopover anchorEl={buttonEl} onClose={() => setOpen(false)}>
          {SettingsPanel && (
            <SettingsPanel
              scriptMode={prefs.data.scriptMode}
              onChangeScriptMode={(scriptMode) => updatePrefs.mutate({ ...prefs.data!, scriptMode })}
              showFurigana={furigana.enabled}
              onChangeShowFurigana={furigana.setShowFurigana}
              showRomanizationHints={romanizationHints.enabled}
              onChangeShowRomanizationHints={romanizationHints.setShowRomanizationHints}
              showTranslationHints={translationHints.enabled}
              onChangeShowTranslationHints={translationHints.setShowTranslationHints}
              nativeTextAlign={nativeTextAlign.align}
              onChangeNativeTextAlign={nativeTextAlign.setNativeTextAlign}
            />
          )}
          {onReplayTutorial && (
            <div className={styles.tutorialSection}>
              <button
                type="button"
                className={styles.replayButton}
                onClick={() => {
                  onReplayTutorial();
                  setOpen(false);
                }}
              >
                Replay the lesson walkthrough
              </button>
            </div>
          )}
        </LanguageSettingsPopover>
      )}
    </>
  );
}
