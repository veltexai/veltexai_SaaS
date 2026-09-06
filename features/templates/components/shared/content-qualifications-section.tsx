import { montserrat } from "@/lib/fonts";
import { TemplateType } from "@/features/templates/types/templates";
import Image from "next/image";
import React from "react";
import {
  ClipboardCheck,
  Droplets,
  MessageCircle,
  Shield,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { PoweredBy } from "./powered-by";

const QUALIFICATIONS: ReadonlyArray<{
  title: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    title: "Professional Standards",
    description: "Consistent service practices",
    icon: ShieldCheck,
  },
  {
    title: "Safety & Training",
    description: "Site-aware working procedures",
    icon: Shield,
  },
  {
    title: "Quality Control",
    description: "Routine service quality checks",
    icon: ClipboardCheck,
  },
  {
    title: "Client Communication",
    description: "Clear updates and responsive follow-up",
    icon: MessageCircle,
  },
  {
    title: "Chemical Handling",
    description: "Safe, label-directed use",
    icon: Droplets,
  },
];

const ContentQualificationsSection = ({
  templateType,
  qualificationsImage,
}: {
  templateType: TemplateType;
  qualificationsImage?: string;
}) => {
  return (
    <div className="text-2xs">
      <p
        className={`${montserrat.className} ${
          templateType === "modern_corporate"
            ? "sm:my-6 my-2"
            : "sm:my-8 my-2 pl-6 sm:pl-0"
        }`}
      >
        Our service approach emphasizes consistent procedures, attentive care,
        clear communication, and responsible product handling.
      </p>

      <div className="grid grid-cols-2 gap-2 max-w-[90%] mt-3 sm:mt-0 :pl-0 mb-10">
        {QUALIFICATIONS.map(({ title, description, icon: Icon }) => (
          <div
            key={title}
            className="bg-white flex col-span-2 min-h-9 sm:min-h-[62px] items-center justify-center p-2 sm:p-4 drop-shadow-lg rounded-3xl"
          >
            <div className="flex w-[150px] shrink-0 items-center justify-center border-r pr-6 text-[#001B7A]">
              <Icon
                className="size-5 sm:size-8"
                strokeWidth={1.75}
                aria-hidden
              />
            </div>
            <div
              className={`${montserrat.className} w-[300px] px-3 text-center`}
            >
              <p className="text-3xs font-semibold sm:text-xs">{title}</p>
              <p className="text-[7px] text-slate-600 sm:text-[10px]">
                {description}
              </p>
            </div>
          </div>
        ))}
      </div>

      {templateType === "luxury_elite" ? (
        <div className="z-10 absolute bottom-0 right-0 sm:max-w-[100%] max-w-[80%]">
          <Image
            src={
              qualificationsImage ?? "/images/templates/Images/Maskgroup-3.png"
            }
            alt="Table of Contents"
            className="object-contain image-frame-4"
            height={1600}
            width={1100}
            priority
            unoptimized
          />
          <PoweredBy colorLogo="white" isRight />
        </div>
      ) : (
        <Image
          src={qualificationsImage ?? "/images/templates/Images/image12-2.png"}
          alt="qualifications"
          width={800}
          height={500}
          className="z-20 absolute sm:bottom-20 bottom-6 sm:left-20 left-6 max-w-[85%]"
          priority
          unoptimized
        />
      )}
    </div>
  );
};

export { ContentQualificationsSection };
