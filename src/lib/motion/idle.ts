/**
 * Resolves after the window `load` event, one painted frame and an idle callback (lever L2b,
 * 08-14). Lighthouse's simulated LCP counts every request already in flight at observed LCP, so a
 * lazy chunk requested before the first image paint inflates it (detail page −1,130 ms measured).
 * Plain "load + idle" still raced the image paint, hence the extra frame. Project rule: defer
 * deferrable JS. When the document is already complete (soft navigation) the load wait is skipped.
 */
export function afterLoadIdle(win: Window, timeoutMs = 1000): Promise<void> {
  return new Promise((resolve) => {
    const idle = (): void => {
      if (Reflect.has(win, 'requestIdleCallback')) {
        win.requestIdleCallback(() => resolve(), { timeout: timeoutMs });
      } else {
        win.setTimeout(resolve, 0);
      }
    };
    const afterPaint = (): void => {
      win.requestAnimationFrame(() => win.setTimeout(idle, 0));
    };
    if (win.document.readyState === 'complete') afterPaint();
    else win.addEventListener('load', afterPaint, { once: true });
  });
}
