import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { FriendProfileView } from "./FriendProfilePage";

const friend = { userId: "a", displayName: "Sara", username: "sara_k", since: "2026-03-05T12:00:00Z" };
const render = (resolution: Parameters<typeof FriendProfileView>[0]["resolution"]) =>
  renderToStaticMarkup(
    <MemoryRouter>
      <FriendProfileView resolution={resolution} />
    </MemoryRouter>,
  );

describe("FriendProfileView", () => {
  it("renders the friend with handle, and the league card when present", () => {
    const html = render({ status: "found", friend, league: { rank: 2, points: 40 } });
    expect(html).toContain("Sara");
    expect(html).toContain("@sara_k");
    expect(html).toContain("In your league this week");
    expect(html).toContain("Rank 2");
    expect(html).toContain('href="/friends"');
  });
  it("omits the league card when not applicable", () => {
    expect(render({ status: "found", friend, league: null })).not.toContain("In your league");
  });
  it("shows a friendly state for an unknown id", () => {
    const html = render({ status: "unknown" });
    expect(html).toContain("Friend not found");
    expect(html).toContain('href="/friends"');
    expect(html).not.toContain('role="alert"');
  });
});
