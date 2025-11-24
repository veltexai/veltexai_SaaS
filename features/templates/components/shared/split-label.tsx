import { splitLastWordOrServiceArea } from '../../utils/utils';

type SplitLabelProps = {
  text: string;
  className?: string;
};

export function SplitLabel({ text, className }: SplitLabelProps) {
  const { top, bottom } = splitLastWordOrServiceArea(text);

  return (
    <span
      className={`flex flex-col text-center leading-tight text-lg text-[#383838] ${className}`}
    >
      <span>{top}</span>
      {bottom && <span className="">{bottom}</span>}
    </span>
  );
}
