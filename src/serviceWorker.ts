/**
 * Registers public/sw.js, which lets the installed app open offline and the
 * grader start offline. Waits for the page to load so the worker's first
 * caching doesn't compete with it. Best effort.
 */
export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  const base = new URL(import.meta.env.BASE_URL, location.origin);
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(new URL("sw.js", base).href, { scope: base.pathname })
      .catch((error) => console.warn("Couldn't register the offline worker", error));
  });
}
