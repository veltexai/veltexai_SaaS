# Location-aware pricing implementation and validation status

Status date: 2026-09-25 Pacific

## Completed locally

- Versioned benchmark/provenance schemas and official-source registry.
- National BLS medians for SOC 37-2011 and 37-2012.
- July 1, 2026 state wage-floor reference table and current IRS mileage rate.
- Secure additive database migration for sources, markets, wages, wage floors, RPP and mileage versions.
- Deterministic metro → nonmetro → state → national resolver that never invents local precision.
- Additive residential/turnover pricing integration. Operator wage is never reduced; travel is explicit; RPP adjustment of nonlabor defaults is opt-in.
- Customer-independent explanation object with market, confidence, selected wage, travel, source vintages and dataset version.
- Existing behavior preserved when no reviewed location snapshot is attached.
- Fail-closed rollout guard: snapshots are ignored unless `NEXT_PUBLIC_LOCATION_PRICING_ENABLED=true`; the flag must remain off until the evidence gates pass.
- Empty operator-results file prepared without invented evidence.
- Executable operator acceptance validator added at `quality/location-pricing/validate-operator-results.mjs`; it fails closed when evidence is absent or the operator/count/deviation/safety gates are not met.

## Deliberately not claimed

- The full current BLS metro/nonmetro and BEA market datasets have not been imported into the database.
- Census address-to-market lookup is not activated in an interactive estimate.
- The migration has not been executed on preview or production.
- Synthetic resolver tests prove fallback behavior, not real-market price accuracy.
- No cleaning operator has supplied the real low/normal/high jobs required by the acceptance gate.
- No founder production acceptance is recorded.

## Required remaining evidence for a 100% pass

1. Obtain official downloadable BLS/BEA datasets, verify checksums and publish a reviewed dataset version.
2. Populate metro, nonmetro and state rows for SOC 37-2011 and 37-2012; reject missing/ambiguous rows visibly.
3. Add a server-side U.S. address-to-Census-market resolver with caching, privacy controls and correction UI.
4. Execute the migration and role matrix on an isolated Supabase target.
5. Run real official-data comparisons for the required Washington, California, Midwest, Southeast and Northeast markets.
6. Collect anonymized operator rows in `quality/location-pricing/operator-results.csv`.
7. Require median absolute deviation no greater than 15%, zero unsafe underestimates and zero critical scope omissions.
8. Complete independent review, founder acceptance, feature-flagged deployment and monitored rollout.

The existing Release 1 production deployment gate is not waived by this work.
