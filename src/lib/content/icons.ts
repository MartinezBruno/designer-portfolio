// Tool icon keys shared by content.config.ts (z.enum) and the ToolIcon typed map.
export const toolIconKeys = ['illustrator', 'indesign', 'photoshop', 'figma', 'lightroom'] as const;

export type ToolIconKey = (typeof toolIconKeys)[number];
