// TODO(martina): review the polished copy in src/data/*.json (JSON has no comments).
// - Spanish is her source copy; English is our translation (D-01).
// - Service bullets were polished for parallel form and typos ("merchandasing", "en gral") (D-02).
// - "Revisión y comentarios" / "Design reviews and feedback" replaces her ambiguous "Comentarios"
//   and needs her confirmation (D-07).
// - Lightroom uses the generic Adobe mark (D-13).
import { defineCollection } from 'astro:content';
import { file } from 'astro/loaders';
import { z } from 'astro/zod';
import { toolIconKeys } from './lib/content/icons';

// Every localized field is required in both locales: a missing es value fails astro check/build.
const localized = z.object({ en: z.string().min(1), es: z.string().min(1) });

const localizedList = z.object({
  en: z.array(z.string().min(1)).min(1),
  es: z.array(z.string().min(1)).min(1),
});

const roles = defineCollection({
  loader: file('src/data/roles.json'),
  schema: z.object({ order: z.number().int(), label: localized }),
});

const services = defineCollection({
  loader: file('src/data/services.json'),
  schema: z.object({
    order: z.number().int(),
    title: localized,
    items: localizedList,
  }),
});

const tools = defineCollection({
  loader: file('src/data/tools.json'),
  schema: z.object({
    order: z.number().int(),
    name: z.string().min(1),
    icon: z.enum(toolIconKeys),
  }),
});

// The single value that shows or hides the availability badge (D-08, D-09).
const profile = defineCollection({
  loader: file('src/data/profile.json'),
  schema: z.object({ available: z.boolean() }),
});

export const collections = { roles, services, tools, profile };
