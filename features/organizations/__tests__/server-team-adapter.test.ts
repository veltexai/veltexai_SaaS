import { ServerTeamAdapter } from "../lib/server-team-adapter";

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("ServerTeamAdapter", () => {
  it("uses only authenticated same-origin read/switch endpoints", async () => {
    const request = jest
      .fn()
      .mockResolvedValueOnce(response({ data: [{ id: "o1", name: "One", slug: "one" }] }))
      .mockResolvedValueOnce(response({ data: "o1" }))
      .mockResolvedValueOnce(response({ data: null }));
    const adapter = new ServerTeamAdapter(request);

    await expect(adapter.listOrganizations()).resolves.toHaveLength(1);
    await expect(adapter.getActiveOrganizationId()).resolves.toBe("o1");
    await expect(adapter.setActiveOrganizationId("o2")).resolves.toBeUndefined();
    expect(request).toHaveBeenLastCalledWith(
      "/api/team/active-organization",
      expect.objectContaining({ method: "PATCH", body: '{"organizationId":"o2"}' }),
    );
  });

  it("fails capabilities closed on transport or response errors", async () => {
    const adapter = new ServerTeamAdapter(jest.fn().mockRejectedValue(new Error("offline")));
    await expect(adapter.getCapabilities()).resolves.toEqual({
      invitationsEnabled: false,
      contactDetailsEnabled: false,
    });
  });

  it("has no invitation write path even when called directly", async () => {
    const request = jest.fn();
    const adapter = new ServerTeamAdapter(request);
    await expect(
      adapter.inviteMember({ organizationId: "o1", email: "x@example.com", role: "admin" }),
    ).rejects.toThrow(/not available/i);
    expect(request).not.toHaveBeenCalled();
  });

  it("rejects a failed switch so callers retain their previous selection", async () => {
    const adapter = new ServerTeamAdapter(
      jest.fn().mockResolvedValue(response({ error: "You do not have access to that organization." }, 403)),
    );
    await expect(adapter.setActiveOrganizationId("forbidden")).rejects.toThrow(
      "You do not have access to that organization.",
    );
  });
});
