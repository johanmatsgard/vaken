// The "Commands from the last answer" card: shell blocks as rows with a verdict word. Pure words and rows.
import { DO_BLURB, DO_CANCEL, DO_FIRST_OF, DO_HEAD, DO_MEANS, DO_MORE, DO_NEXT, DO_OUT_BAD, DO_OUT_FAIL, DO_OUT_OK, DO_OUT_TIMEOUT, DO_R_BLOCKED, DO_R_REVIEW, DO_R_RUN, DO_ROW_BLOCKED, DO_ROW_REVIEW, DO_ROW_RUN, DO_SAID_OFF, DO_SHORT_MANY, DO_SHORT_ONE, DO_T_CUT, DO_T_NONE, DO_TITLE, DO_YES } from './dowords'
import { DO_CARD_ROWS, DO_TIMEOUT_MS } from './phonedo'
import type { DoBlock, DoMode, DoShown } from './phonedo'
import type { WhatIs } from './whatis'

export type DoFacts = { blocks: DoBlock[]; dropped?: number; mode: DoMode; open?: string; shown?: DoShown }
// The exact script drawn, so a press runs that one or nothing; a newer answer may reuse the number.
export type DoDo = { do: 'run'; n: number; script: string } | { do: 'ask'; n: number } | { do: 'yes'; n: number; script: string } | { do: 'close' }
export type DoGroupRow = { key: string; title: string; right?: string; what: WhatIs; press?: DoDo }
export type DoView = { title: string; blurb: string; short: string; lines: string[]; whats: WhatIs[]; shortWhat: WhatIs; groups: { head: string; rows: DoGroupRow[] }[] }

export const doOpenKey = (n: number): string => `do:b${n}`
const fill = (s: string, n: number): string => s.split('{n}').join(String(n))

export function doShort(f: DoFacts, t: (s: string) => string): string {
  if (f.mode === 'off') return t(DO_SAID_OFF)
  if (f.blocks.length === 0) return t(DO_T_NONE)
  const base = fill(t(f.blocks.length === 1 ? DO_SHORT_ONE : DO_SHORT_MANY), f.blocks.length)
  return f.dropped === undefined || f.dropped <= 0 ? base : `${base} (${t(DO_FIRST_OF).replace('{a}', String(f.blocks.length)).replace('{b}', String(f.blocks.length + f.dropped))})`
}

export const doLoud = (f: DoFacts): 'some' | 'none' => (f.mode !== 'off' && f.blocks.length > 0 ? 'some' : 'none')

const resultWhat = (s: DoShown, t: (x: string) => string): WhatIs => {
  const head = s.exit === 'timeout' ? t(DO_OUT_TIMEOUT).replace('{c}', String(DO_TIMEOUT_MS / 1000)) : s.exit === 'failed' ? t(DO_OUT_FAIL) : t(s.exit === 0 ? DO_OUT_OK : DO_OUT_BAD).replace('{c}', String(s.exit))
  return { means: head, facts: s.lines.length === 0 ? [] : [...(s.cut === true ? [t(DO_T_CUT)] : []), ...s.lines], next: t(DO_NEXT), setting: 'cards.do' }
}

export function doView(f: DoFacts, t: (s: string) => string): DoView {
  const what: WhatIs = { means: t(DO_MEANS), next: t(DO_NEXT), setting: 'cards.do' }
  const short = doShort(f, t)
  const rows: DoGroupRow[] = []
  if (f.mode !== 'off') {
    for (const b of f.blocks.slice(0, DO_CARD_ROWS)) {
      const key = `b${b.n}`
      const isOpen = f.open === doOpenKey(b.n)
      const title = `${b.n}. ${b.first}`
      const detail: WhatIs = { means: t(b.verdict === 'safe' ? DO_ROW_RUN : b.verdict === 'risky' ? DO_ROW_REVIEW : DO_ROW_BLOCKED), facts: [...b.script.split('\n').map(l => `  ${l}`), ...b.why.map(w => t(w))], next: t(DO_NEXT), setting: 'cards.do' }
      const shown = f.shown !== undefined && f.shown.n === b.n ? f.shown : undefined
      const base = { key, title, what: isOpen && shown !== undefined ? resultWhat(shown, t) : detail }
      if (b.verdict === 'blocked') {
        rows.push({ ...base, right: t(DO_R_BLOCKED) })
      } else if (b.verdict === 'safe') {
        rows.push({ ...base, right: t(DO_R_RUN), press: { do: 'run', n: b.n, script: b.script } })
      } else {
        rows.push({ ...base, right: t(DO_R_REVIEW), press: { do: 'ask', n: b.n } })
        if (isOpen && shown === undefined) {
          rows.push({ key: `${key}-yes`, title: t(DO_YES), what: { means: t(DO_ROW_REVIEW), setting: 'cards.do' }, press: { do: 'yes', n: b.n, script: b.script } })
          rows.push({ key: `${key}-no`, title: t(DO_CANCEL), what: { means: t(DO_NEXT), setting: 'cards.do' }, press: { do: 'close' } })
        }
      }
    }
    if (f.blocks.length > DO_CARD_ROWS) rows.push({ key: 'more', title: fill(t(DO_MORE), f.blocks.length - DO_CARD_ROWS), what: { means: t(DO_NEXT), setting: 'cards.do' } })
  }
  return {
    title: DO_TITLE,
    blurb: t(DO_BLURB),
    short,
    lines: [short, ...rows.map(r => (r.right === undefined ? r.title : `${r.title}: ${r.right}`))],
    whats: [what, ...rows.map(r => r.what)],
    shortWhat: what,
    groups: rows.length === 0 ? [] : [{ head: t(DO_HEAD), rows }],
  }
}

