// Spanish is a draft for Martina's review (QUAL-03). Register: "tú", not "usted".
import type { Dictionary } from './ui.en';

export const es = {
  'a11y.skipToContent': 'Saltar al contenido',
  'a11y.newTab': '(se abre en una pestaña nueva)',
  'nav.label': 'Principal',
  'nav.contact': 'Contacto',
  'lang.label': 'Idioma',
  'lang.en': 'English',
  'lang.es': 'Español',
  'hero.greeting': 'Hola, soy',
  'hero.title': 'Diseñadora gráfica para web y redes sociales',
  'hero.description':
    'Diseño webs, piezas de marca y contenido para redes que ayudan a pequeños negocios a verse tan bien como son.',
  'hero.imageAlt': 'Retrato de Martina Fernandez',
  'hero.cta': 'Trabajemos juntos',
  // TODO(martina): confirm Phase 2 copy (badge, section headings, pause label).
  'availability.open': 'Abierta a nuevos proyectos',
  'roles.heading': 'A qué me dedico',
  'roles.pause': 'Pausar animación de roles',
  'services.heading': 'Qué puedo hacer por ti',
  'tools.heading': 'Herramientas con las que trabajo',
  'footer.heading': 'Hablemos',
  'footer.behance': 'Martina en Behance',
  'footer.instagram': 'Martina en Instagram',
  'footer.linkedin': 'Martina en LinkedIn',
  'footer.copyright': '© {year} Martina Fernandez',
  'meta.home.title': 'Martina Fernandez — Diseñadora gráfica',
  'meta.home.description':
    'Portfolio de Martina Fernandez, diseñadora gráfica especializada en diseño web y redes sociales.',
  'meta.404.title': 'Página no encontrada — Martina Fernandez',
  'meta.404.description':
    'Esta página no existe o ha cambiado de lugar. Vuelve al inicio para seguir explorando.',
  'notFound.heading': 'Página no encontrada',
  'notFound.body':
    'Esta página no existe o ha cambiado de lugar. Vuelve al inicio para seguir explorando.',
  'notFound.cta': 'Volver al inicio',
  'notFound.altLocalePrompt': '¿Buscas la versión en español?',
  'notFound.altLocaleLink': 'Ir al inicio',
} as const satisfies Dictionary;
