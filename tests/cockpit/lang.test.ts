import { expect } from 'claude-code/testing'
import { test } from './slow'

import { VIEW_STRINGS, langNow, setLang, tr, trMore } from '../hooks/core/lang'
import { FEATURE_HELP } from '../hooks/core/registry'
import { SETTINGS, startWindowsLanguage, systemLanguage, windowsLanguageRead, windowsUiLanguage } from '../hooks/core/settings'
import { HELP } from '../hooks/features/home'
import { AREAS, byEnglish } from '../hooks/i18n/table'
import { LANGS, langInfo } from '../hooks/i18n/langs'

// The full languages other than English: each must give every line a person reads.
const FULL = LANGS.filter(l => l !== 'en' && langInfo(l).status === 'full')

const SAME_IN: Record<string, string[]> = { sv: ['Claude Code', 'Auto', 'Cache', 'Normal', 'Plan', 'Budget', 'Autopilot', 'English', 'Svenska', 'Haiku', 'Sonnet', 'Opus', 'Fable', 'Smart', 'iPad', 'Port {n}', 'Block {n} ({a}):', 'Session', 'Session: {session}', '1 agent', 'Extra', 'Lint', 'Pull requests', 'Plan: {name} {pct}%', '{name}: {state}', 'OK'] }
const hasLetter = (s: string): boolean => /\p{L}/u.test(s)

const RETIRED: string[] = []

function wanted(): string[] {
  const all: string[] = []
  for (const s of SETTINGS.filter(x => x.hidden !== true)) {
    all.push(s.group, s.label)
    if (s.note !== '') all.push(s.note)
    for (const o of s.options) all.push(o.label)
  }
  for (const s of SETTINGS.filter(x => x.key === 'look.language')) {
    all.push(s.label, s.note)
    for (const o of s.options) all.push(o.label)
  }
  for (const h of [...HELP, ...FEATURE_HELP]) all.push(h.title, h.text)
  all.push(...VIEW_STRINGS)
  all.push('Focus', 'Money', 'Everything', 'Quiet')
  return [...new Set(all)]
}

function inLang<T>(lang: string, run: () => T): T {
  setLang(lang)
  try {
    return run()
  } finally {
    setLang('en')
  }
}

test('every string a person reads has a line in every full language', () => {
  for (const lang of FULL) {
    const own = byEnglish(lang)
    expect(wanted().filter(en => (own[en] ?? '') === ''), lang).toEqual([])
  }
})

test('a translated line differs from the English one, unless the word is the same in that language', () => {
  for (const lang of FULL) {
    const same = SAME_IN[lang]
    if (same === undefined) continue
    const own = byEnglish(lang)
    expect(wanted().filter(en => own[en] === en && hasLetter(en) && !same.includes(en)), lang).toEqual([])
  }
})

test('tr gives Swedish after setLang sv and English after setLang en', () => {
  try {
    expect(langNow()).toBe('en')
    expect(tr('Settings')).toBe('Settings')
    setLang('sv')
    expect(langNow()).toBe('sv')
    expect(tr('Settings')).toBe('Inställningar')
    expect(tr('A line with no Swedish entry')).toBe('A line with no Swedish entry')
    setLang('en')
    expect(tr('Settings')).toBe('Settings')
    setLang('klingon')
    expect(langNow()).toBe('en')
  } finally {
    setLang('en')
  }
})

test('tr finds the translation of every wanted string in every full language', () => {
  for (const lang of FULL) {
    const own = byEnglish(lang)
    expect(inLang(lang, () => wanted().filter(en => tr(en) !== own[en])), lang).toEqual([])
    expect(langNow()).toBe('en')
  }
})

test('a backticked part and a /vaken- command stay exactly as they are', () => {
  const lost: string[] = []
  for (const lang of FULL) {
    const own = byEnglish(lang)
    for (const en of wanted()) {
      const said = own[en] ?? ''
      const keep = [...(en.match(/`[^`]+`/g) ?? []), ...(en.match(/\/vaken-[a-z0-9-]+/g) ?? [])]
      for (const part of keep) if (!said.includes(part)) lost.push(`${lang}: ${part} in: ${en}`)
    }
  }
  expect(lost).toEqual([])
})

test('a translated line is not much longer than the English one, so the menus fit', () => {
  for (const lang of FULL) {
    const own = byEnglish(lang)
    expect(wanted().filter(en => (own[en] ?? '').length > en.length * 2.2 + 20), lang).toEqual([])
  }
})

test('the dictionary holds nothing that no view asks for', () => {
  const asked = new Set(wanted())
  const allKeys = (area: string): boolean => (area.startsWith('card') && area !== 'cards' && area !== 'cardsettings') || area === 'engines' || area === 'fmt' || area === 'words'
  const read = (area: string, key: string): boolean => allKeys(area) || key.startsWith('settings.preset_')
  const byBuilder = new Set(AREAS.flatMap(([area, rows]) => Object.entries(rows).filter(([key]) => read(area, key)).flatMap(([, r]) => (typeof r.en === 'string' ? [r.en] : [r.en.one, r.en.other]))))
  const spare = Object.keys(byEnglish(FULL[0])).filter(en => !asked.has(en) && !byBuilder.has(en) && !RETIRED.includes(en) && en !== 'Phone')
  expect(spare).toEqual([])
})

test('the end-of-list row keeps its count and translates the rest', () => {
  expect(trMore('Show 7 more')).toBe('Show 7 more')
  expect(inLang('sv', () => [trMore('Show 3 more'), trMore('Show fewer'), trMore('Something else')])).toEqual(['Visa 3 till', 'Visa färre', 'Something else'])
})

test('the Windows UI language: the pure parser', () => {
  expect(windowsUiLanguage('sv-SE\r\n')).toBe('sv')
  expect(windowsUiLanguage('sv-FI')).toBe('sv')
  expect(windowsUiLanguage('en-US\n')).toBe('en')
  expect(windowsUiLanguage('en-GB')).toBe('en')
  expect(windowsUiLanguage('')).toBeUndefined()
  expect(windowsUiLanguage('\r\n')).toBeUndefined()
  expect(windowsUiLanguage('The term Get-UICulture is not recognized')).toBeUndefined()
  expect(windowsUiLanguage('???')).toBeUndefined()
})

test('the Windows language read: one PowerShell call, falls back on any failure, skipped when a variable is set', async () => {
  const calls: string[][] = []
  const ok = async (argv: readonly string[]): Promise<{ exitCode: number; stdout: string; stderr: string }> => {
    calls.push([...argv])
    return { exitCode: 0, stdout: 'sv-SE\r\n', stderr: '' }
  }
  expect(await windowsLanguageRead(ok as never, {}, 'en')).toBe('sv')
  expect(calls.length).toBe(1)
  expect(calls[0]).toEqual(['powershell', '-NoProfile', '-NonInteractive', '-Command', '(Get-UICulture).Name'])
  expect(await windowsLanguageRead(ok as never, { LC_ALL: 'en_US' }, 'en_US')).toBe('en_US')
  expect(calls.length).toBe(1)
  const rejects = async (): Promise<never> => {
    throw new Error('no powershell')
  }
  expect(await windowsLanguageRead(rejects as never, {}, 'en')).toBe('en')
  const bad = async (): Promise<{ exitCode: number; stdout: string; stderr: string }> => ({ exitCode: 1, stdout: 'sv-SE', stderr: '' })
  expect(await windowsLanguageRead(bad as never, {}, 'en')).toBe('en')
})

test('the Windows read does not hold up the start, and the language switches when it answers', async () => {
  const never = (): Promise<never> => new Promise(() => {})
  const seen: string[] = []
  startWindowsLanguage(never as never, {}, 'en', f => seen.push(f))
  expect(seen).toEqual([])
  let release: (v: { exitCode: number; stdout: string; stderr: string }) => void = () => {}
  const slow = (): Promise<{ exitCode: number; stdout: string; stderr: string }> => new Promise(r => (release = r))
  startWindowsLanguage(slow as never, {}, 'en', f => seen.push(f))
  expect(seen).toEqual([])
  release({ exitCode: 0, stdout: 'sv-SE\r\n', stderr: '' })
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
  expect(seen).toEqual(['sv'])
  startWindowsLanguage((async () => ({ exitCode: 0, stdout: 'en-US', stderr: '' })) as never, {}, 'en', f => seen.push(f))
  startWindowsLanguage((async () => { throw new Error('x') }) as never, {}, 'en', f => seen.push(f))
  for (let n = 0; n < 10; n++) await Promise.resolve()
  expect(seen).toEqual(['sv'])
})

test('the Mac language is read as before', () => {
  expect(systemLanguage({ LANG: 'sv_SE.UTF-8' }, 'posix')).toBe('sv_SE.UTF-8')
  expect(systemLanguage({}, 'posix')).toBe('en')
})
