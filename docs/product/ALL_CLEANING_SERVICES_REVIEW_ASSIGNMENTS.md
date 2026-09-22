# All Cleaning Services — Review and Delivery Assignments

Date: 2026-09-22 Pacific  
Parent plan: `docs/product/ALL_CLEANING_SERVICES_EXPANSION_MASTER_PLAN.md`

## Codex assignment — Release 1 technical implementation

### Objective

Create the shared catalog foundation and a production-quality residential/turnover category pack without breaking existing commercial proposal flows.

### Required outputs

1. Current-state compatibility map for database, forms, quick flow, pricing, templates, PDF/export, analytics and admin.
2. Versioned schema for segments, service families, job types, unit drivers, questions, scope modules, pricing strategies, compliance flags and proposal terms.
3. Backward-compatible mapping from the existing five service types and existing quick templates.
4. Business-profile selection for markets served, services offered and company-specific cost assumptions.
5. Residential packs for recurring standard, first/deep clean, move-in/out and Airbnb/turnover.
6. Transparent suggested-price workbench with labor, supplies, equipment, overhead, margin, low/base/high scenarios and operator override.
7. Segment-aware proposal composition and examples.
8. Unit, integration and regression tests plus migration/rollback instructions.
9. Evidence packet for independent review; no deployment without founder authorization.

### Non-negotiable constraints

- Preserve existing commercial jobs and proposals.
- Keep business segment separate from service job type.
- Do not add new string values to database constraints ad hoc.
- Do not present generated pricing as the correct or guaranteed bid.
- Do not implement regulated/biohazard pricing in Release 1.
- Do not change live marketing claims before the matching category pack passes acceptance.

## Claude assignment — independent challenge review

### Objective

Independently audit Codex's Release 1 evidence packet as a cleaning-operator workflow, conversion experience and product-safety review.

### Review questions

1. Are any major residential, maid or turnover job types missing?
2. Does intake ask only the information required to produce a useful scope and price explanation?
3. Are condition, access, frequency, travel, minimum-charge, supplies, equipment and uncertainty handled transparently?
4. Can an operator understand and defend the suggested price without believing Veltex guarantees it?
5. Are proposal inclusions, exclusions, options and customer responsibilities clear?
6. Does the path from signup to first useful proposal minimize friction and reach an aha moment quickly?
7. Are mobile layout, error recovery, edits and overrides usable?
8. Are analytics sufficient to separate qualified traffic, activation, proposal value and upgrade intent by segment?
9. Does marketing accurately match what the released product can perform?
10. What defects must block release versus follow after release?

### Required response format

- Verdict: PASS / CONDITIONAL PASS / FAIL
- Severity-ranked findings with file/screen evidence
- Missing acceptance tests
- Conversion and positioning recommendations
- Explicit list of release blockers
- No deployment, publication or spend

## Mohamed assignment — bounded production-readiness handoff

Send only after Codex has a clean implementation branch and Claude's review is resolved.

### Objective

Verify production integration and deployment safety, not redefine the product.

### Required checks

1. Branch/base matches current production and will not roll back newer work.
2. Supabase migrations are backward compatible, idempotent where required and have a rollback/recovery plan.
3. Existing proposals and five current service types continue to load, edit, calculate and export.
4. Stripe/subscription permissions remain unchanged unless explicitly included.
5. Production environment variables, storage, analytics and access policies support the new schema.
6. Automated tests and production-build checks pass.
7. Staging smoke tests cover new and legacy workflows.
8. Deployment and rollback commands are documented.

### Decision gate

Mohamed reports READY / NOT READY with exact blockers. Anthony separately authorizes deployment.

