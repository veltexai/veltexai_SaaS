# Social attribution

`middleware.ts` captures first- and last-touch UTM parameters in HTTP-only, same-site cookies for 90 days. The auth callback persists them to `marketing_attribution` and writes idempotent signup/trial events. Stripe payment webhooks attach first-touch attribution to idempotent purchase events.

Required migrations: `supabase/migrations/037_marketing_attribution.sql`. Optional estimate delivery requires `038_calculator_estimate_capture.sql`.

UTM contract:

- `utm_source`: platform
- `utm_medium`: `organic_social` or `paid_social`
- `utm_campaign`: campaign slug
- `utm_content`: series plus hook variant
- `utm_term`: optional targeting/creative discriminator

Do not decide revenue performance per post. Aggregate creative performance by placement, traffic performance by series, and revenue performance by monthly first-touch cohort. Reconcile paid subscriptions against Stripe.

The optional emailed-estimate feature is disabled unless `CALCULATOR_EMAIL_CAPTURE_ENABLED=true`. Before enabling, configure `ATTRIBUTION_HASH_SALT`, apply migration 038, confirm SMTP, test abuse controls, and review privacy disclosures. Transactional estimate consent does not enroll the visitor in marketing.
