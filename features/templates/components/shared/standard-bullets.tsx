import React, { ComponentType } from "react";
import { dmSerifText } from "@/lib/fonts";
import { BULLET_ICONS } from "../../constants/about-our-company";
import { parseInline } from "../../utils/parse-inline";

interface BulletProps {
  raw: string;
  index: number;
}
const Bullet = ({ raw, index }: BulletProps) => {
  const Icon = BULLET_ICONS[index] ?? null;
  return (
    <div className="flex items-start gap-3 sm:gap-4 p-2 sm:p-10 sm:pr-4">
      {Icon && (
        <Icon className="sm:h-8 h-4 sm:w-8 w-4 text-[var(--color-primary)] flex-shrink-0" />
      )}
      <div
        className={`italic text-[#383838] ${dmSerifText.className} text-2xs sm:text-xl leading-relaxed font-semibold`}
      >
        {parseInline(raw)}
      </div>
    </div>
  );
};

export const StandardBullets = ({ bullets }: { bullets: string[] }) => {
  return (
    <div className="mt-4 sm:mt-10 pb-4 sm:pb-6">
      <div className="grid grid-cols-2 divide-x divide-gray-200">
        {bullets.slice(0, 2).map((b, i) => (
          <Bullet key={`b1-${i}`} raw={b} index={i} />
        ))}
      </div>
      <div className="border-t border-gray-200" />
      <div className="grid grid-cols-2 divide-x">
        {bullets.slice(2).map((b, i) => (
          <Bullet key={`b2-${i}`} raw={b} index={i + 2} />
        ))}
      </div>
    </div>
  );
};
