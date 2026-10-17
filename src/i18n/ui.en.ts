// Source dictionary. Every UI string (visible or ARIA) lives here; ui.es.ts must match its keys.
// Hero copy is a draft. TODO(martina): confirm final copy.
export const en = {
  'a11y.skipToContent': 'Skip to content',
  'a11y.newTab': '(opens in a new tab)',
  'nav.label': 'Main',
  'nav.contact': 'Contact',
  'lang.label': 'Language',
  'lang.en': 'English',
  'lang.es': 'Español',
  'hero.greeting': "Hi, I'm",
  'hero.title': 'Graphic designer for web & social media',
  'hero.description':
    'I design websites, brand visuals and social content that help small businesses look as good as they are.',
  'hero.imageAlt': 'Portrait of Martina Fernandez',
  'hero.cta': "Let's work together",
  // TODO(martina): confirm Phase 2 copy (badge, section headings, pause label).
  'availability.open': 'Open to new projects',
  'roles.heading': 'What I do',
  'roles.pause': 'Pause roles animation',
  'services.heading': 'What I can do for you',
  'tools.heading': 'Tools I work with',
  'footer.heading': "Let's talk",
  'footer.behance': 'Martina on Behance',
  'footer.instagram': 'Martina on Instagram',
  'footer.linkedin': 'Martina on LinkedIn',
  'footer.copyright': '© {year} Martina Fernandez',
  'meta.home.title': 'Martina Fernandez — Graphic designer',
  'meta.home.description':
    'Portfolio of Martina Fernandez, graphic designer specialising in web design and social media.',
  'meta.404.title': 'Page not found — Martina Fernandez',
  'meta.404.description': "This page doesn't exist or has moved. Head back home to keep exploring.",
  'notFound.heading': 'Page not found',
  'notFound.body': "This page doesn't exist or has moved. Head back home to keep exploring.",
  'notFound.cta': 'Back to home',
  'notFound.altLocalePrompt': 'Looking for the English version?',
  'notFound.altLocaleLink': 'Go to home',
} as const;

export type UIKey = keyof typeof en;
export type Dictionary = Record<UIKey, string>;
