import React from 'react';
import { dmSerifText, montserrat } from '@/lib/fonts';
import { formatDateToMMDDYY } from '@/lib/utils';

const HeaderTemplate = ({
  title,
  preparedFor,
  date,
  className,
  address,
}: {
  title: string;
  preparedFor: string;
  date: string;
  address: string;
  className?: string;
}) => {
  return (
    <>
      <div className="flex flex-col gap-4">
        <p
          className={`${dmSerifText.className} text-[24px] leading-[100%] text-white ${className}`}
        >
          Proposal for
        </p>
        <h1
          className={`${montserrat.className} capitalize font-bold text-[81px] leading-[100%] text-white ${className}`}
        >
          {title}
        </h1>
        <div className="relative mb-3 text-white text-sm">
          <span
            aria-hidden
            className="pointer-events-none absolute left-0 right-0 top-0 h-[1.5px] bg-gradient-to-l from-white/10 to-[#E3F2FF]"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute left-0 right-0 bottom-0 h-[1.5px] bg-gradient-to-l from-white/10 to-[#E3F2FF]"
          />
          <div className="relative flex items-center">
            <div className="relative flex-2 p-2">
              <p className="pl-4">
                {' '}
                Prepared for:{' '}
                <span className="font-bold pl-1">{preparedFor}</span>
              </p>
              <span
                aria-hidden
                className="pointer-events-none absolute top-1 right-0 w-[1.5px] h-[80%] bg-gradient-to-t from-white/10 to-[#E3F2FF]"
              />
            </div>
            <p className="flex-1 flex items-center justify-center p-2">
              Date: <span className="font-bold pl-1">{formatDateToMMDDYY(date)}</span>
            </p>
            <span
              aria-hidden
              className="pointer-events-none absolute left-0 right-0 bottom-0 h-[1.5px] bg-gradient-to-l from-white/10 to-[#E3F2FF]"
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
