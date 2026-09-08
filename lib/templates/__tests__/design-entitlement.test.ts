import { userCanAccessTemplate } from "../design-entitlement";

const createClient = jest.fn();

jest.mock("@/lib/supabase/server", () => ({
  createClient: (...args: unknown[]) => createClient(...args),
}));

const LUXURY_ID = "11111111-1111-4111-8111-111111111111";

type ProfileRow = {
  subscription_plan: string | null;
  subscription_status: string | null;
} | null;

type TemplateRow = {
  id: string;
  template_tier_access: Array<{ subscription_tier: string }>;
} | null;

/**
 * Minimal stand-in for the two `.single()` chains the helper runs: one against
 * `profiles`, one against `proposal_templates`.
 */
function mockSupabase(options: {
  profile?: ProfileRow;
  profileError?: unknown;
  template?: TemplateRow;
  templateError?: unknown;
}) {
  createClient.mockResolvedValue({
    from(table: string) {
      const result =
        table === "profiles"
          ? { data: options.profile ?? null, error: options.profileError ?? null }
          : { data: options.template ?? null, error: options.templateError ?? null };

      const chain: Record<string, unknown> = {
        select: () => chain,
        eq: () => chain,
        single: () => Promise.resolve(result),
      };
      return chain;
    },
  });
}

const luxuryTemplate: TemplateRow = {
  id: LUXURY_ID,
  template_tier_access: [{ subscription_tier: "enterprise" }],
};

const executiveTemplate: TemplateRow = {
  id: LUXURY_ID,
  template_tier_access: [
    { subscription_tier: "professional" },
    { subscription_tier: "enterprise" },
  ],
};

beforeEach(() => {
  createClient.mockReset();
});

describe("userCanAccessTemplate", () => {
  it("denies a starter user a design their plan does not include", async () => {
    mockSupabase({
      profile: { subscription_plan: "starter", subscription_status: "active" },
      template: luxuryTemplate,
    });

    await expect(userCanAccessTemplate("user-1", LUXURY_ID)).resolves.toBe(
      false,
    );
  });

  it("allows an enterprise user the same design", async () => {
    mockSupabase({
      profile: {
        subscription_plan: "enterprise",
        subscription_status: "active",
      },
      template: luxuryTemplate,
    });

    await expect(userCanAccessTemplate("user-1", LUXURY_ID)).resolves.toBe(true);
  });

  it("allows a free trial Executive Premium despite a 'starter' plan column", async () => {
    mockSupabase({
      profile: {
        subscription_plan: "starter",
        subscription_status: "free_trial",
      },
      template: executiveTemplate,
    });

    await expect(userCanAccessTemplate("user-1", LUXURY_ID)).resolves.toBe(true);
  });

  it("still denies a free trial the enterprise-only designs", async () => {
    mockSupabase({
      profile: {
        subscription_plan: "starter",
        subscription_status: "free_trial",
      },
      template: luxuryTemplate,
    });

    await expect(userCanAccessTemplate("user-1", LUXURY_ID)).resolves.toBe(
      false,
    );
  });

  it("fails closed on an unknown or inactive template", async () => {
    mockSupabase({
      profile: {
        subscription_plan: "enterprise",
        subscription_status: "active",
      },
      template: null,
    });

    await expect(userCanAccessTemplate("user-1", LUXURY_ID)).resolves.toBe(
      false,
    );
  });

  it("fails closed on a template with no tiers assigned", async () => {
    mockSupabase({
      profile: {
        subscription_plan: "enterprise",
        subscription_status: "active",
      },
      template: { id: LUXURY_ID, template_tier_access: [] },
    });

    await expect(userCanAccessTemplate("user-1", LUXURY_ID)).resolves.toBe(
      false,
    );
  });

  it("fails closed on a missing profile or query error", async () => {
    mockSupabase({ profile: null, template: executiveTemplate });
    await expect(userCanAccessTemplate("user-1", LUXURY_ID)).resolves.toBe(
      false,
    );

    mockSupabase({
      profile: {
        subscription_plan: "enterprise",
        subscription_status: "active",
      },
      templateError: { message: "boom" },
    });
    await expect(userCanAccessTemplate("user-1", LUXURY_ID)).resolves.toBe(
      false,
    );
  });

  it("fails closed on an empty template id without querying", async () => {
    await expect(userCanAccessTemplate("user-1", "")).resolves.toBe(false);
    expect(createClient).not.toHaveBeenCalled();
  });
});
