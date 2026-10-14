// The one text table: every visible text by name
import type { Lang, Row, Rows, Said, Text } from './types'
import { LANGS, PAD_LANG, padded, pluralOf } from './langs'
import { ROWS as toast } from './rows/toast'
import { ROWS as explain } from './rows/explain'
import { ROWS as band } from './rows/band'
import { ROWS as guard } from './rows/guard'
import { ROWS as needs } from './rows/needs'
import { ROWS as winwords } from './rows/winwords'
import { ROWS as pane } from './rows/pane'
import { ROWS as glance } from './rows/glance'
import { ROWS as cardsettings } from './rows/cardsettings'
import { ROWS as sys } from './rows/sys'
import { ROWS as compact } from './rows/compact'
import { ROWS as skills } from './rows/skills'
import { ROWS as find } from './rows/find'
import { ROWS as talk } from './rows/talk'
import { ROWS as calm } from './rows/calm'
import { ROWS as phone } from './rows/phone'
import { ROWS as phonecmds } from './rows/phonecmds'
import { ROWS as awake } from './rows/awake'
import { ROWS as popout } from './rows/popout'
import { ROWS as prs } from './rows/prs'
import { ROWS as ship } from './rows/ship'
import { ROWS as back } from './rows/back'
import { ROWS as safety } from './rows/safety'
import { ROWS as context } from './rows/context'
import { ROWS as preview } from './rows/preview'
import { ROWS as setup } from './rows/setup'
import { ROWS as doRows } from './rows/do'
import { ROWS as shipstep } from './rows/shipstep'
import { ROWS as settings } from './rows/settings'
import { ROWS as cards } from './rows/cards'
import { ROWS as guide } from './rows/guide'
import { ROWS as runcost } from './rows/runcost'
import { ROWS as fit } from './rows/fit'
import { ROWS as fitsettings } from './rows/fitsettings'
import { ROWS as selfcost } from './rows/selfcost'
import { ROWS as cardwhat } from './rows/cardwhat'
import { ROWS as cardhome } from './rows/cardhome'
import { ROWS as cardback } from './rows/cardback'
import { ROWS as cardcompact } from './rows/cardcompact'
import { ROWS as cardcomputer } from './rows/cardcomputer'
import { ROWS as cardship } from './rows/cardship'
import { ROWS as cardcontext } from './rows/cardcontext'
import { ROWS as engines } from './rows/engines'
import { ROWS as access } from './rows/access'
import { ROWS as truth } from './rows/truth'
import { ROWS as fmtRows } from './rows/fmt'
import { ROWS as words } from './rows/words'
import { ROWS as common } from './rows/common'

// Every area, in lookup order: when two areas hold the same English line
export const AREAS: ReadonlyArray<readonly [string, Rows]> = [
  ['toast', toast],
  ['explain', explain],
  ['band', band],
  ['guard', guard],
  ['needs', needs],
  ['winwords', winwords],
  ['pane', pane],
  ['glance', glance],
  ['cardsettings', cardsettings],
  ['sys', sys],
  ['compact', compact],
  ['skills', skills],
  ['find', find],
  ['talk', talk],
  ['calm', calm],
  ['phone', phone],
  ['phonecmds', phonecmds],
  ['awake', awake],
  ['popout', popout],
  ['prs', prs],
  ['ship', ship],
  ['back', back],
  ['safety', safety],
  ['context', context],
  ['preview', preview],
  ['setup', setup],
  ['do', doRows],
  ['shipstep', shipstep],
  ['settings', settings],
  ['cards', cards],
  ['guide', guide],
  ['runcost', runcost],
  ['fit', fit],
  ['fitsettings', fitsettings],
  ['selfcost', selfcost],
  ['cardwhat', cardwhat],
  ['cardhome', cardhome],
  ['cardback', cardback],
  ['cardcompact', cardcompact],
  ['cardcomputer', cardcomputer],
  ['cardship', cardship],
  ['cardcontext', cardcontext],
  ['engines', engines],
  ['access', access],
  ['truth', truth],
  ['fmt', fmtRows],
  ['words', words],
  ['common', common],
]

// Every row by its name: the lookup `t(name)` is one read of this map
export const TABLE: Rows = Object.create(null) as Rows
for (const [, rows] of AREAS) Object.assign(TABLE, rows)

// The plain forms of English, for the indexes: a plural row is found by either of its English forms
const enForms = (x: Text): Array<readonly [string, string]> => (typeof x === 'string' ? [['', x]] : [['one', x.one], ['other', x.other]])

// One form of a translation: "=" is the English on purpose
export const formIn = (x: Said | undefined, form: string, en: string): string | undefined => {
  const s = x === undefined ? undefined : typeof x === 'string' ? x : form === 'one' ? (x.one ?? x.other) : x.other
  return s === '=' ? en : s
}

// No prototype: an English line such as "constructor" or "toString" is never found in it
const buildIndex = (lang: Lang, rows: Iterable<Row>): Record<string, string> => {
  const out = Object.create(null) as Record<string, string>
  for (const row of rows) {
    if (lang === PAD_LANG) {
      for (const [, en] of enForms(row.en)) out[en] = padded(en)
      continue
    }
    const own = row[lang]
    if (own === undefined) continue
    for (const [form, en] of enForms(row.en)) {
      const to = formIn(own, form, en)
      if (to !== undefined && to !== '') out[en] = to
    }
  }
  return out
}

// The lookup by English text, per language (the compatibility path of `tr`, while texts move to names)
const INDEX: Record<string, Record<string, string>> = Object.create(null) as Record<string, Record<string, string>>
const ALL_ROWS: Row[] = AREAS.flatMap(([, rows]) => Object.values(rows))
export function byEnglish(lang: Lang, area?: string): Record<string, string> {
  if (area !== undefined) return buildIndex(lang, Object.values(AREAS.find(([a]) => a === area)?.[1] ?? {}))
  return (INDEX[lang] ??= buildIndex(lang, ALL_ROWS))
}
for (const lang of LANGS) if (lang !== 'en') byEnglish(lang)

// The English lines of one area (both forms of a plural row), in table order
export const englishOf = (area: string): string[] => Object.values(AREAS.find(([a]) => a === area)?.[1] ?? {}).flatMap(row => enForms(row.en).map(([, en]) => en))

// How much of a language is done
export function coverage(lang: Lang, rows: Rows = TABLE): { done: number; total: number; missing: string[] } {
  const forms = pluralOf(lang).forms
  const missing: string[] = []
  let total = 0
  for (const [name, row] of Object.entries(rows)) {
    total += 1
    const own = row[lang]
    // A plural row takes its forms, or "=" for all of them
    const ok = own !== undefined && (typeof own === 'string' ? own !== '' && (typeof row.en === 'string' || own === '=') : typeof row.en !== 'string' && forms.every(f => (own[f] ?? '') !== ''))
    if (!ok && lang !== 'en') missing.push(name)
  }
  return { done: total - missing.length, total, missing }
}
