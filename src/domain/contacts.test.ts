import { describe, expect, it } from "vitest";
import { chunk, contactsErrorCopy, emailsFromPicked, hashEmail, parseEmails } from "./contacts";

describe("parseEmails", () => {
  it("splits on newlines, commas and semicolons, lower-cases and de-duplicates", () => {
    expect(parseEmails("A@x.com, b@y.org\nA@X.com;  c@z.io ")).toEqual(["a@x.com", "b@y.org", "c@z.io"]);
  });

  it("takes the address from a `Name <email>` form", () => {
    expect(parseEmails("Sara K <Sara@X.com>")).toEqual(["sara@x.com"]);
  });

  it("drops anything that is not an email", () => {
    expect(parseEmails("hello\n@x.com\nno@dot\n\n a b@c.com")).toEqual([]);
  });
});

describe("hashEmail", () => {
  it("is the lower-case hex SHA-256 of the address", async () => {
    expect(await hashEmail("a@x.com")).toMatch(/^[0-9a-f]{64}$/);
    expect(await hashEmail("a@x.com")).toBe(await hashEmail("a@x.com"));
    expect(await hashEmail("a@x.com")).not.toBe(await hashEmail("b@x.com"));
  });

  it("matches the standard SHA-256 test vector", async () => {
    expect(await hashEmail("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
});

describe("chunk", () => {
  it("splits into runs of at most `size`", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([], 2)).toEqual([]);
  });
});

describe("contactsErrorCopy", () => {
  it("explains a 429 with or without a retry time", () => {
    expect(contactsErrorCopy(429)).toMatch(/later/);
    expect(contactsErrorCopy(429, "2026-10-18T10:00:00Z")).toMatch(/Try again after/);
  });
});

describe("emailsFromPicked", () => {
  it("flattens every address of every contact, normalized and de-duplicated", () => {
    expect(emailsFromPicked([{ email: ["A@x.com", "a2@x.com"] }, { email: ["a@X.com"] }, {}, { email: ["junk"] }])).toEqual([
      "a@x.com",
      "a2@x.com",
    ]);
  });
});
