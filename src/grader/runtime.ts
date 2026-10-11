// Starting a verified browser build of the grader. The build's own main.mjs
// is the reference for how it is loaded (it creates the .NET WASM runtime and
// exports `grader`), so that file runs as published; only where its bytes
// come from changes. The files were fetched and hash-checked by bundle.ts, so
// the runtime is told to take every resource from them (withResourceLoader)
// instead of fetching from the network again, and the modules it imports are
// handed to it as URLs minted by the caller (blob: URLs in the app).
import type { GraderBundle } from "./bundle.ts";
import type { Grader } from "./types.ts";

/** Turns a module's source into something `import()` accepts. */
export type ModuleUrlFactory = (source: string, path: string) => string;

interface DotnetModule {
  dotnet: {
    withResourceLoader(
      loader: (type: string, name: string, defaultUri: string, integrity?: string, behavior?: string) => string | Promise<Response> | null,
    ): unknown;
  };
}

const MAIN = "main.mjs";
const FRAMEWORK = "_framework/";
const DOTNET_IMPORT = /(from\s*)(['"])\.\/_framework\/dotnet\.js\2/;

const MIME: Record<string, string> = {
  wasm: "application/wasm",
  json: "application/json",
  js: "text/javascript",
};

function mimeOf(path: string): string {
  return MIME[path.slice(path.lastIndexOf(".") + 1)] ?? "application/octet-stream";
}

export async function startGrader(bundle: GraderBundle, moduleUrl: ModuleUrlFactory): Promise<Grader> {
  const decode = (path: string) => {
    const bytes = bundle.files.get(path);
    if (!bytes) throw new Error(`Grader build v${bundle.manifest.version} has no ${path}`);
    return new TextDecoder().decode(bytes);
  };

  const dotnetUrl = moduleUrl(decode(`${FRAMEWORK}dotnet.js`), `${FRAMEWORK}dotnet.js`);
  const { dotnet } = (await import(/* @vite-ignore */ dotnetUrl)) as DotnetModule;

  // The runtime asks for its boot manifest, its own scripts, the native
  // runtime and every assembly by file name under _framework/.
  dotnet.withResourceLoader((type, name) => {
    const path = `${FRAMEWORK}${name}`;
    const bytes = bundle.files.get(path);
    if (!bytes) throw new Error(`Grader build v${bundle.manifest.version} has no ${path} (${type})`);
    return mimeOf(path) === "text/javascript"
      ? moduleUrl(decode(path), path)
      : Promise.resolve(new Response(bytes as BodyInit, { headers: { "Content-Type": mimeOf(path) } }));
  });

  // main.mjs imports dotnet.js by relative path; pointed at the same URL it
  // gets the module instance configured above.
  const main = decode(MAIN);
  if (!DOTNET_IMPORT.test(main)) throw new Error(`Grader build v${bundle.manifest.version}: main.mjs no longer imports ./_framework/dotnet.js`);
  const mainUrl = moduleUrl(main.replace(DOTNET_IMPORT, `$1$2${dotnetUrl}$2`), MAIN);
  const { grader } = (await import(/* @vite-ignore */ mainUrl)) as { grader: Grader };
  return grader;
}
