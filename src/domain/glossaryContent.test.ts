import { describe, expect, it } from "vitest";
import { findGlossaryByRef, glossaryForCourse } from "./glossaryContent";

describe("findGlossaryByRef", () => {
  const entries = glossaryForCourse("fa");

  it("resolves a leaf page by its path", () => {
    expect(findGlossaryByRef(entries, "time/days")?.title).toBe("Days of the Week");
  });

  it("finds nothing for a missing page, a folder or no ref", () => {
    expect(findGlossaryByRef(entries, "numbers/days")).toBeNull();
    expect(findGlossaryByRef(entries, "time")).toBeNull();
    expect(findGlossaryByRef(entries, null)).toBeNull();
    expect(findGlossaryByRef(glossaryForCourse("ja"), "time/days")).toBeNull();
  });
});
