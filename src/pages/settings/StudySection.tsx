import { getLanguageInfo } from "../../domain/language";
import { ScriptModeToggle } from "../../components/lesson/languageSettings/ScriptModeToggle";
import type { Register } from "../../domain/enums";
import type { SettingsSectionProps } from "./SettingsSectionProps";
import styles from "./SettingsPage.module.css";

/** Script display and register — how the course's own text shows up. */
export function StudySection({ form, editForm, courseCode }: SettingsSectionProps) {
  const language = getLanguageInfo(courseCode)?.language;

  return (
    <div className={styles.section}>
      <h2>Study</h2>

      {language ? (
        <ScriptModeToggle language={language} value={form.scriptMode} onChange={(scriptMode) => editForm({ scriptMode })} />
      ) : (
        <label className={styles.field}>
          Script
          <select value={form.scriptMode} onChange={(e) => editForm({ scriptMode: e.target.value as typeof form.scriptMode })}>
            <option value="native">Native script</option>
            <option value="romanized">Romanized</option>
            <option value="both">Both</option>
          </select>
        </label>
      )}

      <label className={styles.field}>
        Register
        <select value={form.register} onChange={(e) => editForm({ register: e.target.value as Register })}>
          <option value="spoken">Spoken / colloquial</option>
          <option value="written">Written / formal</option>
          <option value="both">Both</option>
        </select>
        <span className={styles.fieldNote}>Doesn't change lesson content yet — no course currently varies its exercises or accepted answers by register.</span>
      </label>
    </div>
  );
}
