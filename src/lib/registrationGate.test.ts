import { describe, expect, it } from "vitest";
import { registrationGate } from "./registrationGate";

describe("registrationGate", () => {
  it("is pending before the first answer", () => {
    expect(registrationGate({ data: undefined, isPending: true })).toBe("pending");
  });

  it("follows the server's answer", () => {
    expect(registrationGate({ data: { enabled: true }, isPending: false })).toBe("open");
    expect(registrationGate({ data: { enabled: false }, isPending: false })).toBe("closed");
  });

  // The regression: a failed check left `data` undefined and `isPending`
  // false, which the pages read as "not closed" and showed the sign-up form.
  it("is unknown, not open, when the check failed with no answer", () => {
    expect(registrationGate({ data: undefined, isPending: false })).toBe("unknown");
  });
});
