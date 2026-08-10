import { verifySharedSecret, SECRET_HEADER } from "../src/auth";

const SECRET = "a-sufficiently-long-100d-secret-value";

describe("100D shared-secret webhook auth", () => {
  it("uses the dedicated custom header name", () => {
    expect(SECRET_HEADER).toBe("x-veltex-100d-secret");
  });
  it("rejects a missing credential", () => {
    expect(verifySharedSecret(undefined, SECRET).ok).toBe(false);
    expect(verifySharedSecret(null, SECRET).ok).toBe(false);
  });
  it("rejects a blank credential", () => {
    expect(verifySharedSecret("   ", SECRET).ok).toBe(false);
    expect(verifySharedSecret("", SECRET).ok).toBe(false);
  });
  it("rejects an incorrect credential", () => {
    expect(verifySharedSecret("wrong-secret-value-wrong-secret", SECRET).ok).toBe(false);
    expect(verifySharedSecret(SECRET + "x", SECRET).ok).toBe(false);
  });
  it("accepts the correct credential (trimmed)", () => {
    expect(verifySharedSecret(SECRET, SECRET).ok).toBe(true);
    expect(verifySharedSecret(`  ${SECRET}  `, SECRET).ok).toBe(true);
  });
  it("fails closed when the server secret is unset or too weak", () => {
    expect(verifySharedSecret(SECRET, undefined).ok).toBe(false);
    expect(verifySharedSecret("short", "short").ok).toBe(false); // < 16 chars server secret
  });
  it("compares via fixed-width digests (timing-safe path) regardless of provided length", () => {
    // Different-length inputs must not throw and must simply return false, never leak length via a throw.
    expect(() => verifySharedSecret("x", SECRET)).not.toThrow();
    expect(verifySharedSecret("x", SECRET).ok).toBe(false);
    const long = "z".repeat(5000);
    expect(() => verifySharedSecret(long, SECRET)).not.toThrow();
    expect(verifySharedSecret(long, SECRET).ok).toBe(false);
  });
});
