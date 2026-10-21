import { describe, expect, it } from "vitest";
import {
  clearCheckpointAttempt,
  clearCheckpointAttempts,
  loadCheckpointAttempt,
  saveCheckpointAttempt,
} from "./checkpointAttempt";
import { safeStorage } from "./safeStorage";
import type { SubmitCheckpointRequest } from "../types/api";

function request(submissionId: string, unit = "u2", skill = "s3"): SubmitCheckpointRequest {
  return {
    submissionId,
    targetUnitKey: unit,
    targetSkillKey: skill,
    courseVersion: 4,
    occurredAt: "2026-09-15T10:00:00Z",
    skills: [{ unitKey: "u1", skillKey: "s1", items: [] }],
  };
}

describe("checkpointAttempt", () => {
  it("round-trips the full request body", () => {
    saveCheckpointAttempt("cp-user-1", request("a"));
    expect(loadCheckpointAttempt("cp-user-1", "u2", "s3")).toEqual(request("a"));
  });

  it("returns null when nothing is saved", () => {
    expect(loadCheckpointAttempt("cp-user-none", "u2", "s3")).toBeNull();
  });

  it("keeps users apart", () => {
    saveCheckpointAttempt("cp-user-2", request("a"));
    expect(loadCheckpointAttempt("cp-user-3", "u2", "s3")).toBeNull();
  });

  it("keeps targets apart and clears only the named one", () => {
    saveCheckpointAttempt("cp-user-4", request("a", "u2", "s3"));
    saveCheckpointAttempt("cp-user-4", request("b", "u2", "s4"));
    clearCheckpointAttempt("cp-user-4", "u2", "s3");
    expect(loadCheckpointAttempt("cp-user-4", "u2", "s3")).toBeNull();
    expect(loadCheckpointAttempt("cp-user-4", "u2", "s4")?.submissionId).toBe("b");
  });

  it("overwrites an earlier attempt for the same target", () => {
    saveCheckpointAttempt("cp-user-5", request("a"));
    saveCheckpointAttempt("cp-user-5", request("b"));
    expect(loadCheckpointAttempt("cp-user-5", "u2", "s3")?.submissionId).toBe("b");
  });

  it("clears every target for a user", () => {
    saveCheckpointAttempt("cp-user-6", request("a", "u2", "s3"));
    saveCheckpointAttempt("cp-user-6", request("b", "u2", "s4"));
    clearCheckpointAttempts("cp-user-6");
    expect(loadCheckpointAttempt("cp-user-6", "u2", "s4")).toBeNull();
  });

  it("ignores corrupted or non-attempt entries", () => {
    safeStorage.setItem("qamooscheh.checkpointAttempts.cp-user-7", "{not json");
    expect(loadCheckpointAttempt("cp-user-7", "u2", "s3")).toBeNull();
    safeStorage.setItem("qamooscheh.checkpointAttempts.cp-user-7", JSON.stringify({ "u2/s3": { submissionId: 1 } }));
    expect(loadCheckpointAttempt("cp-user-7", "u2", "s3")).toBeNull();
  });
});
