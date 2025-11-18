import React from 'react';
import { arvo, dmSerifText, montserrat } from '@/lib/fonts';
import { formatDateToMMDDYY } from '@/lib/utils';
import { TemplateType } from '@/types/templates';

const HeaderTemplate = ({
  title,
  preparedFor,
  date,
  className,
  address,
  textColor = 'text-white',
  colorBorder = 'from-white/10 to-[#E3F2FF]',
  gap = 'gap-4',
  template,
}: {
  title: string;
  preparedFor: string;
  date: string;
  address: string;
  className?: string;
  textColor?: string;
  colorBorder?: string;
  gap?: string;
  template?: TemplateType;
}) => {
  return (
    <>
      <div className={`flex flex-col ${gap} ${textColor}`}>
        <p
          className={`${dmSerifText.className} ${
            template === 'modern_corporate'
              ? 'pl-8 text-[var(--color-primary)]'
              : ''
          } ${
            template === 'luxury_elite'
              ? `${arvo.className} uppercase tracking-[5px] !not-italic leading-0 !text-sm`
              : ''
          } text-[24px] leading-[100%] ${className}`}
        >
          Proposal for
        </p>
        <h1
          className={`capitalize font-bold ${
            template === 'modern_corporate'
              ? 'text-[68px] pl-8 bg-gradient-to-r from-[#001B7A] to-[#3555C7] bg-clip-text text-transparent'
              : 'text-[81px]'
          } 
          ${
            template === 'luxury_elite'
              ? `tk-bely !leading-[80%]`
              : `${montserrat.className}`
          }
          leading-[100%] ${className}`}
        >
          {title}
        </h1>
        {(template === 'modern_corporate' || template === 'luxury_elite') && (
          <p
            className={` ${
              template === 'modern_corporate'
                ? `pl-8 ${montserrat.className} text-2xl py-4`
                : `${arvo.className} text-xl pb-10 pt-2`
            }`}
          >
            Proven Strategies to Create a Healthier Environment!
          </p>
        )}
        <div
          className={`relative mb-3 ${
            template === 'luxury_elite'
              ? `text-lg ${arvo.className}`
              : 'text-sm'
          }`}
        >
          <span
            aria-hidden
            className={`pointer-events-none absolute left-0 right-0 top-0 h-[1.5px] bg-gradient-to-l ${colorBorder}`}
          />
          <span
            aria-hidden
            className={`pointer-events-none absolute left-0 right-0 bottom-0 h-[1.5px] bg-gradient-to-l ${colorBorder}`}
          />
          <div className="relative flex items-center">
            <div className="relative flex-2 p-2">
              <p className="pl-4">
                {' '}
                Prepared for:{' '}
                <span className="font-bold pl-1">{preparedFor}</span>
              </p>
              {template !== 'luxury_elite' && (
                <span
                  aria-hidden
                  className={`pointer-events-none absolute top-1 right-0 w-[1.5px] h-[80%] bg-gradient-to-t ${colorBorder}`}
                />
              )}
            </div>
            {template !== 'luxury_elite' && (
              <p className="flex-1 flex items-center justify-center p-2">
                Date:
                <span className="font-bold pl-1">
                  {formatDateToMMDDYY(date)}
                </span>
              </p>
            )}
            <span
              aria-hidden
              className={`pointer-events-none absolute left-0 right-0 bottom-0 h-[1.5px] bg-gradient-to-l ${colorBorder}`}
            />
          </div>
          <p className="pb-2 pt-[6.5px] pl-6">
            Address: <span className="font-bold pl-1">{address}</span>
          </p>
        </div>
      </div>
    </>
  );
};

export default HeaderTemplate;
