// Verifies course/{code}/v{version}/manifest.json against the manifest_sha256
// bootstrap hands back (API_SPEC.md §2.1). Only the root manifest is
// verified this way — see types/content.ts's header comment for why child
// artifacts aren't individually hashed.

async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export class ManifestHashMismatchError extends Error {
  constructor(expected: string, actual: string) {
    super(`Manifest hash mismatch: expected ${expected}, got ${actual}`);
    this.name = "ManifestHashMismatchError";
  }
}

/** Fetches `url`, verifies its SHA-256 against `expectedHex`, and returns the parsed JSON body. */
export async function fetchAndVerifyJson<T>(url: string, expectedHex: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`);
  const bytes = await response.arrayBuffer();

  const actualHex = await sha256Hex(bytes);
  if (actualHex.toLowerCase() !== expectedHex.toLowerCase()) {
    throw new ManifestHashMismatchError(expectedHex, actualHex);
  }

  return JSON.parse(new TextDecoder().decode(bytes)) as T;
}
