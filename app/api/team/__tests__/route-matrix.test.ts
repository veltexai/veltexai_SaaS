import { NextRequest } from "next/server";

const createClient = jest.fn();
jest.mock("@/lib/supabase/server", () => ({ createClient }));

const USER_ID = "33333333-3333-4333-8333-333333333333";
const ORG_ID = "11111111-1111-4111-8111-111111111111";

function query(result: unknown) {
  const value: Record<string, jest.Mock> = {};
  for (const method of ["select", "eq", "update", "maybeSingle", "single", "order"]) {
    value[method] = jest.fn().mockReturnValue(value);
  }
  value.maybeSingle.mockResolvedValue(result);
  value.single.mockResolvedValue(result);
  value.then = jest.fn((resolve) => Promise.resolve(result).then(resolve));
  return value;
}

function signedIn(from: jest.Mock) {
  createClient.mockResolvedValue({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: USER_ID } },
        error: null,
      }),
    },
    from,
  });
}

describe("team route matrix", () => {
  beforeEach(() => jest.clearAllMocks());

  it.each(["organizations", "capabilities"])(
    "requires authentication for %s",
    async (route) => {
      const from = jest.fn();
      createClient.mockResolvedValue({
        auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }) },
        from,
      });
      const handler = route === "organizations"
        ? (await import("../organizations/route")).GET
        : (await import("../capabilities/route")).GET;
      const response = await handler();
      expect(response.status).toBe(401);
      expect(from).not.toHaveBeenCalled();
    },
  );

  it("returns only the capability flags authorized by the server", async () => {
    signedIn(jest.fn());
    const { GET } = await import("../capabilities/route");
    const response = await GET();
    await expect(response.json()).resolves.toEqual({
      data: { invitationsEnabled: false, contactDetailsEnabled: false },
    });
  });

  it("returns organizations through the caller-bound membership query", async () => {
    const memberships = query({
      data: [{ organizations: { id: ORG_ID, name: "Org", slug: "org" } }],
      error: null,
    });
    const from = jest.fn().mockReturnValue(memberships);
    signedIn(from);
    const { GET } = await import("../organizations/route");
    const response = await GET();
    expect(response.status).toBe(200);
    expect(from).toHaveBeenCalledWith("organization_memberships");
    expect(memberships.eq).toHaveBeenCalledWith("user_id", USER_ID);
  });

  it.each([
    ["malformed JSON", "{", 400],
    ["invalid UUID", JSON.stringify({ organizationId: "not-a-uuid" }), 400],
  ])("rejects active PATCH %s", async (_label, body, status) => {
    signedIn(jest.fn());
    const { PATCH } = await import("../active-organization/route");
    const response = await PATCH(new NextRequest("http://local/api/team/active-organization", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body,
    }));
    expect(response.status).toBe(status);
  });

  it("denies switching when caller membership is absent", async () => {
    const membership = query({ data: null, error: null });
    const from = jest.fn().mockReturnValue(membership);
    signedIn(from);
    const { PATCH } = await import("../active-organization/route");
    const response = await PATCH(request());
    expect(response.status).toBe(403);
    expect(from).toHaveBeenCalledTimes(1);
  });

  it("confirms the affected profile row before reporting switch success", async () => {
    const membership = query({ data: { organization_id: ORG_ID }, error: null });
    const update = query({ data: { active_organization_id: ORG_ID }, error: null });
    const from = jest.fn().mockReturnValueOnce(membership).mockReturnValueOnce(update);
    signedIn(from);
    const { PATCH } = await import("../active-organization/route");
    const response = await PATCH(request());
    expect(response.status).toBe(200);
    expect(update.update).toHaveBeenCalledWith({ active_organization_id: ORG_ID });
    expect(update.select).toHaveBeenCalledWith("active_organization_id");
  });

  it("fails closed when an RLS-filtered update affects zero rows", async () => {
    const membership = query({ data: { organization_id: ORG_ID }, error: null });
    const update = query({ data: null, error: null });
    signedIn(jest.fn().mockReturnValueOnce(membership).mockReturnValueOnce(update));
    const { PATCH } = await import("../active-organization/route");
    expect((await PATCH(request())).status).toBe(503);
  });

  it("maps the membership trigger rejection to the safe denial response", async () => {
    const membership = query({ data: { organization_id: ORG_ID }, error: null });
    const update = query({ data: null, error: { code: "42501", message: "private" } });
    signedIn(jest.fn().mockReturnValueOnce(membership).mockReturnValueOnce(update));
    const { PATCH } = await import("../active-organization/route");
    const response = await PATCH(request());
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "You do not have access to that organization.",
    });
  });
});

function request() {
  return new NextRequest("http://local/api/team/active-organization", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ organizationId: ORG_ID }),
  });
}
