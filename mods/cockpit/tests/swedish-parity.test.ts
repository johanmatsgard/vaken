// Extends tests/lang.test.ts, which checks the Settings rows, the help entries and VIEW_STRINGS.
import { expect } from 'claude-code/testing'
import { test } from './slow'

import * as back from '../hooks/core/backwords'
import * as compact from '../hooks/core/compactwords'
import * as context from '../hooks/core/contextwords'
import * as dowords from '../hooks/core/dowords'
import * as preview from '../hooks/core/previewwords'
import * as runcost from '../hooks/core/runcostwords'
import * as safety from '../hooks/core/safetywords'
import * as setup from '../hooks/core/setupwords'
import * as ship from '../hooks/core/shipwords'
import { byEnglish } from '../hooks/i18n/table'
import { LANGS, langInfo } from '../hooks/i18n/langs'
const SV = byEnglish('sv')
const FULL = LANGS.filter(l => l !== 'en' && langInfo(l).status === 'full')

const WORDS_FILES: Record<string, Record<string, unknown>> = { back, compact, context, dowords, preview, runcost, safety, setup, ship }

const NOT_WORDS = /(?:_KEY|_ID|_IDS|_MODEL|_CMD|_COMMAND|_URL|_WHAT)$/
const hasLetter = (s: string): boolean => /\p{L}/u.test(s)
const SAME_IN_SWEDISH = ['Auto', 'Cache', 'Normal', 'Plan', 'Budget', 'Autopilot', 'Smart', 'Session', '1 agent', 'iPad', 'Port {n}', 'Block {n} ({a}):']

function englishOf(): string[] {
  const out: string[] = []
  for (const [file, mod] of Object.entries(WORDS_FILES)) {
    for (const [name, value] of Object.entries(mod)) {
      if (NOT_WORDS.test(name)) continue
      if (typeof value === 'string' && hasLetter(value)) out.push(`${file}:${value}`)
      else if (Array.isArray(value) && value.every(v => typeof v === 'string')) out.push(...(value as string[]).filter(hasLetter).map(v => `${file}:${v}`))
      else if (typeof value === 'object' && value !== null && !Array.isArray(value) && Object.values(value).every(v => typeof v === 'string')) out.push(...(Object.values(value) as string[]).filter(hasLetter).map(v => `${file}:${v}`))
    }
  }
  return [...new Set(out)]
}

test('every English string in a words file has a line in every full language', () => {
  for (const lang of FULL) {
    const own = byEnglish(lang)
    const missing = englishOf().filter(x => {
      const en = x.slice(x.indexOf(':') + 1)
      return (own[en] ?? '') === '' && !(lang === 'sv' && SAME_IN_SWEDISH.includes(en))
    })
    expect(missing, lang).toEqual([])
  }
})

const AREA_OF: Record<string, string> = { back: 'back', compact: 'compact', context: 'context', dowords: 'do', preview: 'preview', runcost: 'runcost', safety: 'safety', setup: 'setup', ship: 'ship' }

test("the Swedish of a words file's area only holds Swedish that differs, or a word that is the same", () => {
  const same: string[] = []
  for (const file of Object.keys(WORDS_FILES)) {
    for (const [en, sv] of Object.entries(byEnglish('sv', AREA_OF[file]))) {
      if (sv === '') same.push(`${file}: empty Swedish for ${en}`)
      else if (sv === en && hasLetter(en) && !SAME_IN_SWEDISH.includes(en)) same.push(`${file}: ${en}`)
    }
  }
  expect(same).toEqual([])
})
