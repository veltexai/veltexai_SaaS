import {
  ShieldIcon,
  LocationIcon,
  StartIcon,
  EductationIcon,
} from "@/components/icons";
import { SplitLabel } from "../shared/split-label";
import { parseInline } from "../../utils/parse-inline";

interface LuxuryEliteBulletsProps {
  bullets: string[];
}

export const LuxuryEliteBullets = ({ bullets }: LuxuryEliteBulletsProps) => {
  const years = bullets.find((b) => /years?/i.test(b) && /business/i.test(b));
  const sectors = bullets.find((b) =>
    /(education|office|offices|retail|healthcare)/i.test(b),
  );
  const satisfaction = bullets.find((b) => /(satisfaction|100%)/i.test(b));
  const serviceArea = bullets[1];

  return (
    <div className="sm:mt-10 mt-1 pb-6 flex flex-col items-center tk-bely">
      {years ? (
        <div className="flex flex-col items-center gap-2 text-[var(--color-primary)]">
          <ShieldIcon className="sm:h-12 h-6 sm:w-12 w-6" />
          <SplitLabel text={years} className="text-2xs" />
        </div>
      ) : null}
      <div className="flex items-center sm:gap-[78px] gap-10">
        <div className="relative sm:w-48 w-24 sm:h-48 h-24 rotate-45 bg-[var(--color-primary)]">
          <div className="absolute inset-0 -rotate-45 flex flex-col items-center justify-center sm:p-6 p-2 text-white text-center">
            <EductationIcon className="sm:h-12 h-6 sm:w-12 w-6" />
            <div className="sm:text-lg text-2xs leading-relaxed">
              {sectors ? parseInline(sectors) : parseInline(bullets[0])}
            </div>
          </div>
        </div>
        <div className="relative sm:w-48 w-24 sm:h-48 h-24 rotate-45 bg-[var(--color-primary)]">
          <div className="absolute inset-0 -rotate-45 flex flex-col items-center justify-center sm:p-6 p-2 text-white text-center">
            <StartIcon className="sm:h-12 h-6 sm:w-12 w-6" />
            <div className="sm:text-xl text-2xs leading-relaxed">
              {satisfaction ? (
                <SplitLabel
                  text={satisfaction}
                  className="text-white text-xl"
                />
              ) : (
                parseInline(bullets[1] ?? "")
              )}
            </div>
          </div>
        </div>
      </div>
      {serviceArea ? (
        <div className="flex flex-col items-center gap-2 text-[var(--color-primary)]">
          <LocationIcon className="sm:h-12 h-6 sm:w-12 w-6" />
          <span className="sm:text-xl text-2xs text-[#383838]">
            <SplitLabel text={serviceArea} className="text-xl" />
          </span>
        </div>
      ) : null}
    </div>
  );
};
