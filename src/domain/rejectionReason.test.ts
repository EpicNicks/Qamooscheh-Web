import { describe, expect, it } from "vitest";
import { describeRejectionReason } from "./rejectionReason";

describe("describeRejectionReason", () => {
  it("describes known tokens", () => {
    expect(describeRejectionReason("unresolvable_course_version")).toMatch(/no longer available/);
  });

  it("answers null for unknown or missing tokens", () => {
    expect(describeRejectionReason("something_new")).toBeNull();
    expect(describeRejectionReason(null)).toBeNull();
  });
});
