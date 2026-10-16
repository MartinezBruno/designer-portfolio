// Icon keys shared by content.config.ts (z.enum) and the ServiceIcon/ToolIcon typed maps.
export const serviceIconKeys = ['vector', 'layout', 'palette', 'speakerphone'] as const;

export type ServiceIconKey = (typeof serviceIconKeys)[number];

export const toolIconKeys = ['illustrator', 'indesign', 'photoshop', 'figma', 'lightroom'] as const;

export type ToolIconKey = (typeof toolIconKeys)[number];
