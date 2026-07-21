import {
  buildAuthCallbackUrl,
  buildAuthPathWithRedirect,
  getSafeRedirectPath,
} from "../redirect";

const QUICK_REDIRECT =
  "/dashboard/proposals/quick?source=demo&demoType=commercial&scopeTemplateId=commercial_office";

describe("auth redirect helpers", () => {
  it("preserves quick proposal redirects as one encoded auth query value", () => {
    const signupPath = buildAuthPathWithRedirect({
      pathname: "/auth/signup",
      redirectTo: QUICK_REDIRECT,
      params: { from: "demo" },
    });

    expect(signupPath).toBe(
      "/auth/signup?from=demo&redirect=%2Fdashboard%2Fproposals%2Fquick%3Fsource%3Ddemo%26demoType%3Dcommercial%26scopeTemplateId%3Dcommercial_office",
    );

    const parsedSignupPath = new URL(signupPath, "https://veltex.local");
    expect(parsedSignupPath.searchParams.get("redirect")).toBe(QUICK_REDIRECT);
    expect(parsedSignupPath.searchParams.get("source")).toBeNull();
    expect(parsedSignupPath.searchParams.get("demoType")).toBeNull();
    expect(parsedSignupPath.searchParams.get("scopeTemplateId")).toBeNull();
  });

  it("preserves quick proposal redirects through auth callback URLs", () => {
    const callbackUrl = buildAuthCallbackUrl({
      baseUrl: "https://app.veltex.test",
      redirectTo: QUICK_REDIRECT,
      priceId: "price_demo",
      authIntent: "signup",
    });

    const parsedCallbackUrl = new URL(callbackUrl);
    expect(parsedCallbackUrl.pathname).toBe("/api/auth/callback");
    expect(parsedCallbackUrl.searchParams.get("priceId")).toBe("price_demo");
    expect(parsedCallbackUrl.searchParams.get("auth_intent")).toBe("signup");
    expect(parsedCallbackUrl.searchParams.get("redirect")).toBe(
      QUICK_REDIRECT,
    );
    expect(parsedCallbackUrl.searchParams.get("source")).toBeNull();
    expect(parsedCallbackUrl.searchParams.get("demoType")).toBeNull();
    expect(parsedCallbackUrl.searchParams.get("scopeTemplateId")).toBeNull();
  });

  it("falls back to dashboard for missing or external redirects", () => {
    expect(getSafeRedirectPath()).toBe("/dashboard");
    expect(getSafeRedirectPath("https://evil.example/dashboard")).toBe(
      "/dashboard",
    );
    expect(getSafeRedirectPath("//evil.example/dashboard")).toBe("/dashboard");
  });

  it("rejects backslash paths that browsers resolve as external hosts", () => {
    expect(getSafeRedirectPath("/\\evil.example")).toBe("/dashboard");
    expect(getSafeRedirectPath("/\\/evil.example")).toBe("/dashboard");
    expect(getSafeRedirectPath("/dashboard\\..\\evil")).toBe("/dashboard");
    // Sanity check the attack this guards against
    expect(new URL("/\\evil.example", "https://app.veltex.test").host).toBe(
      "evil.example",
    );
  });
});
