// Fill-ins for card builders shared with a text twin; no imports, safe to load from any file.

export type Tr = (s: string) => string
export const same: Tr = s => s

export const fillIn = (s: string, vars: Record<string, string | number>): string => s.replace(/\{(\w+)\}/g, (m, k: string) => (vars[k] === undefined ? m : String(vars[k])))

export function agoIn(s: string, t: Tr): string {
  if (t === same) return s
  const m = /^(.+) ago$/.exec(s)
  return m === null ? t(s) : fillIn(t('{age} ago'), { age: m[1].replace(/ days$/, ` ${t('days')}`) })
}
