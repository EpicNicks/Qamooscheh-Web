import { describe, expect, it } from "vitest";
import { DICTIONARIES } from "./DictionaryLookup";

const urlFor = (name: string, q: string) => DICTIONARIES.find((d) => d.name === name)!.url(q);

describe("DICTIONARIES", () => {
  it("lists Wiktionary first, then Vajehyab", () => {
    expect(DICTIONARIES.map((d) => d.name)).toEqual(["Wiktionary", "Vajehyab"]);
  });

  it("percent-encodes the query into each site's URL", () => {
    expect(urlFor("Wiktionary", "کتاب")).toBe(
      "https://en.wiktionary.org/w/index.php?search=%DA%A9%D8%AA%D8%A7%D8%A8&go=Go",
    );
    expect(urlFor("Vajehyab", "a b/c")).toBe("https://vajehyab.com/w/a%20b%2Fc");
  });
});
