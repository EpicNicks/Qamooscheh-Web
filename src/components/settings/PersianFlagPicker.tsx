import { useLocalAppPref } from "../../hooks/useLocalAppPref";
import pahlaviFlagUrl from "../../assets/flags/flag-ir-lion.svg";
import iriFlagUrl from "flag-icons/flags/4x3/ir.svg";
import styles from "./PersianFlagPicker.module.css";

const OPTIONS = [
  { value: "pahlavi", label: "Pahlavi (lion and sun)", url: pahlaviFlagUrl },
  { value: "iri", label: "Islamic Republic", url: iriFlagUrl },
] as const;

/** Which flag stands for Persian in the course switcher/catalog (components/layout/FlagBadge.tsx) — a per-device display choice, not a study setting, so it's local (localAppPrefs.persianFlag) rather than a synced pref. */
export function PersianFlagPicker() {
  const [persianFlag, setPersianFlag] = useLocalAppPref("persianFlag", "pahlavi");

  return (
    <div className={styles.wrap}>
      <p className={styles.label}>Persian flag</p>
      <div className={styles.optionRow}>
        {OPTIONS.map(({ value, label, url }) => (
          <button
            key={value}
            type="button"
            className={persianFlag === value ? `${styles.option} ${styles.optionActive}` : styles.option}
            onClick={() => setPersianFlag(value)}
          >
            <span className={styles.preview} style={{ backgroundImage: `url(${url})` }} />
            <span className={styles.optionLabel}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
