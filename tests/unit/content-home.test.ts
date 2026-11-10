import { describe, expect, it } from 'vitest';
import profile from '../../src/data/profile.json';
import roles from '../../src/data/roles.json';
import services from '../../src/data/services.json';
import tools from '../../src/data/tools.json';
import {
  assertCount,
  assertNonEmpty,
  buildRoles,
  buildServices,
  buildTools,
  resolveAvailability,
  sortByOrder,
  type RoleEntry,
  type ServiceEntry,
  type ToolEntry,
} from '../../src/lib/content/home';
import { toolIconKeys } from '../../src/lib/content/icons';

// Direct JSON imports: the file() loader swallows parse errors, these fail pnpm test instead.
describe('content files', () => {
  const sortedRoles = [...roles].sort((a, b) => a.order - b.order);
  const sortedServices = [...services].sort((a, b) => a.order - b.order);
  const sortedTools = [...tools].sort((a, b) => a.order - b.order);

  it('roles has the 4 roles in order with es and en labels', () => {
    expect(roles).toHaveLength(4);
    expect(sortedRoles.map((role) => role.id)).toEqual([
      'web-design',
      'branding',
      'social-media-manager',
      'graphic-design',
    ]);
    expect(sortedRoles.map((role) => role.label.es)).toEqual([
      'Diseño web',
      'Branding',
      'Social media manager',
      'Diseño gráfico',
    ]);
    expect(sortedRoles.map((role) => role.label.en)).toEqual([
      'Web design',
      'Branding',
      'Social media manager',
      'Graphic design',
    ]);
  });

  it('services has exactly 5 entries in order', () => {
    expect(services).toHaveLength(5);
    expect(sortedServices.map((service) => service.id)).toEqual([
      'graphic-design',
      'web-design',
      'branding',
      'social-media',
      'photography',
    ]);
  });

  it('photography has the approved title and items (D-06, D-07)', () => {
    const photography = sortedServices.find((service) => service.id === 'photography');
    expect(photography?.title).toEqual({ en: 'Photography', es: 'Fotografía' });
    expect(photography?.items.en).toEqual([
      'Product photography',
      'Portraits',
      'Photos for social media',
      'Editing and retouching',
    ]);
    expect(photography?.items.es).toEqual([
      'Fotografía de producto',
      'Retratos',
      'Fotos para redes sociales',
      'Edición y retoque',
    ]);
  });

  it('services have matching en and es item counts', () => {
    expect(sortedServices.map((service) => service.items.es.length)).toEqual([4, 5, 6, 3, 4]);
    expect(sortedServices.map((service) => service.items.en.length)).toEqual([4, 5, 6, 3, 4]);
  });

  it('branding starts with visual identity', () => {
    const branding = sortedServices.find((service) => service.id === 'branding');
    expect(branding?.items.es[0]).toBe('Identidad visual');
    expect(branding?.items.en[0]).toBe('Visual identity');
  });

  it('services have no icon field', () => {
    for (const service of services) {
      expect(Object.keys(service)).not.toContain('icon');
    }
  });

  it('services have no description field', () => {
    for (const service of services) {
      expect(Object.keys(service)).not.toContain('description');
    }
  });

  it('tools has exactly 5 tools in order with known icon keys', () => {
    expect(tools).toHaveLength(5);
    expect(sortedTools.map((tool) => tool.name)).toEqual([
      'Adobe Illustrator',
      'Adobe InDesign',
      'Adobe Photoshop',
      'Figma',
      'Adobe Lightroom',
    ]);
    expect(sortedTools.map((tool) => tool.icon)).toEqual([
      'illustrator',
      'indesign',
      'photoshop',
      'figma',
      'lightroom',
    ]);
    const keys: readonly string[] = toolIconKeys;
    for (const tool of tools) {
      expect(keys).toContain(tool.icon);
    }
  });

  it('profile marks her as available', () => {
    expect(profile.availability.available).toBe(true);
  });

  it('every localized string is non-empty in en and es', () => {
    const strings = [
      ...roles.flatMap((role) => [role.label.en, role.label.es]),
      ...services.flatMap((service) => [
        service.title.en,
        service.title.es,
        ...service.items.en,
        ...service.items.es,
      ]),
      ...tools.map((tool) => tool.name),
    ];
    for (const value of strings) {
      expect(value.trim()).not.toBe('');
    }
  });
});

describe('home query layer', () => {
  const roleFixture: RoleEntry[] = [
    { id: 'branding', data: { order: 2, label: { en: 'Branding', es: 'Branding' } } },
    { id: 'web-design', data: { order: 1, label: { en: 'Web design', es: 'Diseño web' } } },
    {
      id: 'graphic-design',
      data: { order: 3, label: { en: 'Graphic design', es: 'Diseño gráfico' } },
    },
  ];

  const serviceFixture: ServiceEntry[] = [
    {
      id: 'branding',
      data: {
        order: 3,
        title: { en: 'Branding', es: 'Branding' },
        items: { en: ['Visual identity', 'Logo'], es: ['Identidad visual', 'Logo'] },
      },
    },
    {
      id: 'graphic-design',
      data: {
        order: 1,
        title: { en: 'Graphic design', es: 'Diseño gráfico' },
        items: { en: ['Watermarks'], es: ['Marcas de agua'] },
      },
    },
    {
      id: 'social-media',
      data: {
        order: 4,
        title: { en: 'Social media', es: 'Social media' },
        items: { en: ['Feed design'], es: ['Diseño del feed'] },
      },
    },
    {
      id: 'web-design',
      data: {
        order: 2,
        title: { en: 'Web design', es: 'Diseño web' },
        items: { en: ['Prototyping'], es: ['Prototipado'] },
      },
    },
    {
      id: 'photography',
      data: {
        order: 5,
        title: { en: 'Photography', es: 'Fotografía' },
        items: { en: ['Portraits'], es: ['Retratos'] },
      },
    },
  ];

  const toolFixture: ToolEntry[] = [
    { id: 'figma', data: { order: 2, name: 'Figma', icon: 'figma' } },
    { id: 'illustrator', data: { order: 1, name: 'Adobe Illustrator', icon: 'illustrator' } },
  ];

  describe('sortByOrder', () => {
    it('sorts by order ascending without mutating the input', () => {
      const ids = roleFixture.map((role) => role.id);
      expect(sortByOrder(roleFixture).map((role) => role.id)).toEqual([
        'web-design',
        'branding',
        'graphic-design',
      ]);
      expect(roleFixture.map((role) => role.id)).toEqual(ids);
    });

    it('breaks ties by id', () => {
      const tied = [
        { id: 'b', data: { order: 1 } },
        { id: 'a', data: { order: 1 } },
      ];
      expect(sortByOrder(tied).map((entry) => entry.id)).toEqual(['a', 'b']);
    });
  });

  describe('assertCount', () => {
    it('throws the developer message on a wrong count', () => {
      expect(() => assertCount([], 4, 'services')).toThrow(
        new Error('services: expected exactly 4 entries, got 0. Fix src/data/services.json'),
      );
    });

    it('returns the entries on the expected count', () => {
      expect(assertCount(serviceFixture, 5, 'services')).toBe(serviceFixture);
    });
  });

  describe('assertNonEmpty', () => {
    it.each(['roles', 'tools'])('throws for empty %s', (name) => {
      expect(() => assertNonEmpty([], name)).toThrow(
        new Error(`${name}: expected at least 1 entry, got 0. Fix src/data/${name}.json`),
      );
    });
  });

  describe('resolveAvailability', () => {
    it('throws when the availability entry is missing', () => {
      expect(() => resolveAvailability(undefined)).toThrow(
        new Error('profile: missing "availability" entry. Fix src/data/profile.json'),
      );
    });

    it('returns the available flag', () => {
      expect(resolveAvailability({ data: { available: false } })).toBe(false);
      expect(resolveAvailability({ data: { available: true } })).toBe(true);
    });
  });

  describe('buildRoles', () => {
    it('returns localized labels in order', () => {
      expect(buildRoles(roleFixture, 'es')).toEqual(['Diseño web', 'Branding', 'Diseño gráfico']);
    });

    it('throws on an empty collection', () => {
      expect(() => buildRoles([], 'en')).toThrow(
        'roles: expected at least 1 entry, got 0. Fix src/data/roles.json',
      );
    });
  });

  describe('buildServices', () => {
    it('returns 5 ordered localized view models', () => {
      const views = buildServices(serviceFixture, 'en');
      expect(views).toEqual([
        { id: 'graphic-design', title: 'Graphic design', items: ['Watermarks'] },
        { id: 'web-design', title: 'Web design', items: ['Prototyping'] },
        { id: 'branding', title: 'Branding', items: ['Visual identity', 'Logo'] },
        { id: 'social-media', title: 'Social media', items: ['Feed design'] },
        { id: 'photography', title: 'Photography', items: ['Portraits'] },
      ]);
      for (const view of views) {
        expect(Object.keys(view)).not.toContain('description');
      }
    });

    it('returns copies of the item arrays', () => {
      const [first] = buildServices(serviceFixture, 'en');
      first?.items.push('Mutated');
      expect(serviceFixture[1]?.data.items.en).toEqual(['Watermarks']);
    });

    it('throws when there are not exactly 5 services', () => {
      expect(() => buildServices(serviceFixture.slice(0, 4), 'en')).toThrow(
        'services: expected exactly 5 entries, got 4. Fix src/data/services.json',
      );
    });
  });

  describe('buildTools', () => {
    it('returns ordered tool view models', () => {
      expect(buildTools(toolFixture)).toEqual([
        { id: 'illustrator', name: 'Adobe Illustrator', icon: 'illustrator' },
        { id: 'figma', name: 'Figma', icon: 'figma' },
      ]);
    });

    it('throws on an empty collection', () => {
      expect(() => buildTools([])).toThrow(
        'tools: expected at least 1 entry, got 0. Fix src/data/tools.json',
      );
    });
  });
});
