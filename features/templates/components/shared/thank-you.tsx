import { TemplateType } from "@/features/templates/types/templates";
import Image from "next/image";
import React from "react";
import { ThankYouSection } from "../sections/thank-you-section";
import LogoImage from "./logo-image";

export const ThankYouPage = ({
  email,
  phone,
  website,
  logoUrl,
  companyName,
  templateType,
}: {
  email: string | null;
  phone: string | null;
  website: string | null;
  logoUrl: string | null;
  companyName: string;
  templateType: TemplateType;
}) => {
  const SrcImage =
    templateType === "modern_corporate"
      ? "/images/templates/Images/image17-1.png"
      : templateType === "luxury_elite"
        ? "/images/templates/Images/Mask group-4.png"
        : "/images/templates/Images/image17.png";

  return (
    <>
      <div
        className={`${
          templateType === "luxury_elite"
            ? "absolute right-0 bottom-0 sm:h-[75%] h-[65%] w-full"
            : "relative w-[85%] h-[55%] sm:top-12 top-6 left-1/2 -translate-x-1/2"
        }`}
      >
        <Image
          src={SrcImage}
          alt="Background"
          className={`size-full ${
            templateType === "luxury_elite" ? "object-fill" : "object-cover"
          }`}
          height={1600}
          width={1000}
          priority
          unoptimized
        />
      </div>
      <div
        className={`absolute flex items-start justify-center gap-2 ${
          templateType === "luxury_elite"
            ? "flex-col left-0 top-0 sm:w-[60%] w-[90%] sm:pl-8 pl-4 sm:pt-8 pt-4"
            : "w-[90%] sm:bottom-12 bottom-1 left-1/2 -translate-x-1/2 "
        }`}
      >
        {logoUrl ? (
          <LogoImage
            logoUrl={logoUrl}
            companyName={companyName}
            templateType={templateType}
          />
        ) : null}
        <ThankYouSection
          templateType={templateType}
          email={email}
          phone={phone}
          website={website}
        />
      </div>
    </>
  );
};
