import { useState } from "react";
import { Link } from "react-router-dom";
import type { GlossaryEntry } from "../../domain/glossaryContent";
import styles from "./GlossaryTree.module.css";

/**
 * One node in the tree. A node with children is a folder: clicking its
 * header toggles an in-place accordion of its own children rather than
 * navigating, since it has no content of its own to show. A leaf (no
 * children) is a real page — a Link, so it pushes a history entry the
 * browser's own back/forward already understands, and GlossaryEntryPage's
 * back button falls out of that for free.
 */
function GlossaryNode({ entry, parentPath }: { entry: GlossaryEntry; parentPath: string[] }) {
  const [open, setOpen] = useState(true);
  const path = [...parentPath, entry.id];
  const hasChildren = !!entry.children?.length;

  if (!hasChildren) {
    return (
      <Link to={`/glossary/${path.join("/")}`} className={styles.leaf}>
        {entry.title}
      </Link>
    );
  }

  return (
    <div className={styles.node}>
      <button type="button" className={styles.header} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className={styles.chevron} data-open={open} aria-hidden="true">
          ›
        </span>
        {entry.title}
      </button>
      {open && (
        <div className={styles.children}>
          {entry.children!.map((child) => (
            <GlossaryNode key={child.id} entry={child} parentPath={path} />
          ))}
        </div>
      )}
    </div>
  );
}

export function GlossaryTree({ entries }: { entries: GlossaryEntry[] }) {
  return (
    <div className={styles.tree}>
      {entries.map((entry) => (
        <GlossaryNode key={entry.id} entry={entry} parentPath={[]} />
      ))}
    </div>
  );
}
