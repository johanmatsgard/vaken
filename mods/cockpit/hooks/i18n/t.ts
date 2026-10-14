// The lookup of the one text table. `t('area.name', { n })` gives a text by its name in the language of this draw
import type { Lang, Row, Text, Vars } from './types'
import { PAD_LANG, isLang, padded, pluralOf } from './langs'
import { TABLE, byEnglish, formIn } from './table'
import { sysWord } from '../core/syswords'

let current: Lang = 'en'
// The index of the language of this draw, kept with it (undefined for English)
let currentIx: Record<string, string> | undefined

// A code the registry does not hold gives English
export const setLang = (l: unknown): void => {
  current = isLang(l) ? (l as Lang) : 'en'
  currentIx = current === 'en' ? undefined : byEnglish(current)
}
export const langNow = (): Lang => current

// The line in the words of the system first, then in the language: one read of the language's index
export const tr = (s: string): string => {
  const w = sysWord(s)
  return currentIx === undefined ? w : (currentIx[w] ?? w)
}

// The plural form the language's rule picks for the fill-in `n` ("one" or "other")
const formKey = (lang: Lang, vars: Vars | undefined): 'one' | 'other' => {
  const n = vars?.n
  return n === undefined ? 'other' : pluralOf(lang).pick(Number(n))
}
const enForm = (x: Text, key: 'one' | 'other'): string => (typeof x === 'string' ? x : x[key])

// Fill-ins by name: "{n}" takes vars.n
const fill = (s: string, vars: Vars | undefined): string =>
  vars === undefined || s.indexOf('{') < 0 ? s : s.replace(/\{(\w+)\}/g, (m, k: string) => (vars[k] === undefined ? m : String(vars[k])))

// A text in a given language
export function tIn(lang: Lang, name: string, vars?: Vars): string {
  const row = TABLE[name]
  return row === undefined ? name : textOf(row, lang, vars)
}

// One row in a language: its plural form, the words of the system
export function textOf(row: Row, lang: Lang, vars?: Vars): string {
  const en = enForm(row.en, formKey('en', vars))
  const w = sysWord(en)
  // A line with its own Windows words is found by those words
  if (w !== en) return fill(lang === 'en' ? w : (byEnglish(lang)[w] ?? w), vars)
  if (lang === 'en') return fill(en, vars)
  if (lang === PAD_LANG) return fill(padded(en), vars)
  const key = formKey(lang, vars)
  return fill(formIn(row[lang], key, enForm(row.en, key)) ?? en, vars)
}

// A text in the language of this draw (the pane, the band, toasts, the phone)
export const t = (name: string, vars?: Vars): string => tIn(current, name, vars)

// A text in English, whatever the language
export const tEn = (name: string, vars?: Vars): string => tIn('en', name, vars)

// Lines built from facts, said at the place they are shown
type Template = { re: RegExp; keys: string[]; to: string; lit: number }
const TEMPLATES = Object.create(null) as Partial<Record<Lang, Template[]>>
const FILLED = Object.create(null) as Partial<Record<Lang, Map<string, string>>>
const FILLED_MAX = 400

// A fill-in that holds one number, amount or version is one word
const COUNT_KEYS = /^(n|m|h|p|k|a|b|usd|time|number|left|days|per|pct|today|share|total)$/

function templatesOf(lang: Lang): Template[] {
  const cached = TEMPLATES[lang]
  if (cached !== undefined) return cached
  const out: Template[] = []
  for (const row of Object.values(TABLE)) {
    const own = row[lang]
    if (own === undefined) continue
    const formKeys: Array<'one' | 'other'> = typeof row.en === 'string' ? ['other'] : ['one', 'other']
    const en = formKeys.map(k => enForm(row.en, k))
    const to = formKeys.map((k, i) => formIn(own, k, en[i]) ?? '')
    for (let i = 0; i < en.length; i += 1) {
      if (en[i].indexOf('{') < 0 || to[i] === '') continue
      const keys: string[] = []
      let lit = 0
      const source = en[i]
        .split(/(\{\w+\})/)
        .map(part => {
          const m = /^\{(\w+)\}$/.exec(part)
          if (m === null) {
            lit += part.replace(/[^A-Za-z]/g, '').length
            return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          }
          keys.push(m[1])
          return COUNT_KEYS.test(m[1]) ? '(\\S+?)' : '(.+?)'
        })
        .join('')
      // A template of fill-ins and a few letters would fit almost any line
      if (lit >= 3 && keys.length > 0) out.push({ re: new RegExp(`^${source}$`), keys, to: to[i], lit })
    }
  }
  out.sort((a, b) => b.lit - a.lit)
  TEMPLATES[lang] = out
  return out
}

// Only a fill-in that holds words of vaken is said too
const SAID_KEYS = /^(list|words|parts|area|what|about|ago|age|reason|facts|names|preset)$/

// A fact of words is said too: a known line, a line of its own shape
function saidFact(v: string, lang: Lang, ix: Record<string, string>, depth: number): string {
  if (ix[v] !== undefined) return ix[v]
  if (/, | and /.test(v)) {
    const pieces = v.split(/(, | and )/)
    const out = pieces.map((x, i) => (i % 2 === 1 ? (x === ' and ' && ix.and !== undefined ? ` ${ix.and} ` : x) : said(x, lang, ix, depth - 1)))
    if (out.some((x, i) => i % 2 === 0 && x !== pieces[i])) return out.join('')
  }
  return said(v, lang, ix, depth - 1)
}

// One line in one language: the plain lookup, else the row whose shape fits it
function said(w: string, lang: Lang, ix: Record<string, string>, depth: number): string {
  const plain = ix[w]
  if (plain !== undefined) return plain
  // The same line with a full stop after it (a sentence of a longer line)
  const bare = w.endsWith('.') ? ix[w.slice(0, -1)] : undefined
  if (bare !== undefined) return bare.endsWith('.') ? bare : `${bare}.`
  if (depth <= 0) return w
  const part = (v: string): string => saidFact(v, lang, ix, depth)
  for (const tpl of templatesOf(lang)) {
    const m = tpl.re.exec(w)
    // A fill-in never runs over a full stop and a new sentence: that is a line of several sentences
    if (m === null || m.slice(1).some(c => /\.\s+\S/.test(c))) continue
    return tpl.to.replace(/\{(\w+)\}/g, (_x, k: string) => {
      const at = tpl.keys.indexOf(k)
      return at < 0 ? `{${k}}` : SAID_KEYS.test(k) ? part(m[at + 1]) : m[at + 1]
    })
  }
  const sentences = w.split(/(?<=\.)\s+/)
  if (sentences.length > 1) {
    const out = sentences.map(x => said(x, lang, ix, depth - 1))
    if (out.some((x, i) => x !== sentences[i])) return out.join(' ')
  }
  return w
}

export function trFill(s: string): string {
  // An indented line (the undo preview's file lines) is said without its indent, which is put back
  if (s.charCodeAt(0) === 32) {
    const bare = s.trimStart()
    return bare === '' ? s : s.slice(0, s.length - bare.length) + trFill(bare)
  }
  const w = sysWord(s)
  const lang = current
  if (lang === 'en') return w
  const ix = byEnglish(lang)
  const plain = ix[w]
  if (plain !== undefined) return plain
  // A line made by tLine in this process is said from its row and facts, not guessed from its shape
  const made = MADE.get(s)
  if (made !== undefined) return sayKeyed(made, lang, ix)
  const cache = (FILLED[lang] ??= new Map())
  const hit = cache.get(w)
  if (hit !== undefined) return hit
  const out = said(w, lang, ix, 6)
  if (cache.size >= FILLED_MAX) cache.clear()
  cache.set(w, out)
  return out
}

// Lines kept with their row and facts (keys with values)
export type Keyed = { key: string; vars?: Vars }
const MADE = new Map<string, Keyed>()
const MADE_MAX = 200

export function tLine(key: string, vars?: Vars): string {
  const en = tIn('en', key, vars)
  if (!MADE.has(en) && MADE.size >= MADE_MAX) {
    const oldest = MADE.keys().next()
    if (oldest.done !== true) MADE.delete(oldest.value)
  }
  MADE.set(en, vars === undefined ? { key } : { key, vars })
  return en
}

// The row and facts a line was made from in this process, if tLine made it
export const keyedOf = (en: string): Keyed | undefined => MADE.get(en)

// One keyed line in a language: a fill-in of words ({list}, {reason}, ...) is said too
function sayKeyed(k: Keyed, lang: Lang, ix: Record<string, string>): string {
  if (k.vars === undefined || lang === 'en') return tIn(lang, k.key, k.vars)
  const vars = Object.create(null) as Vars
  for (const [name, v] of Object.entries(k.vars)) vars[name] = typeof v === 'string' && SAID_KEYS.test(name) ? saidFact(sysWord(v), lang, ix, 6) : v
  return tIn(lang, k.key, vars)
}

// Facts read back from the store: an object of words and numbers only, at most KEYED_VARS_MAX of them
export const KEYED_VARS_MAX = 8
export const KEYED_VALUE_MAX = 500
const isVars = (v: unknown): v is Vars => {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return false
  const vals = Object.values(v)
  return vals.length <= KEYED_VARS_MAX && vals.every(x => (typeof x === 'string' && x.length <= KEYED_VALUE_MAX) || (typeof x === 'number' && Number.isFinite(x)))
}

// A row name and facts that may be kept with a stored line: a known row
export const keyedOk = (key: unknown, vars: unknown): boolean => typeof key === 'string' && Object.hasOwn(TABLE, key) && (vars === undefined || isVars(vars))

// A stored line in the language of this draw
export function sayStored(line: { text?: unknown; key?: unknown; vars?: unknown }): string | undefined {
  const { key, vars, text } = line
  if (typeof text !== 'string' || typeof key !== 'string' || !keyedOk(key, vars)) return undefined
  const k: Keyed = vars === undefined ? { key } : { key, vars: vars as Vars }
  if (tIn('en', key, k.vars) !== text) return undefined
  return sayKeyed(k, current, current === 'en' ? {} : byEnglish(current))
}
