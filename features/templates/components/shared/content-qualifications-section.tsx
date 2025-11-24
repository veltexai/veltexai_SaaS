import { montserrat } from '@/lib/fonts';
import { TemplateType } from '@/features/templates/types/templates';
import Image from 'next/image';
import React from 'react';
import PoweredBy from './powered-by';

const ContentQualificationsSection = ({
  templateType,
}: {
  templateType: TemplateType;
}) => {
  return (
    <div className="text-xs">
      <p
        className={`${montserrat.className} ${
          templateType === 'modern_corporate' ? 'my-6' : 'my-8'
        }`}
      >
        We maintain appropriate insurance coverage and follow applicable
        standards. Certifications or memberships can be listed here to
        strengthen buyer confidence.
      </p>

      <div className="grid grid-cols-2 gap-2 max-w-[90%]">
        <div className="bg-white flex col-span-2 items-center justify-center p-4 shadow-lg rounded-3xl">
          <div className="border-r pr-6">
            <Image
              src={`/images/templates/image14.svg`}
              alt="qualifications"
              width={180}
              height={40}
              className="w-[150px] h-[30px]"
            />
          </div>

          <p className={`${montserrat.className} text-center w-[300px]`}>
            General Liability Insurance
          </p>
        </div>

        <div className="bg-white flex col-span-2 items-center justify-center p-4 shadow-lg rounded-3xl">
          <div className="border-r pr-6">
            <Image
              src={`/images/templates/image13.svg`}
              alt="qualifications"
              width={180}
              height={40}
              className="w-[150px] h-[30px]"
            />
          </div>

          <p className={`${montserrat.className} text-center w-[300px]`}>
            Background-Checked Personnel
          </p>
        </div>
        <div className="bg-white flex col-span-2 items-center justify-center p-4 shadow-lg rounded-3xl">
          <div className="border-r pr-6">
            <Image
              src={`/images/templates/image15.svg`}
              alt="qualifications"
              width={180}
              height={40}
              className="w-[150px] h-[30px]"
            />
          </div>

          <p className={`${montserrat.className} text-center w-[300px]`}>
            Workers’ Compensation
          </p>
        </div>
        <div className="bg-white flex col-span-2 items-center justify-center p-4 shadow-lg rounded-3xl">
          <div className="border-r pr-6">
            <Image
              src={`/images/templates/image16.svg`}
              alt="qualifications"
              width={180}
              height={40}
              className="w-[150px] h-[30px]"
            />
          </div>

          <p className={`${montserrat.className} text-center w-[300px]`}>
            OSHA-Aware Practices
          </p>
        </div>
        <div className="bg-white flex col-span-2 h-[62px] items-center justify-center p-4 shadow-lg rounded-3xl">
          <p className={`${montserrat.className} text-center w-[300px]`}>
            Equipment & Chemical Safety
          </p>
        </div>
      </div>

      {templateType === 'luxury_elite' ? (
        <div className="z-10 absolute bottom-0 right-0">
          <Image
            src="/images/templates/images/Mask group-3.png"
            alt="Table of Contents"
            className=" object-contain"
            height={1600}
            width={1100}
          />
          <PoweredBy colorLogo="white" isRight />
        </div>
      ) : (
        <Image
          src={`/images/templates/Images/image12-2.png`}
          alt="qualifications"
          width={800}
          height={500}
          className="z-20 absolute bottom-20 left-20 max-w-[85%]"
        />
      )}
    </div>
  );
};

export default ContentQualificationsSection;
