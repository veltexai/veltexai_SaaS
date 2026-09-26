import { NextRequest } from "next/server";

const createClient = jest.fn();
jest.mock("@/lib/supabase/server", () => ({ createClient }));

function queryResult(result: unknown) {
  const query: Record<string, jest.Mock> & { then?: unknown } = {
    select: jest.fn(),
    eq: jest.fn(),
    order: jest.fn(),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.order.mockResolvedValue(result);
  return query;
}

describe("team API auth and privacy", () => {
  beforeEach(() => jest.clearAllMocks());

  it("rejects roster reads before issuing a database query when unauthenticated", async () => {
    const from = jest.fn();
    createClient.mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }) },
      from,
    });
    const { GET } = await import("../members/route");
    const result = await GET(new NextRequest("http://local/api/team/members?organizationId=11111111-1111-4111-8111-111111111111"));
    expect(result.status).toBe(401);
    expect(from).not.toHaveBeenCalled();
  });

  it("returns a roster projection with no email, phone, or profile join", async () => {
    const query = queryResult({
      data: [{
        organization_id: "11111111-1111-4111-8111-111111111111",
        user_id: "22222222-2222-4222-8222-222222222222",
        role: "viewer",
        created_at: "2026-09-25T00:00:00Z",
      }],
      error: null,
    });
    createClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: "33333333-3333-4333-8333-333333333333" } },
          error: null,
        }),
      },
      from: jest.fn().mockReturnValue(query),
    });
    const { GET } = await import("../members/route");
    const result = await GET(new NextRequest("http://local/api/team/members?organizationId=11111111-1111-4111-8111-111111111111"));
    const body = await result.json();
    expect(result.status).toBe(200);
    expect(body.data[0]).toEqual(expect.objectContaining({ name: "Team member", role: "viewer" }));
    expect(body.data[0]).not.toHaveProperty("email");
    expect(body.data[0]).not.toHaveProperty("phone");
    expect(query.select).toHaveBeenCalledWith("organization_id,user_id,role,created_at");
  });
});
