// Starting a browser build of the grader from a directory it is served from.
// The build's own main.mjs is the reference for how it is loaded (it creates
// the .NET WASM runtime and exports `grader`), so that file runs as published.
// Both modules are imported straight from `root`, never from a blob: URL, so
// the page's CSP needs only script-src 'self'. The one thing the caller may
// change is where the runtime's non-script resources (the wasm, the assemblies,
// the boot manifest) come from.
import type { Grader } from "./types.ts";

interface DotnetModule {
  dotnet: {
    withResourceLoader(
      loader: (type: string, name: string, defaultUri: string, integrity?: string, behavior?: string) => string | Promise<Response>,
    ): unknown;
  };
}

const FRAMEWORK = "_framework/";

/** Gives the bytes of a resource by its path under the build ("_framework/dotnet.native.wasm"). */
export type ResourceSource = (path: string) => Promise<Response>;

const MIME: Record<string, string> = {
  wasm: "application/wasm",
  json: "application/json",
};

/** A Response for `bytes` carrying the content type the runtime's streaming compile requires. */
export function resourceResponse(path: string, bytes: Uint8Array): Response {
  const type = MIME[path.slice(path.lastIndexOf(".") + 1)] ?? "application/octet-stream";
  return new Response(bytes as BodyInit, { headers: { "Content-Type": type } });
}

/**
 * @param root absolute URL of the build's directory, no trailing slash
 *   (`https://app.example/grader/fa/v86`, or a file: URL in Node)
 * @param resource where non-script resources come from; omitted, the runtime
 *   fetches them from `root` itself
 */
export async function startGrader(root: string, resource?: ResourceSource): Promise<Grader> {
  const { dotnet } = (await import(/* @vite-ignore */ `${root}/${FRAMEWORK}dotnet.js`)) as DotnetModule;

  // Scripts (dotnet.runtime.js, dotnet.native.js) keep their default URI, so
  // they are imported from root like the two above.
  if (resource) {
    dotnet.withResourceLoader((type, name, defaultUri) =>
      type === "dotnetjs" || /\.m?js$/.test(name) ? defaultUri : resource(`${FRAMEWORK}${name}`),
    );
  }

  // main.mjs imports ./_framework/dotnet.js, which resolves to the very URL
  // above, so it gets the module instance configured here.
  const { grader } = (await import(/* @vite-ignore */ `${root}/main.mjs`)) as { grader: Grader };
  return grader;
}
