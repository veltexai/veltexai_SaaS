import { forecastSupply, supplyAlerts } from "../src/supply-forecast";

describe("100G supply forecasting", () => {
  it("marks an empty queue critical and calculates the replenishment deficit", () => {
    const forecast = forecastSupply({ currentDailySendStage: 5, queuedEligibleLeads: 0 }, 7, 500, 3);
    expect(forecast).toMatchObject({ desiredQueue: 35, deficit: 35, runwayDays: 0, status: "empty" });
    expect(supplyAlerts(forecast)[0]).toMatchObject({ code: "ELIGIBLE_SUPPLY_EMPTY", severity: "critical" });
  });

  it("warns below the runway threshold and remains healthy at the threshold", () => {
    expect(forecastSupply({ currentDailySendStage: 3, queuedEligibleLeads: 8 }, 7, 500, 3).status).toBe("low");
    const healthy = forecastSupply({ currentDailySendStage: 3, queuedEligibleLeads: 9 }, 7, 500, 3);
    expect(healthy.status).toBe("healthy");
    expect(supplyAlerts(healthy)).toEqual([]);
  });

  it("raises a critical alert when tomorrow's daily stage cannot be filled", () => {
    const forecast = forecastSupply({ currentDailySendStage: 5, queuedEligibleLeads: 2 }, 7, 500, 3);
    expect(supplyAlerts(forecast)[0]).toMatchObject({
      code: "ELIGIBLE_SUPPLY_BELOW_DAILY_STAGE",
      severity: "critical",
    });
  });
});
