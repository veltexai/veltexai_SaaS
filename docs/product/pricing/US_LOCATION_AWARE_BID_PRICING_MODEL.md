# U.S. Location-Aware Cleaning Bid Pricing Model

Status: **RESEARCH AND IMPLEMENTATION SPECIFICATION — NOT YET IMPLEMENTED**  
Prepared: 2026-09-25 Pacific  
Scope: United States only  
Applies to: all Veltex AI cleaning-service catalogs, beginning with residential and turnover Release 1

## 1. Product decision

Veltex AI will not publish one national price, one state multiplier, or a claim that it knows the "correct" bid. It will calculate an editable **suggested low / target / high range** from:

1. the actual job scope and production units;
2. the operator's own wage, production, burden, supply, equipment, travel, overhead and margin data;
3. current official local labor-market and price-level benchmarks when the operator has not supplied actual data;
4. a visible confidence grade and the version/date of every benchmark used.

The operator's verified business costs and historical job results outrank market defaults. Market data is a starting point and reasonableness check, not a substitute for a walkthrough, time study or final operator judgment.

## 2. Why broad regions are insufficient

"West Coast," "California-like" and "middle America" are useful only as emergency fallbacks. A Seattle job and a rural Eastern Washington job should not receive the same labor assumption. The same is true of San Francisco and California's inland/nonmetropolitan markets.

The geographic resolution order is:

1. job address to Census geography;
2. matching BLS metropolitan or nonmetropolitan labor area;
3. state occupational wage data;
4. national occupational wage data;
5. operator-entered value, when present, overrides all research defaults.

State-level BEA price data may be used only for nonlabor costs when metro data is unavailable. It must not multiply the entire bid because labor already has its own local benchmark and a whole-bid multiplier would double-count geography.

## 3. Authoritative source hierarchy

| Input | Primary source | Required use | Refresh |
|---|---|---|---|
| Address geography | U.S. Census Geocoder / TIGER geography | Resolve state, county, and metro/nonmetro geography from the service address | When Census vintage changes |
| Cleaning wages | BLS Occupational Employment and Wage Statistics (OEWS), metro/nonmetro then state | Local wage anchor by occupation and percentile | Annual |
| National wage fallback | BLS OEWS / Occupational Outlook Handbook | Last-resort occupational wage anchor | Annual |
| State wage floor | U.S. DOL consolidated state minimum-wage table | Enforce applicable state floor as a warning/floor input | At least quarterly |
| Local wage floor | Applicable state/local labor agency | Warn where a city/county floor may exceed state data | At least quarterly; operator confirmation required |
| Nonlabor price level | BEA Regional Price Parities (RPP), metro then state | Adjust supplies and allocated nonlabor overhead only | Annual |
| Vehicle cost proxy | IRS business standard mileage rate | Editable default for vehicle operating cost; add paid travel time separately | On effective-date change |
| Federal service contract | Contract's incorporated SCA wage determination from SAM.gov | Mandatory contract-specific wage/fringe override when applicable | Per solicitation/contract action |
| Operator actuals | Veltex business profile and estimate history | Highest-priority input | Continuous |

Source notes as of 2026-09-25:

- BLS reports a May 2025 national median of **$17.71/hour** for janitors and cleaners, except maids and housekeeping cleaners. The service-to-buildings-and-dwellings industry median shown by BLS is **$17.21/hour**. These are national reference points, not local recommendations.
- BLS publishes May 2025 estimates by metropolitan and nonmetropolitan area; Veltex must ingest the relevant occupational rows rather than infer a value from state reputation.
- The DOL July 1, 2026 table shows state floors ranging from the federal $7.25 in multiple states to $17.13 in Washington and $16.90 in California, with local rates potentially higher. Minimum wage is a compliance floor, not a competitive cleaning wage.
- BEA's 2024 state RPPs range from **86.9 in Arkansas** and **87.0 in Mississippi** to **110.7 in California**; national equals 100. RPP is a price-level comparison, not a cleaning-price multiplier.
- The current IRS business mileage rate is **$0.76/mile for July 1–December 31, 2026**. This is an editable cost proxy, not a mandatory customer charge.
- For covered federal service contracts, the incorporated Service Contract Act wage determination governs. DOL says those determinations include locality-specific monetary wages and fringe benefits and that the applicable determination is incorporated into the contract.

## 4. Occupational mapping by service family

Every catalog version must declare its wage occupation and production model. Initial mapping:

| Service family | Primary wage anchor | Notes |
|---|---|---|
| Commercial janitorial | SOC 37-2011, Janitors and Cleaners, Except Maids and Housekeeping Cleaners | Use facility-specific production rates and frequency |
| Residential maid / recurring home | SOC 37-2012, Maids and Housekeeping Cleaners | Separate first/deep and recurring work |
| Vacation-rental turnover | SOC 37-2012 | Add laundry, linen, reset, inspection and same-day constraints separately |
| Move-in/out | SOC 37-2012 | Condition, empty/occupied state and appliance/interior scope drive time |
| Post-construction final clean | Closest supported cleaning occupation plus validated specialty factor | Do not reuse residential production rates |
| Floor care / carpet / windows / exterior washing | Service-specific operator dataset required | Wage anchor alone cannot establish equipment, production or risk cost |
| Healthcare, biohazard, trauma, infectious or regulated work | No automatic market price until qualified validation | Require compliance, training, PPE, disposal, insurance and risk inputs |

If OEWS does not publish a reliable local occupation row, use the state row and lower the confidence grade. Never silently substitute another occupation.

## 5. Calculation contract

### 5.1 Input precedence

For each field, Veltex stores both the selected value and provenance:

1. `operator_actual` — verified company cost or historical result;
2. `operator_override` — deliberate value with an optional reason;
3. `local_official_benchmark` — metro/nonmetro official data;
4. `state_official_benchmark`;
5. `national_official_benchmark`;
6. `catalog_planning_default` — clearly labeled lowest-confidence fallback.

### 5.2 Labor

```text
person_hours_low    = workload / production_rate_high
person_hours_target = workload / production_rate_target
person_hours_high   = workload / production_rate_low

wage_anchor = max(
  operator_entered_wage_if_present,
  applicable_legal_floor,
  selected_local_occupational_wage
)

loaded_hourly_cost = wage_anchor * (1 + payroll_burden_rate)
labor_cost = person_hours * loaded_hourly_cost
```

The market wage anchor should default to the local occupational median. A configurable percentile may be used when the operator explicitly chooses a hiring/retention posture, but Veltex must show the percentile and source. A legal minimum must never be presented as the likely competitive wage.

### 5.3 Supplies, equipment and nonlabor overhead

```text
local_nonlabor_index = BEA_RPP / 100

supplies = operator_actual_supplies
           OR catalog_base_supplies * local_nonlabor_index

equipment = operator_actual_equipment
            OR service_specific_equipment_default * local_nonlabor_index

allocated_overhead = operator_actual_overhead
                     OR overhead_base * local_nonlabor_index
```

Do not apply RPP to wages, margin or the complete selling price. Housing RPP is not an acceptable proxy for chemicals or equipment.

### 5.4 Travel

```text
vehicle_cost = route_miles * effective_irs_business_mileage_rate
travel_labor = paid_travel_person_hours * loaded_hourly_cost
travel_cost  = vehicle_cost + travel_labor + parking + tolls
```

Route miles and travel time should come from the operator when routing is unavailable. Travel must not be hidden inside a statewide multiplier.

### 5.5 Suggested selling range

```text
direct_cost = labor + supplies + equipment + travel + disposal + subcontractors
total_cost  = direct_cost + allocated_overhead + risk_or_access_costs

suggested_price = max(
  operator_minimum_charge,
  total_cost / (1 - target_operating_margin)
)
```

The low, target and high values must result from disclosed scenario changes such as condition and production-rate bands—not an unexplained percentage around one number.

### 5.6 Frequency and recurring work

Each offered frequency is recalculated. Veltex must not simply multiply or discount a single visit price. Recurring estimates include setup/access time per visit, monthly visit count, periodic tasks, inspection/supervision, and any separately priced initial clean.

## 6. Geography and confidence

| Grade | Resolution | Display language |
|---|---|---|
| A | Exact operator actuals plus current metro/nonmetro official benchmark | "Based primarily on your verified costs; checked against current local data" |
| B | Current metro/nonmetro benchmark, current service catalog, complete job inputs | "Local-market suggested range" |
| C | State benchmark or incomplete operator costs | "State-level planning range—verify labor and production" |
| D | National/catalog fallback or missing job detail | "Preliminary range—additional inputs required" |
| Blocked | Regulated/high-hazard service without required qualification | No generated price; explain required review |

Every proposal pricing snapshot freezes:

- job geography identifier and resolution level;
- catalog/version;
- occupation code;
- wage value, percentile, source and vintage;
- applicable wage-floor evidence and confirmation state;
- RPP value/category, source and vintage;
- mileage rate and effective date;
- production-rate range and source;
- all operator overrides and reasons;
- calculation version and confidence grade.

Historical proposals never change when a new dataset is published.

## 7. User experience

The estimate screen should show:

1. **Suggested range:** low, target and high—not "correct price."
2. **Location:** the recognized city/metro/nonmetro market, with a correction control.
3. **Why it changed:** labor, travel, supply/equipment, access/risk and margin impacts separately.
4. **Your business versus market:** operator actuals alongside researched defaults.
5. **Confidence:** grade and missing inputs.
6. **Editable assumptions:** every business-sensitive value can be changed before the proposal is generated.
7. **Profit view:** revenue, labor, nonlabor cost, overhead allocation, gross dollars and operating margin.

No customer-facing proposal needs to disclose proprietary internal cost detail unless the operator chooses to include a simplified explanation.

## 8. Research workflow for every new service type

Before a service catalog may produce a price:

1. Define the unit of work (square feet, windows/panes, rooms, linear feet, fixtures, beds, appliances, loads, crew-hours or another explicit unit).
2. Identify task/condition variables and exclusions.
3. Select an official occupational wage anchor or mark the service as operator-data-only.
4. Research equipment, consumables, setup, travel, disposal and compliance requirements.
5. Establish low/target/high production rates from credible service-specific evidence and qualified operators.
6. Validate at least low/normal/high real jobs in multiple U.S. market bands.
7. Reject unsafe underestimates and missing standard tasks before release.
8. Version and freeze the catalog, sources and formulas.

Internet list prices, competitor advertisements and lead-generation marketplaces may be used as secondary reasonableness checks only. They cannot establish labor hours or profitability.

## 9. Initial validation markets

The first validation set should deliberately test different local conditions rather than treating states as uniform:

- Seattle-Tacoma-Bellevue, Washington;
- Eastern Washington nonmetropolitan area;
- San Francisco-Oakland-Fremont, California;
- Los Angeles-Long Beach-Anaheim, California;
- an inland California metro;
- Wichita, Kansas;
- a Kansas nonmetropolitan area;
- one Southeast metro and one Southeast nonmetropolitan area;
- one Northeast metro.

For each market, validate residential recurring, deep/first clean, move-in/out and vacation-rental turnover jobs before expanding the formula to specialty work.

## 10. Data and engineering design

Minimum versioned records:

- `geographic_market_versions`
- `occupational_wage_benchmarks`
- `minimum_wage_rules`
- `regional_price_parities`
- `mileage_rate_versions`
- `service_production_benchmarks`
- `estimate_assumption_snapshots`
- `estimate_scenarios`
- `operator_actual_costs`
- `estimate_actual_outcomes`

Ingestion is server-side and versioned. The application must not call external public datasets during an interactive estimate. Publish a reviewed dataset version, then atomically activate it. Keep source URLs, retrieval timestamps, checksums, effective dates and superseded versions.

Location is sensitive business/customer data. Geocode only what is necessary, avoid retaining third-party request logs where possible, and never expose customer addresses in analytics events.

## 11. Acceptance gates

The feature is not production-ready until:

- official-source ingestion and fallback behavior are tested;
- Washington/California/Midwest examples demonstrate metro-versus-nonmetro differences;
- operator actuals override defaults without being silently reset;
- margin math uses division by `1 - margin`, not markup;
- all customer proposals freeze their assumption snapshot;
- stale-source and missing-local-wage conditions fail visibly;
- local/state minimum-wage warnings are current and not represented as legal advice;
- at least 3–5 residential and 2–3 turnover operators supply anonymized real-job comparisons;
- median absolute price deviation is no more than 15%;
- no unsafe underestimate or critical standard-scope omission remains;
- regulated/high-hazard services remain blocked until their separate validation gates pass.

## 12. Implementation order

1. Add geography, source/version and provenance data models without changing live prices.
2. Ingest BLS OEWS metro/nonmetro/state wages, BEA RPP, DOL state floors and IRS mileage versions.
3. Add server-side address-to-market resolution with state/national fallbacks.
4. Integrate location-aware labor, nonlabor and travel inputs into residential/turnover scenarios.
5. Add UI explanation, confidence, overrides and frozen assumption snapshots.
6. Run synthetic comparison tests across the initial validation markets.
7. Complete the real-operator validation packet and founder acceptance.
8. Release behind a feature flag; monitor overrides and estimate-versus-actual variance.
9. Expand one service family at a time through the same research and acceptance gates.

## 13. Official references

- BLS May 2025 metropolitan/nonmetropolitan OEWS: https://www.bls.gov/OES/current/oessrcma.htm
- BLS janitors and building cleaners: https://www.bls.gov/ooh/building-and-grounds-cleaning/janitors-and-building-cleaners.htm
- DOL state minimum wages: https://www.dol.gov/agencies/whd/mw-consolidated
- BEA Regional Price Parities: https://www.bea.gov/data/prices-inflation/regional-price-parities-state-and-metro-area
- IRS mileage rates: https://www.irs.gov/tax-professionals/standard-mileage-rates
- U.S. Census Geocoder API: https://geocoding.geo.census.gov/geocoder/Geocoding_Services_API.html
- SAM.gov Wage Determinations: https://sam.gov/wage-determinations
- DOL SCA wage-determination guidance: https://www.dol.gov/agencies/whd/government-contracts/prevailing-wage-resource-book/sca-wage-determinations

