# Release 1 evidence

Primary review packet: `docs/product/release-1/CLAUDE_INDEPENDENT_REVIEW_PACKET.md`.

`render.cjs` produces synthetic SSR HTML and proposal JSON using the actual workbench/document components and built CSS. `capture.cjs` uses a temporary headless Chrome profile, blocks external resource requests, captures 390/1440px screenshots and exports sample PDFs. It does not sign in or touch Supabase, OpenAI, Stripe, email, analytics or live marketing.

Visual inspection: desktop Airbnb workbench has readable paired panels and a visible cost/scenario summary. Mobile residential proposal retains scope, exclusions, customer responsibilities, period/per-visit pricing, terms and acceptance. The two-page Airbnb PDF keeps the quote, terms and signatures visible. No horizontal overflow was detected across eight captures. Static evidence does not establish authenticated end-to-end behavior.

Failure history:

- Sandboxed `git fetch` initially could not update the linked checkout's Git metadata; retried successfully with authorized access. No base switch was guessed.
- Initial pnpm install could not reach the registry and reported signature verification failure. Retried with network access; the locked install succeeded without disabling signature verification.
- Initial build failed fetching existing Google Fonts. Network-enabled build succeeded with placeholder local service configuration.
- Initial sandboxed Chrome launch aborted. Temporary headless Chrome succeeded with authorized process access.
- Legacy template inspection found that new headings could be omitted by old fixed-section assemblers. A complete catalog renderer was added instead of relying on that path.
- Existing email PDF helper omitted session cookies for its protected print page. Session forwarding and an authorization-error guard were added with unit coverage.

No migration was applied and no deployment, paid API call, email, campaign mutation or publication occurred.
