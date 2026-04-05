import { TemplateType } from "@/features/templates/types/templates";
import LogoImage from "./logo-image";
import React from "react";

export const HeaderLogo = ({
  logoUrl,
  companyName,
  isTop,
  withoutGradient,
  position,
  template,
}: {
  logoUrl: string;
  companyName: string;
  isTop?: boolean;
  withoutGradient?: boolean;
  position?: "start" | "center" | "end";
  template?: TemplateType;
}) => {
  return (
    <div
      className={`z-30 flex items-center justify-${
        position || "center"
      } absolute px-2 sm:px-3 py-1 sm:py-2 ${
        withoutGradient
          ? ""
          : "bg-gradient-to-r from-[#ffffff64] to-[#e3f2ff52] rounded-full sm:h-28 sm:w-80 h-15 w-40 sm:mt-5 mt-0"
      } ${
        isTop
          ? "sm:top-0 top-5 left-3 sm:left-12"
          : "top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%]"
      }`}
    >
      {template === "luxury_elite" && (
        <div className="absolute bg-white w-full h-[80px] sm:h-[170px] -z-10 sm:-top-0 -top-5"></div>
      )}

      <LogoImage
        logoUrl={logoUrl}
        companyName={companyName}
        templateType={template}
      />
    </div>
  );
};
