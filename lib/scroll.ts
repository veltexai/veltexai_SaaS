export const MOBILE_BREAKPOINT_PX = 768;

export function scrollToTopOnMobile(): void {
  if (typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT_PX) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}