import { useState } from "react";
import { Link } from "react-router-dom";
import { DAILY_GOAL_PRESETS, matchDailyGoalPreset } from "../../domain/dailyGoal";
import { useLocalAppPref } from "../../hooks/useLocalAppPref";
import type { SettingsSectionProps } from "./SettingsSectionProps";
import styles from "./SettingsPage.module.css";

/**
 * Retention presets covering the slider's own 0.51-0.99 range — the raw
 * value round-trips through these unchanged (PUT /v1/prefs always sends the
 * float either way), this just changes how it's chosen. A value that
 * doesn't land on a preset (from before this UI existed, or hand-tuned)
 * falls into "Custom" so nothing gets silently rewritten on next save.
 */
const RETENTION_PRESETS = [
  { value: 0.85, label: "Relaxed", hint: "Fewer reviews" },
  { value: 0.9, label: "Balanced", hint: "FSRS's own recommended default" },
  { value: 0.94, label: "Thorough", hint: "More reviews, forget less" },
] as const;

/** Daily goal and review-schedule targets. */
export function GoalsSection({ form, editForm }: SettingsSectionProps) {
  const matchedRetentionPreset = RETENTION_PRESETS.find((p) => Math.abs(p.value - form.desiredRetention) < 0.005);
  const [showAdvancedRetention, setShowAdvancedRetention] = useState(!matchedRetentionPreset);
  const matchedGoalPreset = matchDailyGoalPreset(form.dailyGoalXp);
  const [showCustomGoal, setShowCustomGoal] = useState(!matchedGoalPreset);
  const [celebrationEnabled, setCelebrationEnabled] = useLocalAppPref("goalCelebrationEnabled", true);

  return (
    <div className={styles.section}>
      <h2>Goals</h2>

      <div className={styles.field}>
        Daily goal
        <div className={styles.presetRow}>
          {DAILY_GOAL_PRESETS.map((preset) => (
            <button
              key={preset.xp}
              type="button"
              className={
                !showCustomGoal && matchedGoalPreset?.xp === preset.xp
                  ? `${styles.presetButton} ${styles.presetButtonActive}`
                  : styles.presetButton
              }
              onClick={() => {
                setShowCustomGoal(false);
                editForm({ dailyGoalXp: preset.xp });
              }}
            >
              {preset.label}
              <span className={styles.fieldNote}> {preset.xp} XP</span>
            </button>
          ))}
        </div>
        <button type="button" className={styles.linkButton} onClick={() => setShowCustomGoal((v) => !v)}>
          {showCustomGoal ? "Hide custom" : "Custom XP amount"}
        </button>
        {showCustomGoal && (
          <label className={styles.customGoalRow}>
            Daily XP goal
            <input type="number" min={100} max={2000} value={form.dailyGoalXp} onChange={(e) => editForm({ dailyGoalXp: Number(e.target.value) })} />
          </label>
        )}
        <label className={`${styles.field} ${styles.checkboxRow}`}>
          <input type="checkbox" checked={celebrationEnabled} onChange={(e) => setCelebrationEnabled(e.target.checked)} />
          Celebrate when I hit my daily goal
        </label>
      </div>

      <div className={styles.field}>
        Review intensity
        <div className={styles.presetRow}>
          {RETENTION_PRESETS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              title={preset.hint}
              className={
                !showAdvancedRetention && matchedRetentionPreset?.value === preset.value
                  ? `${styles.presetButton} ${styles.presetButtonActive}`
                  : styles.presetButton
              }
              onClick={() => {
                setShowAdvancedRetention(false);
                editForm({ desiredRetention: preset.value });
              }}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <button type="button" className={styles.linkButton} onClick={() => setShowAdvancedRetention((v) => !v)}>
          {showAdvancedRetention ? "Hide advanced" : "Advanced (exact value)"}
        </button>
        {showAdvancedRetention && (
          <label className={styles.field}>
            Target retention ({Math.round(form.desiredRetention * 100)}%)
            <input
              type="range"
              min={0.51}
              max={0.99}
              step={0.01}
              value={form.desiredRetention}
              onChange={(e) => editForm({ desiredRetention: Number(e.target.value) })}
            />
          </label>
        )}
        <span className={styles.fieldNote}>
          <Link to="/help#review-intensity">What does this change?</Link>
        </span>
      </div>
    </div>
  );
}
