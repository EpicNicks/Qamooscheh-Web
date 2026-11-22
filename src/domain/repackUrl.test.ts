import { describe, expect, it } from "vitest";
import { repackUrl, REVIEW_URL } from "./repackUrl";

describe("repackUrl", () => {
  it("lists the topics, with rough=1 only when Rough spots is ticked", () => {
    expect(repackUrl(["Food", "a b"], false)).toBe("/lesson/deep-dive-remix?themeIds=Food,a%20b");
    expect(repackUrl(["Food"], true)).toBe("/lesson/deep-dive-remix?themeIds=Food&rough=1");
  });

  it("makes Review a Repack of Rough spots alone", () => {
    expect(REVIEW_URL).toBe("/lesson/deep-dive-remix?themeIds=&rough=1");
  });
});
