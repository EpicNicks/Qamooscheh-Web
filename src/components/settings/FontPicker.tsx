import { useMemo, useState } from "react";
import { FONT_CATALOG, FONT_PREVIEW_TEXT, isFontAvailable, resolveFontStack, type FontScript } from "../../domain/fonts";
import { useFontPref } from "../../hooks/useFontPrefs";
import { useLocalAppPref } from "../../hooks/useLocalAppPref";
import { RemoveCustomFontModal } from "../../pages/settings/RemoveCustomFontModal";
import styles from "./FontPicker.module.css";

interface FontPickerProps {
  script: FontScript;
  label: string;
  /** Set on the wrapping preview span so a caller (StudySection's Persian/Japanese panels, GoalsSection's Latin/English panel) can give it the right dir/lang for the script being previewed. */
  dir?: "rtl" | "ltr";
}

/**
 * A row of font choices for one script (fa/ja/latin), each button rendered
 * IN that very font — a hover/focus preview that falls out of the buttons
 * being real choices rather than needing a separate preview panel to sync
 * with a hovered option. Options the browser doesn't actually have installed
 * (domain/fonts.ts's isFontAvailable, a canvas-measurement check — there is
 * no reliable "list installed fonts" API) are shown greyed out rather than
 * hidden, so a learner understands why an entry might not do anything for
 * them specifically instead of the choice silently vanishing.
 *
 * "Pro mode": a free-text entry for any font name, persisted so it
 * reappears as a regular choice next session. Removing one prompts a
 * confirmation (RemoveCustomFontModal), skippable via "don't ask again".
 */
export function FontPicker({ script, label, dir }: FontPickerProps) {
  const { family, sizePct, custom, update } = useFontPref(script);
  const [customInput, setCustomInput] = useState("");
  const [removing, setRemoving] = useState<string | null>(null);
  const [suppressRemoveWarning, setSuppressRemoveWarning] = useLocalAppPref("suppressRemoveFontWarning", false);

  const catalog = FONT_CATALOG[script];
  const previewText = FONT_PREVIEW_TEXT[script];
  // Catalog entries first, then this script's own saved custom fonts —
  // recomputed only when the lists themselves change, not on every
  // isFontAvailable call (a canvas measurement per option per render).
  const options = useMemo(
    () => [...catalog.map((entry) => entry.name), ...custom].map((name) => ({ name, available: isFontAvailable(name) })),
    [catalog, custom],
  );

  function selectFont(name: string | null) {
    update({ family: name });
  }

  function addCustomFont() {
    const name = customInput.trim();
    if (!name || custom.includes(name)) return;
    update({ custom: [...custom, name], family: name });
    setCustomInput("");
  }

  function removeCustomFont(name: string) {
    update({ custom: custom.filter((f) => f !== name), family: family === name ? null : family });
    setRemoving(null);
  }

  function requestRemove(name: string) {
    if (suppressRemoveWarning) {
      removeCustomFont(name);
      return;
    }
    setRemoving(name);
  }

  return (
    <div className={styles.wrap}>
      <p className={styles.label}>{label}</p>
      <div className={styles.optionRow}>
        <button
          type="button"
          className={family === null ? `${styles.option} ${styles.optionActive}` : styles.option}
          onClick={() => selectFont(null)}
          title="The built-in default"
        >
          <span className={styles.preview} dir={dir}>
            {previewText}
          </span>
          <span className={styles.optionLabel}>Default</span>
        </button>
        {options.map(({ name, available }) => (
          <div key={name} className={styles.optionWithRemove}>
            <button
              type="button"
              className={family === name ? `${styles.option} ${styles.optionActive}` : styles.option}
              style={{ fontFamily: resolveFontStack(script, name), opacity: available ? 1 : 0.4 }}
              onClick={() => selectFont(name)}
              disabled={!available}
              title={available ? name : `${name} — not detected on this device`}
            >
              <span className={styles.preview} dir={dir}>
                {previewText}
              </span>
              <span className={styles.optionLabel}>{name}</span>
            </button>
            {custom.includes(name) && (
              <button type="button" className={styles.remove} aria-label={`Remove ${name}`} onClick={() => requestRemove(name)}>
                ×
              </button>
            )}
          </div>
        ))}
      </div>

      {/* English is the size baseline the issue itself frames this against
          ("harder to read... than the equivalent size from English") — the
          Latin picker has no separate size dial to match. */}
      {script !== "latin" && (
        <label className={styles.sizeRow}>
          Size ({sizePct}%)
          <input type="range" min={75} max={150} step={5} value={sizePct} onChange={(e) => update({ sizePct: Number(e.target.value) })} />
        </label>
      )}

      <div className={styles.customRow}>
        <input
          type="text"
          className={styles.customInput}
          placeholder="Type any font name…"
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCustomFont();
            }
          }}
        />
        <button type="button" className={styles.addButton} onClick={addCustomFont} disabled={!customInput.trim()}>
          Add
        </button>
      </div>

      {removing && (
        <RemoveCustomFontModal
          fontName={removing}
          onCancel={() => setRemoving(null)}
          onConfirm={(dontAskAgain) => {
            if (dontAskAgain) setSuppressRemoveWarning(true);
            removeCustomFont(removing);
          }}
        />
      )}
    </div>
  );
}
