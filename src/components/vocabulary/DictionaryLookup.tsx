import wiktionaryIconUrl from "../../assets/dictionaries/wiktionary.png";
import vajehyabIconUrl from "../../assets/dictionaries/vajehyab.svg";
import { OpenInNewIcon } from "../common/icons";
import styles from "./DictionaryLookup.module.css";

/**
 * Links that search a word on outside dictionaries, shown under a Whole course
 * search that matches nothing.
 *
 * Links only, by design: each opens the site's own page, unmodified, in a new
 * tab. Vajehyab's terms (vajehyab.com/terms) forbid machine use of their
 * services, embedding their web services elsewhere and ad blocking, so this
 * must never fetch, scrape or frame them. The icons are bundled rather than
 * hotlinked, so no request reaches either site until a link is clicked.
 */
export interface Dictionary {
  name: string;
  iconUrl: string;
  url: (query: string) => string;
}

export const DICTIONARIES: Dictionary[] = [
  {
    name: "Wiktionary",
    iconUrl: wiktionaryIconUrl,
    url: (q) => `https://en.wiktionary.org/w/index.php?search=${encodeURIComponent(q)}&go=Go`,
  },
  {
    name: "Vajehyab",
    iconUrl: vajehyabIconUrl,
    url: (q) => `https://vajehyab.com/w/${encodeURIComponent(q)}`,
  },
];

export function DictionaryLookup({ query }: { query: string }) {
  const q = query.trim();
  return (
    <div className={styles.wrap}>
      <p className={styles.prompt}>Look up “{q}” in:</p>
      {DICTIONARIES.map((d) => (
        <a
          key={d.name}
          className={styles.link}
          href={d.url(q)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Look up “${q}” in ${d.name} (opens in a new tab)`}
        >
          <img className={styles.siteIcon} src={d.iconUrl} alt="" width={24} height={24} />
          <span className={styles.name}>{d.name}</span>
          <OpenInNewIcon className={styles.external} />
        </a>
      ))}
    </div>
  );
}
