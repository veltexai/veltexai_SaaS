import { Montserrat, DM_Serif_Text } from 'next/font/google';

export const montserrat = Montserrat({
  variable: '--font-montserrat',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

export const dmSerifText = DM_Serif_Text({
  variable: '--font-dm-serif-text',
  subsets: ['latin'],
  weight: '400',
  style: ['italic'],
  display: 'swap',
});