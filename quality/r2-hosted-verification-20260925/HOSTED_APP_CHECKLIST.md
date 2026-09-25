# R2 hosted application/Auth checkpoints

Status: **PREPARED — HUMAN/HOSTED EXECUTION REQUIRED**

Record the isolated preview URL, candidate commit `74899c3`, timestamp and
redacted evidence for every item. A database SQL pass does not satisfy these.

- [ ] New preview signup creates exactly one profile, one organization, one
      owner membership, one active organization and the expected trial usage.
- [ ] Migration history contains exactly one `20260925002000` row; a normal
      migration command reports it already applied rather than replaying the
      non-idempotent DDL. Record pre/post row counts and content digest.
- [ ] Existing owner can create, reopen and edit a legacy-shaped proposal while
      omitting `organization_id`; the server assigns the active editable tenant.
- [ ] Owner and estimator can generate a PDF; viewer and non-member are denied.
- [ ] Paid owner can send a proposal; free-trial, viewer and non-member behavior
      matches the final paid-entitlement acceptance record.
- [ ] Random tracked link renders the customer-safe projection responsively.
- [ ] Valid paid tracked link downloads; invalid, disabled and unauthorized
      links fail closed without exposing raw proposal/customer fields.
- [ ] View/download/click events update once per action and remain scoped to the
      token-bound proposal.
- [ ] Two authenticated browser sessions for separate organizations cannot see
      each other's organization, members, proposals, tracking, views or exports.
- [ ] Switching the active organization to a non-membership fails and leaves the
      previous active organization unchanged.
- [ ] Refresh/relogin preserves the legitimate active organization.
- [ ] No real customer email is sent. Use only a controlled `.test`/sink address
      unless founder separately authorizes a one-time delivery acceptance.

Final status must remain `PREPARED` until these checks and the database matrix
have evidence. Record failures; do not rerun by silently changing the candidate.
