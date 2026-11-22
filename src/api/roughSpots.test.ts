import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./httpClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./httpClient")>()),
  apiFetch: vi.fn(),
}));

import { apiFetch } from "./httpClient";
import { getRoughSpots, ROUGH_SPOT_WORDS } from "./roughSpots";

const apiFetchMock = vi.mocked(apiFetch);

beforeEach(() => apiFetchMock.mockReset());

describe("getRoughSpots", () => {
  it("asks for the default word count and sends no listening filter", async () => {
    apiFetchMock.mockResolvedValue({ courseVersion: 3, words: [] });
    await getRoughSpots();
    expect(apiFetchMock).toHaveBeenCalledWith(`/v1/sessions/rough-spots?words=${ROUGH_SPOT_WORDS}`);
  });
});
