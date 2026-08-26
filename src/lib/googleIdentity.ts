// Thin wrapper around Google Identity Services' JS SDK
// (https://developers.google.com/identity/gsi/web) — loaded on demand
// rather than unconditionally from index.html, so an app with
// VITE_GOOGLE_CLIENT_ID unset (per .env.example, "leave blank to disable
// Google sign-in") never fetches a third-party script it won't use.
const SCRIPT_SRC = "https://accounts.google.com/gsi/client";

let scriptPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Identity Services."));
    document.head.appendChild(script);
  });

  return scriptPromise;
}

/**
 * Loads the SDK (if needed) and initializes it with `onCredential` as the
 * callback for a completed sign-in. `onCredential` receives the raw Google
 * ID token JWT — exactly what POST /v1/auth/google expects as `idToken`
 * (GoogleIdTokenVerifier verifies it server-side; this client never
 * inspects its contents).
 */
export async function initGoogleIdentity(clientId: string, onCredential: (idToken: string) => void): Promise<void> {
  await loadScript();
  window.google!.accounts.id.initialize({
    client_id: clientId,
    callback: (response) => onCredential(response.credential),
  });
}

export function renderGoogleButton(container: HTMLElement, options?: GoogleButtonConfiguration): void {
  window.google!.accounts.id.renderButton(
    container,
    options ?? { theme: "outline", size: "large", width: 320, text: "continue_with" },
  );
}
