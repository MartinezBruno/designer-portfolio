export interface SiteConfig {
  name: string;
  /** Used where the page addresses the visitor personally (hero headline). */
  firstName: string;
  url: string;
  email: string;
  socials: {
    behance: string;
    instagram?: string;
    linkedin?: string;
  };
}

export const site = {
  name: 'Martina Fernandez',
  firstName: 'Martina',
  // Real domain (Cloudflare Registrar). Also the contact Action's Turnstile hostname binding.
  url: 'https://martifernandez.com',
  email: 'martinafernandez170404@gmail.com',
  socials: {
    behance: 'https://www.behance.net/martifernand7',
    instagram: 'https://www.instagram.com/martif_ph/',
  },
} as const satisfies SiteConfig;
