import { useState, type ComponentType } from "react";
import { SettingsIcon } from "../../common/icons";
import { getLanguageInfo, type Language } from "../../../domain/language";
import { usePrefs, useUpdatePrefs } from "../../../hooks/usePrefs";
import { useShowFurigana } from "../../../hooks/useShowFurigana";
import { useShowRomanizationHints } from "../../../hooks/useShowRomanizationHints";
import { useShowVowelMarks } from "../../../hooks/useShowVowelMarks";
import { useShowNativeHints } from "../../../hooks/useShowNativeHints";
import { useShowSentenceRomanization } from "../../../hooks/useShowSentenceRomanization";
import { useShowTranslationHints } from "../../../hooks/useShowTranslationHints";
import { useNativeTextAlign } from "../../../hooks/useNativeTextAlign";
import { useBootstrap } from "../../../hooks/useBootstrap";
import { useAudioIndex } from "../../../hooks/useCourseContent";
import { VoicePicker } from "../../settings/VoicePicker";
import { SettingsGroup } from "./SettingsGroup";
import { PersianScriptSettings } from "./PersianScriptSettings";
import { JapaneseScriptSettings } from "./JapaneseScriptSettings";
import { LanguageSettingsPopover } from "./LanguageSettingsPopover";
import type { LanguageSettingsProps } from "./LanguageSettingsProps";
import styles from "./LanguageSettingsButton.module.css";
import checkboxStyles from "./CheckboxRow.module.css";

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
 * A cog that opens the lesson's settings without leaving it, in titled
 * groups: the course language's own script settings (LANGUAGE_SETTINGS
 * above), the voice recordings play in (the same VoicePicker as Settings ->
 * Input), and the walkthrough replay. Renders nothing when none of those
 * apply.
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
  const vowelMarks = useShowVowelMarks();
  const nativeHints = useShowNativeHints();
  const sentenceRomanization = useShowSentenceRomanization();
  const course = useBootstrap().data?.course ?? null;
  const hasVoices = (useAudioIndex(course).data?.voices.length ?? 0) > 0;

  if (!SettingsPanel && !hasVoices && !onReplayTutorial) return null;

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
              showNativeHints={nativeHints.enabled}
              onChangeShowNativeHints={nativeHints.setShowNativeHints}
              showVowelMarks={vowelMarks.enabled}
              onChangeShowVowelMarks={vowelMarks.setShowVowelMarks}
              showSentenceRomanization={sentenceRomanization.enabled}
              onChangeShowSentenceRomanization={sentenceRomanization.setShowSentenceRomanization}
              nativeTextAlign={nativeTextAlign.align}
              onChangeNativeTextAlign={nativeTextAlign.setNativeTextAlign}
            />
          )}
          {hasVoices && (
            <SettingsGroup title="Audio">
              <VoicePicker
                value={prefs.data.preferredVoice ?? null}
                onChange={(preferredVoice) => updatePrefs.mutate({ ...prefs.data!, preferredVoice })}
                classNames={{ field: styles.voiceField, note: styles.voiceNote, checkbox: checkboxStyles.row }}
              />
            </SettingsGroup>
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
