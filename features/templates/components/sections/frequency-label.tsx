import { isOneTimeFrequency } from "@/lib/recurring-monthly-functions";

export function FrequencyLabel({ frequency }: { frequency: string }) {
    return (
      <>
        {frequency}
        {!isOneTimeFrequency(frequency) && (
          <span style={{ fontSize: '10px' }} className="block opacity-80">
            (Recurring Monthly)
          </span>
        )}
      </>
    );
  }