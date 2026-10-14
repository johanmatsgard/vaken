// The languages of the one text table: one line per language, in column order, English first

export type LangStatus = 'full' | 'partial'
export type LangInfo = { code: string; name: string; status: LangStatus; decimal: string; plural: string }

export const REGISTRY: readonly LangInfo[] = [
  {"code":"en","name":"English","status":"full","decimal":".","plural":"one_other"},
  {"code":"sv","name":"Svenska","status":"full","decimal":",","plural":"one_other"},
]

// The forms a count can pick, and the rule that picks one. "one_other": "one" for exactly 1
export type PluralForm = 'one' | 'other'
export const PLURAL_RULES: Record<string, { forms: readonly PluralForm[]; pick: (n: number) => PluralForm }> = {
  one_other: { forms: ['one', 'other'], pick: n => (n === 1 ? 'one' : 'other') },
  one_other_0_1: { forms: ['one', 'other'], pick: n => (n === 0 || n === 1 ? 'one' : 'other') },
  other_only: { forms: ['other'], pick: () => 'other' },
}

// Every language code, in column order
export const LANGS: readonly string[] = REGISTRY.map(l => l.code)

// A language's line, or the defaults of a language the registry does not hold (English rules)
const BY_CODE: Record<string, LangInfo> = Object.fromEntries(REGISTRY.map(l => [l.code, l]))
// The pseudo-language "pad", for the width test (tests/padwidth.test.ts): not in the registry
export const PAD_LANG = 'pad'
export const padded = (s: string): string => (s === '' ? s : `[${s} ${s.repeat(2).slice(0, Math.ceil(s.length * 0.4))}]`)

export const isLang = (code: unknown): boolean => typeof code === 'string' && (Object.hasOwn(BY_CODE, code) || code === PAD_LANG)
export const langInfo = (code: string): LangInfo => (Object.hasOwn(BY_CODE, code) ? BY_CODE[code] : { code, name: code, status: 'partial', decimal: '.', plural: 'one_other' })
export const decimalOf = (code: string): string => langInfo(code).decimal
export const pluralOf = (code: string): { forms: readonly PluralForm[]; pick: (n: number) => PluralForm } => {
  const rule = langInfo(code).plural
  return Object.hasOwn(PLURAL_RULES, rule) ? PLURAL_RULES[rule] : PLURAL_RULES.one_other
}
