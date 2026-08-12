import { createUnsubscribeToken, verifyUnsubscribeToken } from "../src/unsubscribe-token";

describe("unsubscribe token", () => {
  it("round trips without putting the email in plaintext", () => {
    const token = createUnsubscribeToken("Person@Example.com", "test-secret", 1_700_000_000_000);
    expect(token).not.toContain("Person@Example.com");
    expect(verifyUnsubscribeToken(token, "test-secret", 1_700_000_001_000)).toBe("person@example.com");
  });
  it("rejects tampering, wrong secrets, and expiry", () => {
    const token = createUnsubscribeToken("person@example.com", "test-secret", 1_700_000_000_000, 10);
    expect(verifyUnsubscribeToken(`${token}x`, "test-secret", 1_700_000_001_000)).toBeNull();
    expect(verifyUnsubscribeToken(token, "wrong-secret", 1_700_000_001_000)).toBeNull();
    expect(verifyUnsubscribeToken(token, "test-secret", 1_700_000_011_000)).toBeNull();
  });
});
