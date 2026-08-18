const DEFAULT_TIME_ZONE = "America/Los_Angeles";
const DEFAULT_SEND_WINDOW_END_HOUR = 18;

interface LocalDateParts {
  year: number;
  month: number;
  day: number;
  hour: number;
}

function localDateParts(now: Date, timeZone: string): LocalDateParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes): number => {
    const part = parts.find((candidate) => candidate.type === type)?.value;
    if (!part) throw new Error(`Unable to resolve ${type} in ${timeZone}`);
    return Number(part);
  };
  return { year: value("year"), month: value("month"), day: value("day"), hour: value("hour") };
}

function isoDate(year: number, month: number, day: number): string {
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10);
}

/**
 * Return the most recently completed campaign-local sending date.
 * Before the local send window closes, evaluate yesterday so a morning cron
 * cannot permanently record a zero-send decision for the current day.
 */
export function completedObservationDate(
  now: Date,
  timeZone = DEFAULT_TIME_ZONE,
  sendWindowEndHour = DEFAULT_SEND_WINDOW_END_HOUR,
): string {
  if (!Number.isInteger(sendWindowEndHour) || sendWindowEndHour < 0 || sendWindowEndHour > 23) {
    throw new Error("send window end hour must be an integer from 0 through 23");
  }
  const local = localDateParts(now, timeZone);
  const day = local.hour >= sendWindowEndHour ? local.day : local.day - 1;
  return isoDate(local.year, local.month, day);
}
