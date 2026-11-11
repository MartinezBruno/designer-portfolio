// Minimal ambient types for Cloudflare Turnstile's explicit-render API (05-RESEARCH Pattern 4).
// Hand-written so the site takes no dependency for a handful of methods.

export interface TurnstileRenderOptions {
  sitekey: string;
  size: 'flexible';
  appearance: 'interaction-only';
  theme: 'light';
  language: string;
  action: string;
  callback?: (token: string) => void;
  'error-callback'?: (code?: string) => boolean | undefined;
  'expired-callback'?: () => void;
  /** Fires before the widget shows an interactive challenge (interaction-only appearance). */
  'before-interactive-callback'?: () => void;
}

export interface TurnstileApi {
  /** Renders the widget into `el` and returns its widget id. */
  render(el: HTMLElement, options: TurnstileRenderOptions): string;
  reset(id: string): void;
  remove(id: string): void;
  getResponse(id: string): string | undefined;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}
