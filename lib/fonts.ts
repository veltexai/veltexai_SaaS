import { Montserrat, DM_Serif_Text } from 'next/font/google';
import localFont from 'next/font/local';

export const montserrat = Montserrat({
  variable: '--font-montserrat',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '900'],
  display: 'swap',
});

export const dmSerifText = DM_Serif_Text({
  variable: '--font-dm-serif-text',
  subsets: ['latin'],
  weight: '400',
  style: ['italic'],
  display: 'swap',
});

export const arvo = localFont({
  variable: '--font-arvo',
  display: 'swap',
  src: [
    { path: './Fonts/Arvo/Arvo-Regular.woff2', weight: '400', style: 'normal' },
    { path: './Fonts/Arvo/Arvo-Bold.woff2', weight: '700', style: 'normal' },
    { path: './Fonts/Arvo/Arvo-Italic.woff2', weight: '400', style: 'italic' },
    { path: './Fonts/Arvo/Arvo-BoldItalic.woff2', weight: '700', style: 'italic' },
  ],
});
