# Veltex AI traffic growth playbook

## Objective

Build a compounding, measurable stream of qualified cleaning-company visitors—not undifferentiated traffic—and convert them into demo users, trials, and paying customers.

Traffic alone cannot guarantee a customer base. The operating metric is qualified acquisition: search impressions → visits → calculator/demo use → signup → first proposal → paid plan.

## Channel priorities

1. **High-intent organic search.** Own the topics closest to the product: commercial cleaning proposal software, janitorial bidding, cleaning bid calculations, scope-of-work templates, walkthrough checklists, and cleaning pricing. The first topic cluster and free calculator are now implemented.
2. **Founder-led distribution.** Turn each guide into short, useful posts and walkthrough videos for LinkedIn, YouTube, cleaning-business communities, and the company email list. Lead with a practical answer and point to the relevant tool or guide; do not spam links.
3. **Partner distribution.** Offer the free calculator and proposal guides to janitorial consultants, supply distributors, cleaning-business coaches, associations, and industry newsletters. Pursue co-authored webinars and resource-page links.
4. **Search advertising after conversion measurement works.** Start narrowly on exact/high-intent terms. Send calculator searches to the calculator and software searches to the product page. Exclude job-seeker, residential house-cleaning, free PDF, employment, and unrelated consumer queries unless intentionally targeted.
5. **Retargeting after consent and audience volume.** Retarget calculator, demo, and pricing visitors with proof-oriented creative. Cap frequency and optimize for activated trials, not clicks.

## Measurement specification

Configure `NEXT_PUBLIC_GA_MEASUREMENT_ID` in production and connect the same GA4 property to Google Search Console. Preserve the existing Meta Pixel configuration.

Track this funnel by channel and landing page:

- `view_resource`
- `use_bid_calculator`
- `calculator_to_demo`
- `view_demo`
- `demo_to_signup`
- `sign_up`
- `first_proposal_created`
- `start_trial`
- `purchase`

Use consistent UTMs: `utm_source`, `utm_medium`, `utm_campaign`, and `utm_content`. Never evaluate a channel on visits alone. Review activated-trial rate, customer acquisition cost, and paid conversion by landing page.

## 90-day execution cadence

### Weeks 1–2: launch and indexing

- Deploy the new resource center, calculator, sitemap, structured data, and legal pages.
- Add the production sitemap URL in Google Search Console and Bing Webmaster Tools.
- Validate GA4 realtime traffic and each funnel event before buying traffic.
- Run PageSpeed Insights on the homepage, calculator, demo, and highest-priority guide.
- Confirm the canonical production hostname redirects consistently.

### Weeks 3–6: distribution and authority

- Publish two genuinely useful pieces weekly, based on actual customer questions and anonymized examples.
- Produce one short calculator or proposal walkthrough video per week.
- Contact 10 relevant partners per week with a specific collaboration idea.
- Ask real customers for permission to publish outcome-based case studies. Do not invent metrics or testimonials.
- Refresh internal links whenever a new piece is published.

### Weeks 7–12: scale what converts

- Use Search Console queries to improve pages already receiving impressions in positions 5–20.
- Create facility-specific content only where Veltex has real expertise: offices, medical facilities, schools, warehouses, post-construction, and similar segments.
- Launch a tightly capped search campaign after conversion events are verified.
- Pause keywords and placements that generate visits without activated trials.
- Turn the best-performing guide into a webinar, checklist, video, and partner asset.

## Weekly scorecard

- Non-brand search impressions and clicks
- Click-through rate by query/page
- New referring domains from relevant industry sites
- Calculator completion and calculator-to-demo rate
- Demo-to-signup rate
- Signup-to-first-proposal rate
- Activated trials and paid customers by channel
- Customer acquisition cost and 30/60/90-day payback

## Guardrails

- Do not buy bulk traffic, backlinks, followers, or scraped engagement.
- Do not publish near-duplicate city pages or AI-generated filler.
- Do not make unsupported “best,” savings, win-rate, customer-count, or industry-trust claims.
- Do not send cold email at scale until identity, suppression, consent, and deliverability controls are verified.
- Prioritize pages that solve a real bidding problem and can earn links naturally.
