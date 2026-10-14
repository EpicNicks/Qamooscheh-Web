// The symbol a lesson tile shows for its main tag. A lesson's main tag is the
// FIRST of its authored `themes` (a convention, not a contract — see
// SkillArtifact.themes). A tag with no symbol of its own borrows its nearest
// ancestor's in themes.json's tree, so a theme skin only has to symbolise the
// tags it cares about plus the roots.
import type { ThemeIndexArtifact } from "../types/content";

/** The symbol for the lesson's main tag, or null when neither it nor any ancestor has one. */
export function mainTagSymbol(
  themes: readonly string[] | undefined,
  symbols: Readonly<Record<string, string>>,
  themeIndex: ThemeIndexArtifact | null | undefined,
): string | null {
  const main = themes?.[0];
  if (!main) return null;

  const parentOf = new Map(themeIndex?.themes.map((t) => [t.id, t.parentId]));
  const seen = new Set<string>();
  for (let id: string | null | undefined = main; id != null && !seen.has(id); id = parentOf.get(id)) {
    seen.add(id);
    if (symbols[id]) return symbols[id];
  }
  return null;
}
