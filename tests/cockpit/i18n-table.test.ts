// The one text table: every row is named area.slug, unique, with every full language and the same fill-ins in every language.
import { expect } from 'claude-code/testing'
import { test } from './slow'
import { setLang, tr, trFill } from '../hooks/core/lang'
import { langOf } from '../hooks/features/home/state'
import { setWordSystem } from '../hooks/core/syswords'
import { AREAS, byEnglish, coverage, TABLE } from '../hooks/i18n/table'
import { t, tEn, tIn, textOf } from '../hooks/i18n/t'
import { LANGS, isLang, langInfo, pluralOf } from '../hooks/i18n/langs'
import type { Rows, Said, Text } from '../hooks/i18n/types'

const OTHERS = LANGS.filter(l => l !== 'en')
const plain = (x: Text | Said | undefined): string => (x === undefined ? '' : typeof x === 'string' ? x : (x.other ?? ''))

test('tr gives every language its own line for an English line of the table, and English stays English', () => {
  setWordSystem('posix')
  try {
    for (const lang of OTHERS) {
      const own = byEnglish(lang)
      setLang(lang)
      const wrong = Object.entries(own).filter(([en, said]) => tr(en) !== said && tr(en) !== en)
      expect(wrong, lang).toEqual([])
      expect(Object.keys(own).length, lang).toBeGreaterThan(0)
    }
    setLang('en')
    expect(tr('Settings')).toBe('Settings')
  } finally {
    setLang('en')
  }
})

test('the rows are named area.slug, unique, with every full language and the same fill-ins in every language', () => {
  const seen = new Set<string>()
  const bad: string[] = []
  for (const [area, rows] of AREAS) {
    for (const [name, row] of Object.entries(rows)) {
      if (!new RegExp(`^${area}\\.[a-z0-9_]+$`).test(name)) bad.push(`name: ${name}`)
      if (seen.has(name)) bad.push(`twice: ${name}`)
      seen.add(name)
      const slots = (s: string): string => (s.match(/\{[a-z]+\}/gi) ?? []).sort().join(' ')
      for (const lang of LANGS) {
        const own = plain(row[lang])
        if (own === '') {
          if (langInfo(lang).status === 'full') bad.push(`no ${lang}: ${name}`)
          continue
        }
        if (own !== '=' && slots(own) !== slots(plain(row.en))) bad.push(`fill-ins ${lang}: ${name}`)
        const r = row[lang]
        if (typeof row.en !== 'string' && typeof r !== 'string' && r !== undefined && pluralOf(lang).forms.some(f => (r[f] ?? '') === '')) bad.push(`plural forms ${lang}: ${name}`)
      }
    }
  }
  expect(bad).toEqual([])
  expect(Object.keys(TABLE).length).toBe(seen.size)
})

test('t gives a row by name in the language of the draw, and the text twin stays English', () => {
  setWordSystem('posix')
  const [name, row] = Object.entries(TABLE).find(([, r]) => typeof r.en === 'string' && !r.en.includes('{')) ?? ['', { en: '' }]
  for (const lang of OTHERS) {
    setLang(lang)
    expect(t(name)).toBe(tr(plain(row.en)))
    expect(tEn(name)).toBe(plain(row.en))
  }
  setLang('en')
  expect(t(name)).toBe(plain(row.en))
  expect(t('no.such_name')).toBe('no.such_name')
  setLang('xx')
  expect(t(name)).toBe(plain(row.en))
  setLang('en')
})

test('fill-ins by name and plural forms', () => {
  const row = { en: { one: '{n} file changed in {where}', other: '{n} files changed in {where}' }, sv: { one: '{n} fil ändrad i {where}', other: '{n} filer ändrade i {where}' } }
  expect(textOf(row, 'en', { n: 1, where: 'app' })).toBe('1 file changed in app')
  expect(textOf(row, 'en', { n: 3, where: 'app' })).toBe('3 files changed in app')
  expect(textOf(row, 'sv', { n: 1, where: 'app' })).toBe('1 fil ändrad i app')
  expect(textOf(row, 'sv', { n: 0, where: 'app' })).toBe('0 filer ändrade i app')
  expect(textOf({ en: 'Show {n} more' }, 'en', {})).toBe('Show {n} more')
  expect(textOf({ en: 'Only English' }, 'sv')).toBe('Only English')
})

test('on Windows a named row says the words of the system, as tr does', () => {
  const name = Object.entries(TABLE).find(([, r]) => r.en === 'Keep Mac awake')?.[0] ?? ''
  expect(name).not.toBe('')
  setWordSystem('win32')
  expect(tIn('en', name)).toBe('Keep PC awake')
  for (const lang of OTHERS) {
    const own = byEnglish(lang)
    expect(tIn(lang, name), lang).toBe(own['Keep PC awake'])
    setLang(lang)
    expect(t(name), lang).toBe(tr('Keep Mac awake'))
    setLang('en')
    setWordSystem('posix')
    expect(tIn(lang, name), lang).toBe(own['Keep Mac awake'])
    setWordSystem('win32')
  }
  setWordSystem('posix')
})

test('a partial language falls back to English per row, and its coverage lists what is missing', () => {
  setWordSystem('posix')
  const rows: Rows = {
    'demo.save': { en: 'Save', xx: 'Sävx' },
    'demo.same': { en: 'Plan', xx: '=' },
    'demo.files': { en: { one: '{n} file', other: '{n} files' }, xx: { one: '{n} filx', other: '{n} filxs' } },
    'demo.todo': { en: 'Not yet' },
    'demo.half': { en: { one: '{n} step', other: '{n} steps' }, xx: { other: '{n} stepx' } },
  }
  expect(textOf(rows['demo.save'], 'xx')).toBe('Sävx')
  expect(textOf(rows['demo.same'], 'xx')).toBe('Plan')
  expect(textOf(rows['demo.todo'], 'xx')).toBe('Not yet')
  expect(textOf(rows['demo.files'], 'xx', { n: 1 })).toBe('1 filx')
  expect(textOf(rows['demo.files'], 'xx', { n: 4 })).toBe('4 filxs')
  expect(textOf(rows['demo.half'], 'xx', { n: 1 })).toBe('1 stepx')
  setLang('xx')
  expect(tr('Settings')).toBe('Settings')
  setLang('en')
  const c = coverage('xx', rows)
  expect(c).toEqual({ done: 3, total: 5, missing: ['demo.todo', 'demo.half'] })
  const [name, row] = Object.entries(TABLE).find(([, r]) => typeof r.en === 'string' && !r.en.includes('{')) ?? ['', { en: '' }]
  expect(tIn('xx', name)).toBe(plain(row.en))
  for (const lang of LANGS) if (langInfo(lang).status === 'full') expect(coverage(lang).missing, lang).toEqual([])
})

test('a time gone in minutes reads as Swedish', () => {
  setWordSystem('posix')
  setLang('sv')
  try {
    expect(tr('5 min ago')).toBe('5 min ago')
    expect(trFill('5 min ago')).toBe('för 5 min sedan')
    expect(tIn('sv', 'fmt.n_min_ago', { n: 5 })).toBe('för 5 min sedan')
  } finally {
    setLang('en')
  }
})

// The language pick: the chosen code, else the system code with its region, else its language part, else English.
test('the language follows the system, region first, and only codes of the registry count', () => {
  const has = (c: string): boolean => ['en', 'pt', 'pt-BR', 'sv'].includes(c)
  expect(langOf('auto', 'pt_BR.UTF-8', has)).toBe('pt-BR')
  expect(langOf('auto', 'pt-BR', has)).toBe('pt-BR')
  expect(langOf('auto', 'pt_PT.UTF-8', has)).toBe('pt')
  expect(langOf('auto', 'sv-FI', has)).toBe('sv')
  expect(langOf('pt-BR', 'en_US.UTF-8', has)).toBe('pt-BR')
  expect(langOf('auto', 'de_DE.UTF-8', has)).toBe('en')
  expect(langOf('auto', 'sv_SE.UTF-8')).toBe('sv')
  for (const bad of ['constructor', 'toString', '__proto__', 'hasOwnProperty']) {
    expect(isLang(bad), bad).toBe(false)
    expect(langOf(bad, 'en_US.UTF-8'), bad).toBe('en')
    expect(langInfo(bad).decimal, bad).toBe('.')
  }
  setLang('constructor')
  expect(tr('Settings')).toBe('Settings')
  setLang('en')
})
