import { InMemoryProspectRepository } from "../src/in-memory-repository";
import type { PlacesClient } from "../src/types";
import type { ApprovedEnvironment, ApprovedGeography } from "../operator/command";
import { executeOperator, type OperatorFactories } from "../operator/runtime";

const geography: ApprovedGeography = { id: "sea", label: "Seattle, WA", approved: true, approvalReference: "GEO-1" };
const environment: ApprovedEnvironment = { id: "pilot-1", label: "Pilot", expectedSupabaseHostname: "pilot.supabase.co", approved: true, approvalReference: "ENV-1", controlledWritesAllowed: true, type: "pilot" };
const workerJwt = `x.${Buffer.from(JSON.stringify({ role: "veltex_100a_worker" })).toString("base64url")}.x`;
const records: Record<string, unknown>[] = [];
const output = { info: (record: Record<string, unknown>) => records.push(record) };
const emptyPlaces: PlacesClient = { searchText: async () => ({ candidates: [], nextPageToken: null, requestsUsed: 1 }) };
function factories(): OperatorFactories & { createGoogle: jest.Mock; createSupabase: jest.Mock } {
  return {
    createGoogle: jest.fn(() => emptyPlaces),
    createSupabase: jest.fn(() => ({ repository: new InMemoryProspectRepository(), diagnostics: { emit: jest.fn() } })),
  };
}

beforeEach(() => records.splice(0));
describe("operator mode isolation and preflight ordering", () => {
  it("true dry-run makes zero network clients, Supabase clients, and repository writes", async () => {
    const deps = factories();
    const result = await executeOperator(["--mode=dry-run", "--geography=sea", "--target=pilot-1"], {}, [geography], [environment], deps, output);
    expect(deps.createGoogle).not.toHaveBeenCalled(); expect(deps.createSupabase).not.toHaveBeenCalled();
    expect(result).not.toHaveProperty("summary"); expect(records).toContainEqual(expect.objectContaining({ outcome: "validated-no-call", externalClientsConstructed: 0, databaseWrites: 0 }));
  });
  it("google-preview constructs only Google and prints a quota warning", async () => {
    const deps = factories();
    await executeOperator(["--mode=google-preview", "--geography=sea", "--target=pilot-1"], { GOOGLE_PLACES_API_KEY: "key" }, [geography], [environment], deps, output);
    expect(deps.createGoogle).toHaveBeenCalledTimes(1); expect(deps.createSupabase).not.toHaveBeenCalled();
    expect(records).toContainEqual(expect.objectContaining({ event: "operator.warning", warning: expect.stringContaining("quota") }));
  });
  it("constructs no client when environment, geography, limits, credentials, or confirmations fail", async () => {
    const invalidCases: Array<[string[], Record<string,string|undefined>, ApprovedGeography[], ApprovedEnvironment[]]> = [
      [["--mode=dry-run","--geography=sea","--target=bad"], {}, [geography], [environment]],
      [["--mode=google-preview","--geography=bad","--target=pilot-1"], { GOOGLE_PLACES_API_KEY:"key" }, [geography], [environment]],
      [["--mode=google-preview","--geography=sea","--target=pilot-1"], { GOOGLE_PLACES_API_KEY:"key", VELTEX_100A_MAX_PLACES_REQUESTS:"7" }, [geography], [environment]],
      [["--mode=google-preview","--geography=sea","--target=pilot-1"], {}, [geography], [environment]],
      [["--mode=write","--geography=sea","--target=pilot-1"], {}, [geography], [environment]],
    ];
    for (const [args, env, geos, environments] of invalidCases) {
      const deps = factories(); await expect(executeOperator(args, env, geos, environments, deps, output)).rejects.toThrow();
      expect(deps.createGoogle).not.toHaveBeenCalled(); expect(deps.createSupabase).not.toHaveBeenCalled();
    }
  });
  it("write constructs clients only after all gates pass", async () => {
    const deps = factories();
    const env = { GOOGLE_PLACES_API_KEY:"key", VELTEX_100A_ENABLED:"true", VELTEX_100A_TARGET_ENVIRONMENT:"pilot-1", NEXT_PUBLIC_SUPABASE_URL:"https://pilot.supabase.co", NEXT_PUBLIC_SUPABASE_ANON_KEY:"anon", SUPABASE_100A_WORKER_JWT:workerJwt };
    await executeOperator(["--mode=write","--geography=sea","--target=pilot-1","--confirm-target=pilot-1","--confirm-writes=WRITE_MAX_5"], env, [geography], [environment], deps, output);
    expect(deps.createGoogle).toHaveBeenCalledTimes(1); expect(deps.createSupabase).toHaveBeenCalledTimes(1);
  });
  it("redacts recognizable secrets from plans and summaries", async () => {
    const deps = factories(); const secrets = ["GOOGLE-SECRET-123", "ANON-SECRET-456", workerJwt];
    await executeOperator(["--mode=dry-run","--geography=sea","--target=pilot-1"], { GOOGLE_PLACES_API_KEY:secrets[0], NEXT_PUBLIC_SUPABASE_URL:"https://pilot.supabase.co", NEXT_PUBLIC_SUPABASE_ANON_KEY:secrets[1], SUPABASE_100A_WORKER_JWT:secrets[2] }, [geography], [environment], deps, output);
    const serialized = JSON.stringify(records);
    for (const secret of secrets) expect(serialized).not.toContain(secret);
    expect(serialized).toContain('"googleApiKey":true');
    await expect(executeOperator(["--mode=dry-run","--geography=sea","--target=pilot-1"], { NEXT_PUBLIC_SUPABASE_URL:`https://${secrets[1]}.example.com` }, [geography], [environment], deps, output)).rejects.toThrow("project does not match");
    expect(JSON.stringify(records)).not.toContain(secrets[1]);
  });
});
