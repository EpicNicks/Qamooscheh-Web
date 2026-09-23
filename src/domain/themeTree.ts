// Pure helpers over themes.json's theme tree (ThemeEntry.parentId). The
// artifact itself stays a flat list — these derive the tree shape on demand.
// Every ordering here follows themes.json's own entry order among siblings.
//
// Tolerated malformations: a `parentId` naming a missing id is treated as a
// root (never dropped); a `parentId` cycle never loops forever (walks stop on
// a repeat), though nodes only reachable through a cycle don't appear in
// `buildThemeForest`'s output.
import type { ThemeEntry, ThemeIndexArtifact } from "../types/content";
import { themesForLesson } from "./themeLookup";

export type ThemeNode = ThemeEntry & { children: ThemeNode[] };

/**
 * id -> entry. ASSUMES theme ids are globally unique across the whole tree
 * (no "Past" under two different parents) — an assumption inherited from the
 * pre-tree flat lookups (e.g. ThemeBrowsePage's `.find(t => t.id === themeId)`
 * and the `/themes/:themeId` route itself), not a new one. A duplicate id
 * here resolves to the last entry with that id.
 */
export function indexThemesById(themes: ThemeEntry[]): Map<string, ThemeEntry> {
  return new Map(themes.map((theme) => [theme.id, theme]));
}

/** The effective parent id: null for a root AND for an orphan whose parent is missing from `byId`. */
function effectiveParentId(theme: ThemeEntry, byId: Map<string, ThemeEntry>): string | null {
  return theme.parentId != null && byId.has(theme.parentId) ? theme.parentId : null;
}

/** Direct children of `parentId` (`null` = root tags, orphans included), in themes.json order. */
export function childrenOf(themes: ThemeEntry[], parentId: string | null): ThemeEntry[] {
  const byId = indexThemesById(themes);
  return themes.filter((theme) => effectiveParentId(theme, byId) === parentId);
}

/** The whole tree as nested nodes, roots first. Orphans (missing parent) become roots. */
export function buildThemeForest(themes: ThemeEntry[]): ThemeNode[] {
  const byId = indexThemesById(themes);
  const byParent = new Map<string | null, ThemeEntry[]>();
  for (const theme of themes) {
    const parent = effectiveParentId(theme, byId);
    const siblings = byParent.get(parent);
    if (siblings) siblings.push(theme);
    else byParent.set(parent, [theme]);
  }

  const visited = new Set<string>();
  function build(theme: ThemeEntry): ThemeNode {
    visited.add(theme.id);
    const children = (byParent.get(theme.id) ?? []).filter((child) => !visited.has(child.id)).map(build);
    return { ...theme, children };
  }
  return (byParent.get(null) ?? []).map(build);
}

/** The lesson's top-level tags only — root entries (`parentId === null`, or an orphan whose parent is missing) whose rolled-up `lessons` include it. */
export function rootThemesForLesson(themeIndex: ThemeIndexArtifact | null | undefined, lessonKey: string): ThemeEntry[] {
  if (!themeIndex) return [];
  const byId = indexThemesById(themeIndex.themes);
  return themesForLesson(themeIndex, lessonKey).filter((theme) => effectiveParentId(theme, byId) === null);
}

/** root...id inclusive, or [] when `id` isn't in the index. Stops at a missing parent (orphan) or a cycle. */
export function ancestorsOf(themeIndex: ThemeIndexArtifact | null | undefined, id: string): ThemeEntry[] {
  if (!themeIndex) return [];
  const byId = indexThemesById(themeIndex.themes);
  const chain: ThemeEntry[] = [];
  const seen = new Set<string>();
  let current = byId.get(id);
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    chain.push(current);
    current = current.parentId != null ? byId.get(current.parentId) : undefined;
  }
  return chain.reverse();
}

/**
 * Every tag (at any depth) that lists this lesson, in DFS pre-order, each
 * with its 1-based depth in the full tree (a root is 1). Because `lessons`
 * is rolled up, a tagged node's ancestors are normally all tagged too; if
 * one isn't (non-rolled-up data), the node is still listed — at its true
 * depth — as the start of its own subtree within the result.
 */
export function dfsThemesForLesson(
  themeIndex: ThemeIndexArtifact | null | undefined,
  lessonKey: string,
): Array<{ theme: ThemeEntry; depth: number }> {
  const tagged = themesForLesson(themeIndex, lessonKey);
  if (!themeIndex || tagged.length === 0) return [];

  const taggedIds = new Set(tagged.map((theme) => theme.id));
  const byParent = new Map<string, ThemeEntry[]>();
  const starts: ThemeEntry[] = [];
  for (const theme of tagged) {
    if (theme.parentId != null && taggedIds.has(theme.parentId) && theme.parentId !== theme.id) {
      const siblings = byParent.get(theme.parentId);
      if (siblings) siblings.push(theme);
      else byParent.set(theme.parentId, [theme]);
    } else {
      starts.push(theme);
    }
  }

  const result: Array<{ theme: ThemeEntry; depth: number }> = [];
  const visited = new Set<string>();
  function walk(theme: ThemeEntry, depth: number) {
    if (visited.has(theme.id)) return;
    visited.add(theme.id);
    result.push({ theme, depth });
    for (const child of byParent.get(theme.id) ?? []) walk(child, depth + 1);
  }
  for (const start of starts) walk(start, Math.max(ancestorsOf(themeIndex, start.id).length, 1));
  return result;
}

/**
 * `rootId` plus every descendant, DFS pre-order (children in themes.json's
 * sibling order) — the set that "drag a topic in, its subtopics come too"
 * selection (ThemeRemixPage) toggles together. `[]` when `rootId` isn't in
 * the index. Cycle-safe like the rest of this file.
 */
export function subtreeIds(themes: ThemeEntry[], rootId: string): string[] {
  const byId = indexThemesById(themes);
  if (!byId.has(rootId)) return [];
  const byParent = new Map<string, ThemeEntry[]>();
  for (const theme of themes) {
    const parent = effectiveParentId(theme, byId);
    if (parent == null) continue;
    const siblings = byParent.get(parent);
    if (siblings) siblings.push(theme);
    else byParent.set(parent, [theme]);
  }

  const result: string[] = [];
  const visited = new Set<string>();
  function walk(id: string) {
    if (visited.has(id)) return;
    visited.add(id);
    result.push(id);
    for (const child of byParent.get(id) ?? []) walk(child.id);
  }
  walk(rootId);
  return result;
}

/**
 * Every tag in the whole tree (not lesson-scoped, unlike dfsThemesForLesson),
 * in DFS pre-order over buildThemeForest's output, each with its 1-based
 * depth (a root — or an orphan, which the forest treats as one — is 1).
 * Inherits buildThemeForest's cycle handling: nodes only reachable through a
 * `parentId` cycle are omitted.
 */
export function dfsAllThemes(themes: ThemeEntry[]): Array<{ theme: ThemeEntry; depth: number }> {
  const result: Array<{ theme: ThemeEntry; depth: number }> = [];
  function walk(node: ThemeNode, depth: number) {
    const { children, ...theme } = node;
    result.push({ theme, depth });
    for (const child of children) walk(child, depth + 1);
  }
  for (const root of buildThemeForest(themes)) walk(root, 1);
  return result;
}
