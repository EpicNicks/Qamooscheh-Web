import { ScriptModeToggle } from "./ScriptModeToggle";
import type { LanguageSettingsProps } from "./LanguageSettingsProps";

/** Persian has one setting today: native/romanized display. */
export function PersianScriptSettings({ scriptMode, onChangeScriptMode }: LanguageSettingsProps) {
  return <ScriptModeToggle language="fa" value={scriptMode} onChange={onChangeScriptMode} />;
}
