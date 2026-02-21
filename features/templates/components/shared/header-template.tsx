import React from "react";
import { arvo, dmSerifText, montserrat } from "@/lib/fonts";
import { formatDateToMMDDYY } from "@/lib/utils";
import { TemplateType } from "@/features/templates/types/templates";

const HeaderTemplate = ({
  title,
  preparedFor,
  date,
  className,
  address,
  serviceLocation,
  city,
  textColor = "text-white",
  colorBorder = "from-white/10 to-[#E3F2FF]",
  gap = "gap-4",
  template,
}: {
  title: string;
  preparedFor: string;
  date: string;
  address: string;
  serviceLocation: string;
  city: string;
  className?: string;
  textColor?: string;
  colorBorder?: string;
  gap?: string;
  template?: TemplateType;
}) => {
  return (
    <>
      <div className={`flex flex-col gap-2 sm:gap-3 md:${gap} ${textColor}`}>
        <p
          className={`${dmSerifText.className} ${
            template === "modern_corporate"
              ? "pl-2 sm:pl-4 md:pl-8 text-[var(--color-primary)]"
              : ""
          } ${
            template === "luxury_elite"
              ? `${arvo.className} uppercase tracking-[2px] sm:tracking-[3px] md:tracking-[5px] !not-italic leading-0 !text-2xs sm:!text-sm`
              : ""
          } text-[14px] sm:text-[18px] md:text-[24px] leading-[100%] ${className}`}
        >
          Proposal for
        </p>
        <h1
          className={`capitalize font-bold ${
            template === "modern_corporate"
              ? "text-[32px] sm:text-[48px] md:text-[68px] pl-2 sm:pl-4 md:pl-8 bg-gradient-to-r from-[#001B7A] to-[#3555C7] bg-clip-text text-transparent print:bg-none print:text-[#001B7A] print:bg-clip-border"
              : "text-[36px] sm:text-[54px] md:text-[81px]"
          } 
          ${
            template === "luxury_elite"
              ? `tk-bely !leading-[80%]`
              : `${montserrat.className}`
          }
          leading-[100%] break-words ${className}`}
        >
          {title}
        </h1>
        {(template === "modern_corporate" || template === "luxury_elite") && (
          <p
            className={` ${
              template === "modern_corporate"
                ? `pl-2 sm:pl-4 md:pl-8 ${montserrat.className} text-sm sm:text-lg md:text-2xl py-2 sm:py-3 md:py-4`
                : `${arvo.className} text-xs sm:text-lg md:text-xl pb-1 sm:pb-6 md:pb-10 pt-1 sm:pt-2`
            }`}
          >
            Proven Strategies to Create a Healthier Environment!
          </p>
        )}
        <div
          className={`relative mb-2 sm:mb-3 ${
            template === "luxury_elite"
              ? `text-xs sm:text-base md:text-lg ${arvo.className}`
              : "text-[10px] sm:text-xs md:text-sm"
          }`}
        >
          <span
            aria-hidden
            className={`pointer-events-none absolute left-0 right-0 top-0 h-[1px] sm:h-[1.5px] bg-gradient-to-l ${colorBorder}`}
          />
          <span
            aria-hidden
            className={`pointer-events-none absolute left-0 right-0 bottom-0 h-[1px] sm:h-[1.5px] bg-gradient-to-l ${colorBorder}`}
          />
          <div className="relative flex flex-row items-start sm:items-center">
            <div className="relative flex-2 p-1.5 sm:p-2 w-full sm:w-auto">
              <p className="pl-2 sm:pl-4">
                {" "}
                Prepared for:{" "}
                <span className="font-bold pl-0.5 sm:pl-1 break-words">
                  {preparedFor}
                </span>
              </p>
              {template !== "luxury_elite" && (
                <span
                  aria-hidden
                  className={`pointer-events-none absolute top-1 right-0 w-[1px] sm:w-[1.5px] h-[80%] bg-gradient-to-t ${colorBorder} block`}
                />
              )}
            </div>
            {template !== "luxury_elite" && (
              <p className="flex-1 flex items-center justify-start sm:justify-center p-1.5 sm:p-2 pl-2 sm:pl-0">
                Date:
                <span className="font-bold pl-0.5 sm:pl-1">
                  {formatDateToMMDDYY(date)}
                </span>
              </p>
            )}
            <span
              aria-hidden
              className={`pointer-events-none absolute left-0 right-0 bottom-0 h-[1px] sm:h-[1.5px] bg-gradient-to-l ${colorBorder}`}
            />
          </div>
          <p className="pb-1.5 sm:pb-2 pt-1 sm:pt-[6.5px] pl-2 sm:pl-4 md:pl-6 break-words">
            Address:{" "}
            <span className="font-bold pl-0.5 sm:pl-1">
              {city ? `${city}, ` : ""}{" "}
              {serviceLocation ? `${serviceLocation}, ` : ""}{" "}
              {address ? address : "Service Location To Be Confirmed"}
            </span>
          </p>
        </div>
      </div>
    </>
  );
};

export default HeaderTemplate;
