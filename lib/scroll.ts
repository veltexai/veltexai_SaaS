export const MOBILE_BREAKPOINT_PX = 768;

/**
 * Scroll the window to the top on narrow viewports.
 *
 * Must run after the next paint when step content swaps (e.g. proposal form
 * step 2 → 3). That path has no `await` in validation, so a synchronous
 * `scrollTo` runs while the old DOM is still mounted; iOS Safari then
 * cancels or mis-clamps smooth scrolling when layout height changes.
 * Double rAF waits for React to commit; we force instant scroll and
 * briefly override `html { scroll-behavior: smooth }` from globals.css.
 */
export function scrollToTopOnMobile(): void {
  if (typeof window === "undefined" || window.innerWidth >= MOBILE_BREAKPOINT_PX) {
    return;
  }

  const forceScrollTop = () => {
    const html = document.documentElement;
    const prevBehavior = html.style.scrollBehavior;
    html.style.scrollBehavior = "auto";
    window.scrollTo(0, 0);
    html.scrollTop = 0;
    document.body.scrollTop = 0;
    html.style.scrollBehavior = prevBehavior;
  };

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      forceScrollTop();
      // Second pass: Radix/unmount can shift layout one frame later on iOS.
      requestAnimationFrame(forceScrollTop);
    });
  });
}