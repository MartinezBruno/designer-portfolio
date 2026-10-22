// Dictionary-free on purpose: client scripts import this file, so they never bundle the
// dictionaries that t.ts pulls in (05-RESEARCH bundle note).

// Replaces `{name}` tokens with values; tokens without a value are left as-is.
export function interpolate(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (token, name: string) => {
    const value = values[name];
    return value === undefined ? token : String(value);
  });
}
