import type { ScriptMode } from "../../../domain/enums";
import type { NativeTextAlign } from "../../../lib/localAppPrefs";

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
  showTranslationHints: boolean;
  onChangeShowTranslationHints: (enabled: boolean) => void;
  /** Only Persian's panel exposes this — a non-RTL language has nothing to align. See NativeTextAlign's own doc. */
  nativeTextAlign: NativeTextAlign;
  onChangeNativeTextAlign: (align: NativeTextAlign) => void;
}
