import { montserrat } from "@/lib/fonts";
import { TemplateType } from "@/features/templates/types/templates";
import Image from "next/image";
import React from "react";
import { PoweredBy } from "./powered-by";

const ContentQualificationsSection = ({
  templateType,
}: {
  templateType: TemplateType;
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
        We maintain appropriate insurance coverage and follow applicable
        standards. Certificates of insurance available upon request.
      </p>

      <div className="grid grid-cols-2 gap-2 max-w-[90%] mt-3 sm:mt-0 pl-6 sm:pl-0 mb-10">
        <div className="bg-white flex col-span-2 items-center justify-center p-2 sm:p-4 drop-shadow-lg rounded-3xl">
          <div className="border-r pr-6">
            <Image
              src={`/images/templates/image14.svg`}
              alt="qualifications"
              width={180}
              height={40}
              className="w-[150px] h-[20px] sm:h-[30px]"
              priority
              unoptimized
            />
          </div>

          <p
            className={`${montserrat.className} text-center text-3xs sm:text-xs w-[300px]`}
          >
            General Liability Insurance
          </p>
        </div>

        <div className="bg-white flex col-span-2 items-center justify-center p-2 sm:p-4 drop-shadow-lg rounded-3xl">
          <div className="border-r pr-6">
            <Image
              src={`/images/templates/image13.svg`}
              alt="qualifications"
              width={180}
              height={40}
              className="w-[150px] h-[20px] sm:h-[30px]"
              priority
              unoptimized
            />
          </div>

          <p
            className={`${montserrat.className} text-center text-3xs sm:text-xs w-[300px]`}
          >
            Background-Checked Personnel
          </p>
        </div>
        <div className="bg-white flex col-span-2 items-center justify-center p-2 sm:p-4 drop-shadow-lg rounded-3xl">
          <div className="border-r pr-6">
            <Image
              src={`/images/templates/image15.svg`}
              alt="qualifications"
              width={180}
              height={40}
              className="w-[150px] h-[20px] sm:h-[30px]"
              priority
              unoptimized
            />
          </div>

          <p
            className={`${montserrat.className} text-center text-3xs sm:text-xs w-[300px]`}
          >
            Workers’ Compensation
          </p>
        </div>
        <div className="bg-white flex col-span-2 items-center justify-center p-2 sm:p-4 drop-shadow-lg rounded-3xl">
          <div className="border-r pr-6">
            <Image
              src={`/images/templates/image16.svg`}
              alt="qualifications"
              width={180}
              height={40}
              className="w-[150px] h-[20px] sm:h-[30px]"
              priority
              unoptimized
            />
          </div>

          <p
            className={`${montserrat.className} text-center text-3xs sm:text-xs w-[300px]`}
          >
            OSHA-Aware Practices
          </p>
        </div>
        <div className="bg-white flex col-span-2 sm:h-[62px] h-[36px] items-center justify-center p-2 sm:p-4 drop-shadow-lg rounded-3xl">
          <p
            className={`${montserrat.className} text-center text-3xs sm:text-xs w-[300px]`}
          >
            Equipment & Chemical Safety
          </p>
        </div>
      </div>

      {templateType === "luxury_elite" ? (
        <div className="z-10 absolute bottom-0 right-0 sm:max-w-[100%] max-w-[80%]">
          <Image
            src="/images/templates/Images/Maskgroup-3.png"
            alt="Table of Contents"
            className="object-contain"
            height={1600}
            width={1100}
            priority
            unoptimized
          />
          <PoweredBy colorLogo="white" isRight />
        </div>
      ) : (
        <Image
          src={`/images/templates/Images/image12-2.png`}
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
