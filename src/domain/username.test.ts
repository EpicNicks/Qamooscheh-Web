import { describe, expect, it } from "vitest";
import {
  actionForRelationship,
  friendErrorCopy,
  normalizeUsername,
  renameErrorCopy,
  usernameFormatProblem,
} from "./username";

describe("normalizeUsername", () => {
  it("trims, drops one leading @ and lower-cases", () => {
    expect(normalizeUsername("  @Sara_K ")).toBe("sara_k");
    expect(normalizeUsername("@@x")).toBe("@x");
  });
});

describe("usernameFormatProblem", () => {
  it("accepts well-formed handles", () => {
    for (const ok of ["abc", "sara_k", "a.b.c", "user12345678", "a".repeat(20)]) {
      expect(usernameFormatProblem(ok)).toBeNull();
    }
  });

  it("rejects bad length, characters and dots", () => {
    for (const bad of ["ab", "a".repeat(21), "Sara", "sa ra", "sa-ra", ".abc", "abc.", "a..b", "سارا"]) {
      expect(usernameFormatProblem(bad)).not.toBeNull();
    }
  });
});

describe("actionForRelationship", () => {
  it("maps every relationship to its one action", () => {
    expect(actionForRelationship("none")).toBe("add");
    expect(actionForRelationship("request_sent")).toBe("pending");
    expect(actionForRelationship("request_received")).toBe("accept");
    expect(actionForRelationship("friends")).toBe("view");
  });

  it("makes a repeated Add idempotent: once sent, the hit offers no Add", () => {
    expect(actionForRelationship("request_sent")).not.toBe("add");
  });
});

describe("friendErrorCopy", () => {
  it("has friendly copy for 429 and 409", () => {
    expect(friendErrorCopy(429)).toMatch(/too fast/);
    expect(friendErrorCopy(409)).toMatch(/can't be sent/);
    expect(friendErrorCopy(null)).toMatch(/try again/);
  });
});

describe("renameErrorCopy", () => {
  it("maps each backend reason", () => {
    expect(renameErrorCopy(400, "invalid")).toMatch(/valid username/);
    expect(renameErrorCopy(400, "reserved")).toMatch(/isn't allowed/);
    expect(renameErrorCopy(409, "taken")).toMatch(/already has/);
    expect(renameErrorCopy(409, "held")).toMatch(/held for 30 days/);
  });

  it("names the date on a cooldown when the server gives one", () => {
    expect(renameErrorCopy(409, "cooldown", "2026-11-13T00:00:00Z")).toMatch(/again on/);
    expect(renameErrorCopy(409, "cooldown")).toBe("You can change your username once every 30 days.");
  });

  it("maps 429 and unknown reasons", () => {
    expect(renameErrorCopy(429, undefined)).toMatch(/Too many/);
    expect(renameErrorCopy(500, undefined)).toMatch(/Couldn't change/);
  });
});
