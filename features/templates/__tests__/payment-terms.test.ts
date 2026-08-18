import {
  resolvePaymentTerms,
  resolveServiceCategory,
  type PaymentTermsSource,
} from "@/features/templates/utils/payment-terms";

const src = (over: Record<string, unknown>) => over as PaymentTermsSource;

const COMMERCIAL_LABEL = "Net 30";
const COMMERCIAL_DESC = "Payment is due within 30 days of the invoice date.";
const RESIDENTIAL_LABEL = "Due Upon Completion";
const RESIDENTIAL_DESC = "Payment is due upon completion of service.";

/** Every building_type in facilityDetailsSchema that bills commercially. */
const COMMERCIAL_BUILDING_TYPES = [
  "office",
  "warehouse",
  "retail",
  "restaurant",
  "medical",
  "educational",
  "daycare",
  "church",
  "hospitality",
  "industrial",
  "apartment",
  "condo",
  "townhouse",
  "other",
];

const ADD_ON_SERVICE_TYPES = ["carpet", "window", "floor"];

describe("resolveServiceCategory", () => {
  it("takes service_type as the direct signal", () => {
    expect(resolveServiceCategory(src({ service_type: "commercial" }))).toBe(
      "commercial",
    );
    expect(resolveServiceCategory(src({ service_type: "residential" }))).toBe(
      "residential",
    );
  });

  it("lets service_type win over a conflicting building type", () => {
    expect(
      resolveServiceCategory(
        src({
          service_type: "commercial",
          facility_details: { building_type: "house" },
        }),
      ),
    ).toBe("commercial");
  });

  it.each(ADD_ON_SERVICE_TYPES)(
    "falls back to the building type for %s",
    (service_type) => {
      expect(
        resolveServiceCategory(
          src({ service_type, facility_details: { building_type: "house" } }),
        ),
      ).toBe("residential");
      expect(
        resolveServiceCategory(
          src({ service_type, facility_details: { building_type: "office" } }),
        ),
      ).toBe("commercial");
    },
  );

  it("reads property_type when facility_details is absent", () => {
    expect(
      resolveServiceCategory(
        src({ service_type: "floor", property_type: "Residential" }),
      ),
    ).toBe("residential");
    expect(
      resolveServiceCategory(
        src({
          service_type: "floor",
          service_specific_data: { property_type: "house" },
        }),
      ),
    ).toBe("residential");
    expect(
      resolveServiceCategory(
        src({ service_type: "floor", property_type: "Commercial Office" }),
      ),
    ).toBe("commercial");
  });

  it("defaults to commercial and never throws on malformed input", () => {
    expect(resolveServiceCategory(src({}))).toBe("commercial");
    expect(resolveServiceCategory(src({ service_type: null }))).toBe(
      "commercial",
    );
    expect(resolveServiceCategory(src({ service_type: "nonsense" }))).toBe(
      "commercial",
    );
    expect(() =>
      resolveServiceCategory(
        src({
          service_type: "floor",
          facility_details: "not-an-object",
          service_specific_data: ["nope"],
        }),
      ),
    ).not.toThrow();
  });
});

describe("resolvePaymentTerms", () => {
  it("gives commercial proposals Net 30", () => {
    const terms = resolvePaymentTerms(src({ service_type: "commercial" }));
    expect(terms.label).toBe(COMMERCIAL_LABEL);
    expect(terms.description).toBe(COMMERCIAL_DESC);
  });

  it("gives residential proposals Due Upon Completion", () => {
    const terms = resolvePaymentTerms(src({ service_type: "residential" }));
    expect(terms.label).toBe(RESIDENTIAL_LABEL);
    expect(terms.description).toBe(RESIDENTIAL_DESC);
  });

  it.each(COMMERCIAL_BUILDING_TYPES)(
    "bills a %s property Net 30",
    (building_type) => {
      const terms = resolvePaymentTerms(
        src({ service_type: "commercial", facility_details: { building_type } }),
      );
      expect(terms.label).toBe(COMMERCIAL_LABEL);
      expect(terms.description).toBe(COMMERCIAL_DESC);
    },
  );

  it("bills a residential add-on job on completion", () => {
    for (const service_type of ADD_ON_SERVICE_TYPES) {
      const terms = resolvePaymentTerms(
        src({ service_type, facility_details: { building_type: "house" } }),
      );
      expect(terms.label).toBe(RESIDENTIAL_LABEL);
    }
  });

  it("states the rule inside the Terms & Legal body", () => {
    const commercial = resolvePaymentTerms(src({ service_type: "commercial" }));
    const residential = resolvePaymentTerms(src({ service_type: "residential" }));

    expect(commercial.body).toContain(COMMERCIAL_DESC);
    expect(commercial.body).toContain(COMMERCIAL_LABEL);
    expect(residential.body).toContain(RESIDENTIAL_DESC);
    expect(residential.body).toContain(RESIDENTIAL_LABEL);
  });

  it("keeps commercial-only billing language out of residential terms", () => {
    const residential = resolvePaymentTerms(src({ service_type: "residential" }));
    expect(residential.body).not.toContain("monthly in advance");
    expect(residential.body).not.toContain("Net 30");
  });

  it("never returns empty text", () => {
    for (const service_type of [
      "commercial",
      "residential",
      ...ADD_ON_SERVICE_TYPES,
      null,
      undefined,
    ]) {
      const terms = resolvePaymentTerms(src({ service_type }));
      expect(terms.label.length).toBeGreaterThan(0);
      expect(terms.description.length).toBeGreaterThan(0);
      expect(terms.body.length).toBeGreaterThan(0);
    }
  });
});
