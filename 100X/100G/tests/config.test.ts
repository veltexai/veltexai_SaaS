import { load100GConfig } from "../src/config";

describe("100G configuration", () => {
  it("defaults to a fourteen-day target and seven-day low-supply alert", () => {
    expect(load100GConfig({})).toMatchObject({
      queueDays: 14,
      minimumQueueDaysForAlert: 7,
    });
  });

  it("allows explicit conservative overrides", () => {
    expect(load100GConfig({ VELTEX_100G_QUEUE_DAYS: "21", VELTEX_100G_MIN_QUEUE_DAYS_ALERT: "10" })).toMatchObject({
      queueDays: 21,
      minimumQueueDaysForAlert: 10,
    });
  });
});
