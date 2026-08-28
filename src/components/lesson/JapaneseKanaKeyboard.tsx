import { useState } from "react";
import { VirtualKey } from "./keyboard/VirtualKey";
import { JIS_KANA_ROWS } from "../../domain/japanese/jisKanaLayout";
import { applyDakuten, applyHandakuten } from "../../domain/japanese/dakuten";
import keyboardStyles from "./keyboard/Keyboard.module.css";
import styles from "./JapaneseKanaKeyboard.module.css";

/**
 * Direct kana input, laid out like a real JIS kana keyboard: the three main
 * rows follow the standard kana-per-physical-key ordering (Q..P / A../' /
 * Z../ — cross-checked against the well-known Q→た, W→て, E→い, R→す, T→か,
 * Y→ん assignment; see domain/japanese/jisKanaLayout.ts). This covers the 32
 * kana that fit cleanly on those three QWERTY-shaped rows; the remaining
 * base vowels/を/ろ and the dakuten/handakuten/small-kana mechanics sit in a
 * 4th row below, since JIS hardware reaches those through an extra physical
 * key and shift combinations this on-screen keyboard doesn't attempt to
 * reproduce key-for-key — a simplified but functionally complete v1, same
 * spirit as PersianKeyboard's ژ placement.
 *
 * Secondary to JapanesePhoneticKeyboard (the default, romaji-based mode) —
 * most learners will use that one; this is for practicing the direct
 * layout itself.
 */
const EXTRA_ROW = ["あ", "う", "え", "お", "を", "ろ"];

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

  function pressKana(kana: string) {
    onInsert(shift ? (SMALL_KANA[kana] ?? kana) : kana);
    setShift(false);
  }

  return (
    <div className={keyboardStyles.keyboard} dir="ltr">
      {JIS_KANA_ROWS.map((row, rowIndex) => (
        <div className={keyboardStyles.row} key={rowIndex}>
          {row.map(([kana]) => (
            <VirtualKey
              key={kana}
              label={shift ? (SMALL_KANA[kana] ?? kana) : kana}
              className={styles.kanaKey}
              disabled={disabled}
              onActivate={() => pressKana(kana)}
            />
          ))}
        </div>
      ))}
      <div className={keyboardStyles.row}>
        {EXTRA_ROW.map((kana) => (
          <VirtualKey key={kana} label={kana} className={styles.kanaKey} disabled={disabled} onActivate={() => pressKana(kana)} />
        ))}
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
      </div>
      <div className={keyboardStyles.row}>
        <VirtualKey
          label={shift ? "small ✓" : "small"}
          className={shift ? styles.shiftActive : undefined}
          disabled={disabled}
          onActivate={() => setShift((s) => !s)}
        />
        <VirtualKey label="space" wide disabled={disabled} onActivate={() => onInsert(" ")} />
        <VirtualKey label="⌫" disabled={disabled} onActivate={onBackspace} />
      </div>
    </div>
  );
}
