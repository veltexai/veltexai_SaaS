import { userCanAccessTemplate } from "../design-entitlement";

const createClient = jest.fn();

jest.mock("@/lib/supabase/server", () => ({
  createClient: (...args: unknown[]) => createClient(...args),
}));

const LUXURY_ID = "11111111-1111-4111-8111-111111111111";

/** Minimal stand-in for the authoritative database entitlement RPC. */
function mockSupabase(data: boolean | null, error: unknown = null) {
  createClient.mockResolvedValue({
    rpc: jest.fn().mockResolvedValue({ data, error }),
  });
}

beforeEach(() => {
  createClient.mockReset();
});

describe("userCanAccessTemplate", () => {
  it("denies a starter user a design their plan does not include", async () => {
    mockSupabase(false);

    await expect(userCanAccessTemplate("user-1", LUXURY_ID)).resolves.toBe(
      false,
    );
  });

  it("allows an enterprise user the same design", async () => {
    mockSupabase(true);

    await expect(userCanAccessTemplate("user-1", LUXURY_ID)).resolves.toBe(true);
  });

  it("allows a free trial Executive Premium despite a 'starter' plan column", async () => {
    mockSupabase(true);

    await expect(userCanAccessTemplate("user-1", LUXURY_ID)).resolves.toBe(true);
  });

  it("still denies a free trial the enterprise-only designs", async () => {
    mockSupabase(false);

    await expect(userCanAccessTemplate("user-1", LUXURY_ID)).resolves.toBe(
      false,
    );
  });

  it("fails closed on an unknown or inactive template", async () => {
    mockSupabase(false);

    await expect(userCanAccessTemplate("user-1", LUXURY_ID)).resolves.toBe(
      false,
    );
  });

  it("fails closed on a template with no tiers assigned", async () => {
    mockSupabase(false);

    await expect(userCanAccessTemplate("user-1", LUXURY_ID)).resolves.toBe(
      false,
    );
  });

  it("fails closed on a missing profile or query error", async () => {
    mockSupabase(false);
    await expect(userCanAccessTemplate("user-1", LUXURY_ID)).resolves.toBe(
      false,
    );

    mockSupabase(null, { message: "boom" });
    await expect(userCanAccessTemplate("user-1", LUXURY_ID)).resolves.toBe(
      false,
    );
  });

  it("fails closed on an empty template id without querying", async () => {
    await expect(userCanAccessTemplate("user-1", "")).resolves.toBe(false);
    expect(createClient).not.toHaveBeenCalled();
  });
});
