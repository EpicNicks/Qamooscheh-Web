import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { FriendProfileView } from "./FriendProfilePage";
import type { FriendStatsResponse } from "../types/api";

const base: FriendStatsResponse = {
  userId: "a",
  displayName: "Sara",
  username: "sara_k",
  since: "2026-03-05T12:00:00Z",
  league: { rank: 2, points: 40 },
};
const render = (stats: FriendStatsResponse) =>
  renderToStaticMarkup(
    <MemoryRouter>
      <FriendProfileView stats={stats} onUnfriend={() => {}} />
    </MemoryRouter>,
  );

describe("FriendProfileView", () => {
  it("renders name, handle, stats and the league row when present", () => {
    const html = render(base);
    expect(html.match(/<h1/g)).toHaveLength(1);
    expect(html).toContain("@sara_k");
    expect(html).toContain("<dt>Friends since</dt>");
    expect(html).toContain("Rank 2");
    expect(html).toContain("Unfriend");
  });
  it("omits the league row when null", () => {
    expect(render({ ...base, league: null })).not.toContain("In your league");
  });
});
