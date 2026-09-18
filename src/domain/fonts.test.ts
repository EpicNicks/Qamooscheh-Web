import { describe, expect, it } from "vitest";
import { resolveFontStack } from "./fonts";

describe("resolveFontStack", () => {
  it("returns the plain fallback tail when nothing is chosen", () => {
    expect(resolveFontStack("fa", null)).toBe("'Vazirmatn', 'Noto Naskh Arabic', Tahoma, 'Segoe UI', sans-serif");
  });

  it("puts a chosen family in front of the same fallback tail", () => {
    expect(resolveFontStack("fa", "Segoe UI")).toBe("'Segoe UI', 'Vazirmatn', 'Noto Naskh Arabic', Tahoma, 'Segoe UI', sans-serif");
  });

  it("only quotes a family name that needs it", () => {
    expect(resolveFontStack("latin", "Arial")).toMatch(/^Arial,/);
    expect(resolveFontStack("latin", "Times New Roman")).toMatch(/^'Times New Roman',/);
  });
});
