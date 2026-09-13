# Social attribution

`middleware.ts` captures first- and last-touch UTM parameters in HTTP-only, same-site cookies for 90 days. The auth callback persists them to `marketing_attribution` and writes idempotent signup/trial events. Stripe payment webhooks attach first-touch attribution to idempotent purchase events.

Required migrations: `supabase/migrations/037_marketing_attribution.sql` and `039_acquisition_attribution_funnel.sql`. Optional estimate delivery requires `038_calculator_estimate_capture.sql`.

For Meta Acquisition Sprint V1, the canonical activated-trial event is `first_proposal`: the user's first proposal was successfully saved to `proposals`. A generated preview alone is not activation. Subsequent successfully saved proposals are `repeat_proposal` events.

Meta event mapping:

- signup: `CompleteRegistration` (browser and CAPI share one deterministic event ID)
- trial created: `StartTrial`
- activated trial: custom `FirstProposal` (server/CAPI)
- paid subscription: `Purchase` (Stripe webhook/CAPI)

Migration 039 adds repeat-proposal measurement and the reporting-only, invoker-security view `acquisition_conversion_funnel`, which joins first-touch source, campaign, and `utm_content` creative to signup, trial, first proposal, repeat proposal, paid conversion, and revenue.

UTM contract:

- `utm_source`: platform
- `utm_medium`: `organic_social` or `paid_social`
- `utm_campaign`: campaign slug
- `utm_content`: series plus hook variant
- `utm_term`: optional targeting/creative discriminator

Do not decide revenue performance per post. Aggregate creative performance by placement, traffic performance by series, and revenue performance by monthly first-touch cohort. Reconcile paid subscriptions against Stripe.

The optional emailed-estimate feature is disabled unless `CALCULATOR_EMAIL_CAPTURE_ENABLED=true`. Before enabling, configure `ATTRIBUTION_HASH_SALT`, apply migration 038, confirm SMTP, test abuse controls, and review privacy disclosures. Transactional estimate consent does not enroll the visitor in marketing.
