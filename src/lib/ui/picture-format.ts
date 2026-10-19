import type { ImageOutputFormat } from 'astro';

// Astro falls back to PNG by default; 04-11 measured 205 MB of PNG fallbacks.
export const pictureFormat = {
  formats: ['avif'],
  fallbackFormat: 'webp',
} satisfies { formats: ImageOutputFormat[]; fallbackFormat: ImageOutputFormat };
