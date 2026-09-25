# Release 1 production acceptance and smoke checklist

Status: **PREPARED — NOT YET EXECUTED**

## Pre-deployment gates

- [x] Independent code/security review passes through the final correction.
- [x] Isolated Supabase migration and hosted role evidence captured.
- [x] Authenticated preview create/edit/reopen/PDF/tracked-link/responsive checks pass.
- [x] One real combined proposal email with PDF and tracked link reaches the QA inbox.
- [x] Production Supabase Auth magic-link email reaches `veltexclean@gmail.com`.
- [ ] Operator validation meets `OPERATOR_VALIDATION_PACKET.md` acceptance rules.
- [ ] Founder explicitly accepts operator results and production promotion.

## Maintenance deployment

1. Record exact Git commit, Vercel project, Supabase project and current production rollback reference.
2. Apply the ordered production database prerequisites and Release 1 migrations using the reviewed migration runbook. Stop on any drift or failed preflight.
3. Run the production role/grant/definer assertions before application promotion.
4. Deploy the exact accepted application commit to Vercel project `veltex-services-veliz`, which owns `www.veltexai.com` despite its legacy name.
5. Confirm the `www.veltexai.com` alias resolves to the new deployment.

## Post-deployment smoke tests

- [ ] Public homepage, signup and login load without console/server errors.
- [ ] Production magic-link delivery succeeds to the approved QA account.
- [ ] Existing commercial proposal workflow still creates and reopens correctly.
- [ ] Residential workbench creates one normal recurring-cleaning proposal.
- [ ] Turnover workbench creates one normal vacation-rental proposal.
- [ ] Owner PDF download contains complete scope, price, terms and signatures.
- [ ] Combined email delivery reaches the approved QA inbox with PDF and working tracked link.
- [ ] Tracked page is responsive at 390 px and desktop width.
- [ ] Anonymous and cross-user raw proposal access remains denied.
- [ ] Paid entitlement and trial restrictions behave as reviewed.
- [ ] Production monitoring shows no new auth, database or application errors.

## Cleanup

- [ ] Preserve final evidence and ledger entry.
- [ ] Request action-time confirmation immediately before deleting Supabase preview `wcnfhriosemgchmtwgof`.
- [ ] Delete the preview only after all smoke evidence no longer depends on it, then verify deletion and stop preview compute charges.

