// Verifies course/{code}/v{version}/manifest.json against the manifest_sha256
// bootstrap hands back (API_SPEC.md §2.1). Only the root manifest is
// verified this way — see types/content.ts's header comment for why child
// artifacts aren't individually hashed.

/**
 * Thrown instead of the bare `TypeError: Cannot read properties of undefined`
 * that `crypto.subtle.digest` would otherwise raise. WebCrypto is only exposed
 * in a secure context, so serving the built bundle over plain http:// to
 * anything but localhost (a phone pointed at http://192.168.x.x, say) leaves
 * `crypto.subtle` undefined and every manifest load failing for a reason
 * nothing on screen explains.
 */
export class InsecureContextError extends Error {
  constructor() {
    super(
      "This page needs a secure context to verify course content: crypto.subtle is unavailable. " +
        "Serve the app over https:// or from http://localhost (plain http:// on a LAN address won't work).",
    );
    this.name = "InsecureContextError";
  }
}

export async function sha256Hex(bytes: BufferSource): Promise<string> {
  if (!globalThis.crypto?.subtle) throw new InsecureContextError();
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

/** Throws unless `bytes` hash to `expectedHex`. */
export async function verifyManifestBytes(bytes: ArrayBuffer, expectedHex: string): Promise<void> {
  const actualHex = await sha256Hex(bytes);
  if (actualHex.toLowerCase() !== expectedHex.toLowerCase()) {
    throw new ManifestHashMismatchError(expectedHex, actualHex);
  }
}
