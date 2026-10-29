import { useState } from "react";
import { Button } from "../common/Button";
import type { ShareCardContent } from "../../domain/shareCard";

const SIZE = 1080;
const FILE_NAME = "parsling-card.png";
// The light theme's colours (index.css), fixed: the card leaves the app, so
// it looks the same whatever theme it was shared from. Same layout as
// Android's ShareCard.kt.
const COLOURS = {
  primary: "#58cc02",
  primaryDeep: "#3e9a00",
  text: "#1a1a2e",
  muted: "#6b6b7b",
  streakFrom: "#e06800",
  streakTo: "#c62a12",
};
const SANS = `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
const SCRIPT = `"Vazirmatn", "Noto Naskh Arabic", Tahoma, sans-serif`;

async function renderCard(content: ShareCardContent): Promise<Blob | null> {
  // The Persian face may not have been needed on screen yet.
  await document.fonts?.load(`bold 130px ${SCRIPT}`).catch(() => undefined);
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const background = ctx.createLinearGradient(0, 0, 0, SIZE);
  background.addColorStop(0, COLOURS.primary);
  background.addColorStop(1, COLOURS.primaryDeep);
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.roundRect(60, 60, SIZE - 120, SIZE - 120, 48);
  ctx.fill();

  ctx.textAlign = "center";
  const maxWidth = SIZE - 240;
  // Long lines shrink to fit the panel rather than run off it.
  function text(value: string, y: number, size: number, fill: string | CanvasGradient, family = SANS, weight = "bold") {
    let fontSize = size;
    ctx!.font = `${weight} ${fontSize}px ${family}`;
    while (ctx!.measureText(value).width > maxWidth && fontSize > 24) {
      fontSize -= 4;
      ctx!.font = `${weight} ${fontSize}px ${family}`;
    }
    ctx!.fillStyle = fill;
    ctx!.fillText(value, SIZE / 2, y);
  }

  text(content.headline, 230, 72, COLOURS.text);
  text(`+${content.xp} XP`, 360, 110, COLOURS.primary);
  if (content.streakDays != null) {
    const streak = ctx.createLinearGradient(300, 0, 780, 0);
    streak.addColorStop(0, COLOURS.streakFrom);
    streak.addColorStop(1, COLOURS.streakTo);
    text(`${content.streakDays}-day streak`, 480, 76, streak);
  }
  if (content.word) {
    text(content.word.text, 680, 130, COLOURS.text, SCRIPT);
    if (content.word.reading) text(content.word.reading, 770, 52, COLOURS.muted, SANS, "normal");
    text(`“${content.word.gloss}”`, 850, 52, COLOURS.muted, SANS, "normal");
  }
  text("ParsLing", SIZE - 120, 48, COLOURS.primary);

  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

/**
 * The passed recap's Share button: draws the card (domain/shareCard.ts) and
 * hands it to the system share sheet where the browser can share files,
 * otherwise saves it as a PNG.
 */
export function ShareCardButton({ content }: { content: () => ShareCardContent }) {
  const [busy, setBusy] = useState(false);

  async function share() {
    setBusy(true);
    try {
      const card = content();
      const blob = await renderCard(card);
      if (!blob) return;
      const file = new File([blob], FILE_NAME, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        // Dismissing the sheet rejects; that's not an error worth showing.
        await navigator.share({ files: [file], text: card.headline }).catch(() => undefined);
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = FILE_NAME;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant="ghost" onClick={() => void share()} disabled={busy}>
      Share
    </Button>
  );
}
