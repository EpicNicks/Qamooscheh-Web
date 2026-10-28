// Draws the installable app's icons (public/icons/, named by
// public/manifest.webmanifest and index.html) and writes them as PNGs. The
// mark is the Android app's placeholder launcher icon (a white "Q" on the
// brand green, app/src/main/res/drawable/ic_launcher_foreground.xml) drawn in
// the same 108-unit viewport, so the two stay alike until there's a real logo.
// Committed output; rerun with `node scripts/generate-icons.mjs` after a change.
import { mkdirSync, writeFileSync } from "node:fs";
import { deflateSync, crc32 } from "node:zlib";

const GREEN = [0x58, 0xcc, 0x02];
const WHITE = [0xff, 0xff, 0xff];
const SAMPLES = 4; // per axis, for anti-aliasing

/** Whether a point of the 108-unit viewport is on the "Q": a ring and a round-capped tail, both 8 wide. */
function onMark(x, y) {
  if (Math.abs(Math.hypot(x - 54, y - 52) - 18) <= 4) return true;
  const t = Math.min(1, Math.max(0, (x - 61 + (y - 61)) / 22));
  return Math.hypot(x - (61 + 11 * t), y - (61 + 11 * t)) <= 4;
}

/** Whether a point of the unit square is inside a square with corners rounded by `radius`. */
function inRoundedSquare(u, v, radius) {
  const dx = Math.max(radius - u, u - (1 - radius), 0);
  const dy = Math.max(radius - v, v - (1 - radius), 0);
  return Math.hypot(dx, dy) <= radius;
}

/**
 * An RGBA icon `size` pixels wide. `viewport` is how many of the mark's 108
 * units the icon spans (centred on the mark); `cornerRadius` (a fraction of
 * the side) leaves transparent corners, 0 fills the whole square.
 */
function draw(size, { viewport, cornerRadius }) {
  const pixels = Buffer.alloc(size * size * 4);
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let covered = 0;
      let marked = 0;
      for (let sy = 0; sy < SAMPLES; sy++) {
        for (let sx = 0; sx < SAMPLES; sx++) {
          const u = (px + (sx + 0.5) / SAMPLES) / size;
          const v = (py + (sy + 0.5) / SAMPLES) / size;
          if (cornerRadius && !inRoundedSquare(u, v, cornerRadius)) continue;
          covered++;
          if (onMark(54 + (u - 0.5) * viewport, 54 + (v - 0.5) * viewport)) marked++;
        }
      }
      const i = (py * size + px) * 4;
      for (let c = 0; c < 3; c++) {
        pixels[i + c] = covered ? Math.round((GREEN[c] * (covered - marked) + WHITE[c] * marked) / covered) : 0;
      }
      pixels[i + 3] = Math.round((covered / SAMPLES ** 2) * 255);
    }
  }
  return encodePng(size, pixels);
}

function encodePng(size, pixels) {
  const chunk = (type, data) => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type), data])));
    return Buffer.concat([length, Buffer.from(type), data, crc]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header.set([8, 6, 0, 0, 0], 8); // 8-bit RGBA, no interlace
  const rows = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) pixels.copy(rows, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(rows, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// "any" icons are a rounded tile with the mark filling it; the maskable one is
// full-bleed with the mark at Android's size, inside the platform's safe zone;
// iOS fills transparency with black, so its icon is full-bleed too.
const icons = {
  "icon-192.png": draw(192, { viewport: 80, cornerRadius: 0.22 }),
  "icon-512.png": draw(512, { viewport: 80, cornerRadius: 0.22 }),
  "icon-maskable-512.png": draw(512, { viewport: 108, cornerRadius: 0 }),
  "apple-touch-icon.png": draw(180, { viewport: 80, cornerRadius: 0 }),
};

const out = new URL("../public/icons/", import.meta.url);
mkdirSync(out, { recursive: true });
for (const [name, png] of Object.entries(icons)) writeFileSync(new URL(name, out), png);
console.log(`Wrote ${Object.keys(icons).join(", ")} to public/icons/`);
