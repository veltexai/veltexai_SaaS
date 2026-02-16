import { isOneTimeFrequency } from "@/lib/recurring-monthly-functions";

export function FrequencyLabel({ frequency }: { frequency: string }) {
    return (
      <>
        {frequency}
        {!isOneTimeFrequency(frequency) && (
          <span className="block opacity-80 sm:text-2xs text-3xs">
            (Recurring Monthly)
          </span>
        )}
      </>
    );
  }