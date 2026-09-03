import type { ScriptMode } from "../../../domain/enums";

/**
 * The full set of props every per-language settings panel COULD use — not
 * every panel uses every field (Persian ignores the furigana ones), but one
 * shared shape is what lets LanguageSettingsButton hand the same props
 * object to whichever panel its registry picks, without a switch over which
 * fields a given language needs.
 */
export interface LanguageSettingsProps {
  scriptMode: ScriptMode;
  onChangeScriptMode: (mode: ScriptMode) => void;
  showFurigana: boolean;
  onChangeShowFurigana: (enabled: boolean) => void;
  showRomanizationHints: boolean;
  onChangeShowRomanizationHints: (enabled: boolean) => void;
}
