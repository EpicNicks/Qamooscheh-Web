import { describe, expect, it } from "vitest";
import { DEFAULT_LESSON_ORIGIN, libraryOrigin, resolveLessonOrigin, withLessonOrigin } from "./lessonOrigin";
import { sideSkillRoute } from "./skillRoute";

describe("resolveLessonOrigin", () => {
  it("defaults to the path when absent", () => {
    expect(resolveLessonOrigin(null)).toBe(DEFAULT_LESSON_ORIGIN);
    expect(resolveLessonOrigin("")).toBe(DEFAULT_LESSON_ORIGIN);
  });

  it("names the Library page it came from", () => {
    expect(resolveLessonOrigin("/library/listening")).toEqual({ to: "/library/listening", label: "Back to listening" });
    expect(resolveLessonOrigin("/library/story")).toEqual({ to: "/library/story", label: "Back to stories" });
    expect(resolveLessonOrigin("/library/song").label).toBe("Back to songs");
    expect(resolveLessonOrigin("/library/conversation").label).toBe("Back to conversations");
  });

  it.each([
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "javascript:alert(1)",
    "/library/standard",
    "/library/nope",
    "/library/listening/extra",
    "/library/listening?x=1",
    "/library/__proto__",
    "/library/constructor",
    "/profile",
    "path",
  ])("ignores %s", (raw) => {
    expect(resolveLessonOrigin(raw)).toBe(DEFAULT_LESSON_ORIGIN);
  });
});

describe("withLessonOrigin", () => {
  it("adds from with ? or & as the route needs", () => {
    expect(withLessonOrigin("/practice/u1/s1", "/library/listening")).toBe("/practice/u1/s1?from=%2Flibrary%2Flistening");
    expect(withLessonOrigin("/practice/u1/s1?first=1", "/library/listening")).toBe("/practice/u1/s1?first=1&from=%2Flibrary%2Flistening");
  });

  it("leaves the route alone for a missing, default or invalid origin", () => {
    expect(withLessonOrigin("/practice/u1/s1?first=1", undefined)).toBe("/practice/u1/s1?first=1");
    expect(withLessonOrigin("/practice/u1/s1", "/path")).toBe("/practice/u1/s1");
    expect(withLessonOrigin("/practice/u1/s1", "https://evil.example")).toBe("/practice/u1/s1");
  });
});

describe("sideSkillRoute from a Library page", () => {
  const from = libraryOrigin("listening");
  it("keeps first=1 and adds from", () => {
    expect(sideSkillRoute({ category: "listening", unitKey: "u1", skillKey: "l1", completed: false }, from)).toBe(
      "/practice/u1/l1?first=1&from=%2Flibrary%2Flistening",
    );
    expect(sideSkillRoute({ category: "listening", unitKey: "u1", skillKey: "l1", completed: true }, from)).toBe("/practice/u1/l1?from=%2Flibrary%2Flistening");
  });
  it("covers stories, conversations and songs", () => {
    expect(sideSkillRoute({ category: "story", unitKey: "u1", skillKey: "s1", completed: false }, libraryOrigin("story"))).toBe("/read/u1/s1?from=%2Flibrary%2Fstory");
    expect(sideSkillRoute({ category: "song", unitKey: "u1", skillKey: "s1", completed: false }, libraryOrigin("song"))).toBe("/story/u1/s1?from=%2Flibrary%2Fsong");
  });
  it("is unchanged without an origin", () => {
    expect(sideSkillRoute({ category: "listening", unitKey: "u1", skillKey: "l1", completed: false })).toBe("/practice/u1/l1?first=1");
  });
});
