import { useState } from "react";
import { VirtualKey } from "./keyboard/VirtualKey";
import { JIS_KANA_NUMBER_ROW, JIS_KANA_ROWS, JIS_KANA_WO } from "../../domain/japanese/jisKanaLayout";
import { applyDakuten, applyHandakuten } from "../../domain/japanese/dakuten";
import { toKatakana, type KanaScript } from "../../domain/japanese/kanaScript";
import keyboardStyles from "./keyboard/Keyboard.module.css";
import styles from "./JapaneseKanaKeyboard.module.css";

/**
 * Direct kana input, laid out like a real JIS kana keyboard: the number row
 * carries あうえお/やゆよわ/ほへー exactly where they sit physically, and the
 * three QWERTY-shaped rows below follow the standard kana-per-key ordering
 * (Q..P / A../'/] / Z../,.) — cross-checked against the well-known Q→た,
 * W→て, E→い, R→す, T→か, Y→ん assignment; see
 * domain/japanese/jisKanaLayout.ts. を and ろ have no US-layout key of their
 * own (real JIS positions are Shift+0 and a key past "/" that doesn't exist
 * on a US board), so they're tap-only, appended where they sit visually.
 *
 * Secondary to JapanesePhoneticKeyboard (the default, romaji-based mode) —
 * most learners will use that one; this is for practicing the direct
 * layout itself.
 */
const SMALL_KANA: Record<string, string> = {
  つ: "っ", や: "ゃ", ゆ: "ゅ", よ: "ょ", あ: "ぁ", い: "ぃ", う: "ぅ", え: "ぇ", お: "ぉ",
};

interface JapaneseKanaKeyboardProps {
  /** Last character of the current answer, for the dakuten/handakuten keys — undefined/empty when there's nothing to voice yet. */
  lastChar: string;
  onInsert: (text: string) => void;
  /** Replaces just the last character (dakuten/handakuten) — distinct from onInsert, which always appends. */
  onReplaceLast: (newLastChar: string) => void;
  onBackspace: () => void;
  disabled?: boolean;
}

export function JapaneseKanaKeyboard({ lastChar, onInsert, onReplaceLast, onBackspace, disabled }: JapaneseKanaKeyboardProps) {
  const [shift, setShift] = useState(false);
  const [script, setScript] = useState<KanaScript>("hiragana");

  function display(kana: string): string {
    return script === "katakana" ? toKatakana(kana) : kana;
  }

  function pressKana(kana: string) {
    const base = shift ? (SMALL_KANA[kana] ?? kana) : kana;
    onInsert(display(base));
    setShift(false);
  }

  function labelFor(kana: string): string {
    return display(shift ? (SMALL_KANA[kana] ?? kana) : kana);
  }

  return (
    <div className={keyboardStyles.keyboard} dir="ltr">
      <div className={keyboardStyles.row}>
        {JIS_KANA_NUMBER_ROW.map(([kana]) => (
          <VirtualKey key={kana} label={labelFor(kana)} className={styles.kanaKey} disabled={disabled} onActivate={() => pressKana(kana)} />
        ))}
        <VirtualKey label={display(JIS_KANA_WO)} className={styles.kanaKey} disabled={disabled} onActivate={() => pressKana(JIS_KANA_WO)} />
      </div>
      {JIS_KANA_ROWS.map((row, rowIndex) => (
        <div className={keyboardStyles.row} key={rowIndex}>
          {row.map(([kana]) => (
            <VirtualKey key={kana} label={labelFor(kana)} className={styles.kanaKey} disabled={disabled} onActivate={() => pressKana(kana)} />
          ))}
        </div>
      ))}
      <div className={keyboardStyles.row}>
        <VirtualKey
          label="゛"
          className={styles.kanaKey}
          title="Dakuten — voices the last kana (か→が)"
          disabled={disabled || !lastChar}
          onActivate={() => onReplaceLast(applyDakuten(lastChar))}
        />
        <VirtualKey
          label="゜"
          className={styles.kanaKey}
          title="Handakuten — は-row → ぱ-row"
          disabled={disabled || !lastChar}
          onActivate={() => onReplaceLast(applyHandakuten(lastChar))}
        />
        <VirtualKey
          label={shift ? "small ✓" : "small"}
          className={shift ? styles.shiftActive : undefined}
          disabled={disabled}
          onActivate={() => setShift((s) => !s)}
        />
        <VirtualKey
          label={script === "hiragana" ? "→ カタカナ" : "→ ひらがな"}
          title="Switch between hiragana and katakana"
          disabled={disabled}
          onActivate={() => setScript((s) => (s === "hiragana" ? "katakana" : "hiragana"))}
        />
      </div>
      <div className={keyboardStyles.row}>
        <VirtualKey label="space" wide disabled={disabled} onActivate={() => onInsert(" ")} />
        <VirtualKey label="⌫" disabled={disabled} onActivate={onBackspace} />
      </div>
    </div>
  );
}
