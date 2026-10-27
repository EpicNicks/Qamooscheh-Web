import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { VerbIndexEntry } from "../../types/content";
import { availableTenses, verbRows } from "../../domain/verbForms";
import { VerbFormsHeading, VerbFormsTable } from "./VerbFormsTable";

const entry: VerbIndexEntry = {
  infinitive: "کار کردن",
  prefix: "کار",
  presentStem: "کن",
  pastStem: "کرد",
  principalParts: ["کار کردن", "کار کرد", "کار کن"],
  table: {
    present: {
      "1s": { written: "کار می‌کنم", spoken: "کار می‌کنم", negative: "کار نمی‌کنم", negativeSpoken: "کار نمی‌کنم" },
      "2s": { written: "کار می‌کنی", spoken: null, negative: "کار نمی‌کنی", negativeSpoken: null },
    },
    imperative: {
      "2p": { written: "کار کنید", spoken: null, negative: "کار نکنید", negativeSpoken: null },
    },
    future: {
      "3s": { written: "کار خواهد کرد", spoken: null, negative: "کار نخواهد کرد", negativeSpoken: null },
    },
  },
};

describe("verbRows", () => {
  it("lists the persons a tense has, in person order", () => {
    expect(verbRows(entry, "present", false).map((r) => r.person)).toEqual(["1s", "2s"]);
    expect(verbRows(entry, "imperative", false).map((r) => r.person)).toEqual(["2p"]);
  });

  it("switches to the negative forms", () => {
    expect(verbRows(entry, "present", true)[0].written).toBe("کار نمی‌کنم");
  });

  it("is empty for a tense the entry lacks", () => {
    expect(verbRows(entry, "subjunctive", false)).toEqual([]);
  });
});

describe("availableTenses", () => {
  it("keeps teaching order and skips tenses without a table", () => {
    expect(availableTenses(entry).map((t) => t.tense)).toEqual(["present", "imperative", "future"]);
  });
});

describe("VerbFormsTable", () => {
  it("renders a row per person with RTL Persian cells and a spoken column", () => {
    const html = renderToStaticMarkup(createElement(VerbFormsTable, { entry, tense: "present", negative: false }));
    expect(html).toContain("<th scope=\"col\">Spoken</th>");
    expect(html).toContain("کار می‌کنی");
    expect(html.match(/dir="rtl"/g)).toHaveLength(4);
    expect(html.match(/<tr>/g)).toHaveLength(3);
  });

  it("omits the spoken column when no row has one, and shows negatives on request", () => {
    const html = renderToStaticMarkup(createElement(VerbFormsTable, { entry, tense: "future", negative: true }));
    expect(html).not.toContain("Spoken");
    expect(html).toContain("کار نخواهد کرد");
    expect(html).not.toContain("کار خواهد کرد");
  });
});

describe("VerbFormsHeading", () => {
  it("shows the infinitive with its English gloss beneath", () => {
    const html = renderToStaticMarkup(createElement(VerbFormsHeading, { entry: { ...entry, gloss: "to work" }, titleId: "t" }));
    expect(html).toContain('<h2 id="t"');
    expect(html).toContain("کار کردن");
    expect(html).toContain(">to work</p>");
  });

  it("shows just the infinitive when the course authors no gloss", () => {
    for (const gloss of [null, undefined]) {
      const html = renderToStaticMarkup(createElement(VerbFormsHeading, { entry: { ...entry, gloss } }));
      expect(html).toContain("کار کردن");
      expect(html).not.toContain("<p");
    }
  });
});

describe("VerbFormsTable romanization", () => {
  it("titles a form with its romanization when the cell has one", () => {
    const romanized: VerbIndexEntry = {
      ...entry,
      table: { present: { "1s": { ...entry.table.present!["1s"]!, writtenRomanization: "kār mikonam", spokenRomanization: "kār mikonam" } } },
    };
    const html = renderToStaticMarkup(createElement(VerbFormsTable, { entry: romanized, tense: "present", negative: false }));
    expect(html).toContain('title="kār mikonam"');
  });

  it("renders plain text when there is none", () => {
    const html = renderToStaticMarkup(createElement(VerbFormsTable, { entry, tense: "present", negative: false }));
    expect(html).not.toContain("title=");
  });
});
