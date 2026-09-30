import { NextRequest } from "next/server";

const createClient = jest.fn();
jest.mock("@/lib/supabase/server", () => ({ createClient }));

const PROPOSAL_ID = "11111111-1111-4111-8111-111111111111";
const TRACKING_ID = "22222222-2222-4222-8222-222222222222";

function request(body = "{}") {
  return new NextRequest("http://local/revoke", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
}

function client(
  user: object | null,
  rpcResult: { data: boolean | null; error: { message: string } | null } = {
    data: true,
    error: null,
  },
) {
  const rpc = jest.fn().mockResolvedValue(rpcResult);
  createClient.mockResolvedValue({
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user }, error: null }),
    },
    rpc,
  });
  return rpc;
}

describe("tracked proposal link revocation route", () => {
  beforeEach(() => jest.clearAllMocks());

  it("requires authentication", async () => {
    const rpc = client(null);
    const { POST } = await import("../[trackingId]/revoke/route");
    const response = await POST(request(), {
      params: Promise.resolve({ id: PROPOSAL_ID, trackingId: TRACKING_ID }),
    });
    expect(response.status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects malformed identifiers and reasons", async () => {
    const rpc = client({ id: "user" });
    const { POST } = await import("../[trackingId]/revoke/route");
    const badId = await POST(request(), {
      params: Promise.resolve({ id: "bad", trackingId: TRACKING_ID }),
    });
    const badReason = await POST(request(JSON.stringify({ reason: "x".repeat(241) })), {
      params: Promise.resolve({ id: PROPOSAL_ID, trackingId: TRACKING_ID }),
    });
    expect(badId.status).toBe(400);
    expect(badReason.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("uses the caller-bound RPC without a service-role bypass", async () => {
    const rpc = client({ id: "user" });
    const { POST } = await import("../[trackingId]/revoke/route");
    const response = await POST(request(JSON.stringify({ reason: "Replaced" })), {
      params: Promise.resolve({ id: PROPOSAL_ID, trackingId: TRACKING_ID }),
    });
    expect(response.status).toBe(204);
    expect(rpc).toHaveBeenCalledWith("revoke_tracked_proposal_link", {
      tracking_uuid: TRACKING_ID,
      proposal_uuid: PROPOSAL_ID,
      reason: "Replaced",
    });
  });

  it("makes missing, cross-tenant, and unauthorized records indistinguishable", async () => {
    client({ id: "user" }, { data: false, error: null });
    const { POST } = await import("../[trackingId]/revoke/route");
    const response = await POST(request(), {
      params: Promise.resolve({ id: PROPOSAL_ID, trackingId: TRACKING_ID }),
    });
    expect(response.status).toBe(404);
  });

  it("fails closed on database errors", async () => {
    client({ id: "user" }, { data: null, error: { message: "private" } });
    const { POST } = await import("../[trackingId]/revoke/route");
    const response = await POST(request(), {
      params: Promise.resolve({ id: PROPOSAL_ID, trackingId: TRACKING_ID }),
    });
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "Unable to revoke delivery link" });
  });
});
