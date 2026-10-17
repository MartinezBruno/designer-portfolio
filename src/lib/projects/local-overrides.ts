// Site-only: the committed overrides file, parsed at module scope so a bad entry fails astro build.
import raw from '../../data/project-overrides.json';
import { parseOverrides, type Overrides } from './overrides-schema';

export const overrides: Overrides = parseOverrides(raw);
