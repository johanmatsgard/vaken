// The words per system: on the Mac every line reads as plain Mac text; on Windows it says "PC" and "Chrome or Edge".
import { expect } from 'claude-code/testing'
import { test } from './slow'

import { WIN_ENGLISH, WIN_SHOWN, setWordSystem, sysWord, wordSystemNow } from '../hooks/core/syswords'
import { procPlatformOf } from '../hooks/core/procs'
import { setLang, tr } from '../hooks/core/lang'
import { shownTitle } from '../hooks/core/ledger'
import { EXPLAIN, explainFor, titleFor } from '../hooks/core/explain'
import { whatIsLines } from '../hooks/core/whatis'
import { findSetting, settingsText } from '../hooks/core/settings'
import { AWAKE_CAP_WHAT, AWAKE_WHAT, CREW3_HELP, CREW3_SETTINGS } from '../hooks/core/crew3'
import { ASK_LINE, AWAKE_CAP_DETAIL } from '../hooks/core/awakeplan'
import { NEED_CHROME } from '../hooks/core/eyes'
import { PREVIEW_MEANS } from '../hooks/core/previewcard'
import { briefShown } from '../hooks/core/autosafe'
import { homeRel, homeShown } from '../hooks/core/platform'
import { dietText } from '../hooks/core/diet'
import { byEnglish, englishOf } from '../hooks/i18n/table'
import { LANGS, langInfo } from '../hooks/i18n/langs'
import { TEMPLATE, parseTaskFile, templateFor } from '../hooks/core/orchestra'
import { TASKS_HINT } from '../hooks/features/orchestra'
const SV = byEnglish('sv')

const MAC = procPlatformOf(undefined)
const WIN = procPlatformOf('Windows_NT')

const awakeLabel = (): string => findSetting('awake.mode')?.label ?? ''
const awakeNote = (): string => findSetting('awake.mode')?.note ?? ''
const awayNote = (): string => findSetting('awake.away')?.note ?? ''
const CREW3_NOTES = ['awake.mode', 'awake.away'].map(k => CREW3_SETTINGS.find(x => x.key === k)?.note ?? '')
const autoLang = (): string => findSetting('look.language')?.options.find(o => o.value === 'auto')?.label ?? ''

const SAMPLE = (): string[] => [
  awakeLabel(),
  awakeNote(),
  awayNote(),
  CREW3_NOTES[0],
  CREW3_NOTES[1],
  autoLang(),
  AWAKE_WHAT,
  AWAKE_CAP_WHAT,
  AWAKE_CAP_DETAIL,
  ASK_LINE,
  'Mac awake',
  NEED_CHROME,
  PREVIEW_MEANS,
  EXPLAIN[AWAKE_WHAT].means,
  EXPLAIN[AWAKE_WHAT].why,
  EXPLAIN[AWAKE_WHAT].next,
  EXPLAIN[AWAKE_CAP_WHAT].means,
  EXPLAIN[AWAKE_CAP_WHAT].why,
]

test('the system comes from the OS variable: the Mac reads posix, Windows win32', () => {
  expect(MAC).toBe('posix')
  expect(WIN).toBe('win32')
})

test('every key is a real line of vaken (the sample covers the exported ones)', () => {
  const keys = [...Object.keys(WIN_SHOWN), ...Object.keys(WIN_ENGLISH)]
  for (const line of SAMPLE()) expect(keys.includes(line)).toBe(true)
  expect(awakeLabel()).toBe('Keep Mac awake')
  expect(autoLang()).toBe('Like the Mac')
})

test('on the Mac every line reads exactly as before', () => {
  setWordSystem(MAC)
  setLang('en')
  for (const line of SAMPLE()) {
    expect(sysWord(line)).toBe(line)
    expect(sysWord(line, MAC)).toBe(line)
    expect(tr(line)).toBe(line)
  }
  expect(shownTitle(AWAKE_WHAT)).toBe('Kept the Mac awake')
  expect(explainFor(AWAKE_WHAT)).toBe(EXPLAIN[AWAKE_WHAT])
  expect(whatIsLines({ means: PREVIEW_MEANS })[0]).toBe(`What it means: ${PREVIEW_MEANS}`)
  expect(settingsText({ 'look.language': 'auto', 'awake.mode': 'on' }, true, [], true)).toContain('look.language: Like the Mac')
  setLang('sv')
  expect(tr('Keep Mac awake')).toBe('Håll Macen vaken')
  expect(tr(ASK_LINE)).toBe(SV[ASK_LINE])
  setLang('en')
})

test('on Windows the lines say PC and Chrome or Edge, never Mac', () => {
  setWordSystem(WIN)
  setLang('en')
  try {
    expect(wordSystemNow()).toBe('win32')
    for (const line of SAMPLE()) {
      const w = sysWord(line)
      expect(w === line).toBe(false)
      expect(/\bMac\b|macOS|Google Chrome/.test(w)).toBe(false)
    }
    expect(tr('Keep Mac awake')).toBe('Keep PC awake')
    expect(tr(awakeNote())).toBe('While agents work, it keeps the PC awake.')
    expect(tr('Like the Mac')).toBe('Like the PC')
    expect(sysWord(CREW3_NOTES[0])).toBe('Keep the PC awake while agents work.')
    expect(sysWord(CREW3_NOTES[1])).toBe('Keep the PC awake for a phone or a waiting question.')
    expect(sysWord(CREW3_HELP[1].text)).not.toContain('Mac')
    expect(sysWord(EXPLAIN[AWAKE_CAP_WHAT].next)).not.toContain('Mac')
    expect(shownTitle(AWAKE_WHAT)).toBe('Kept the PC awake')
    expect(shownTitle(AWAKE_CAP_WHAT)).toBe('Stopped keeping the PC awake: limit reached')
    expect(explainFor(AWAKE_WHAT)?.next).toBe('/vaken-help run awake shows the state. Settings > Agents > Keep PC awake turns it off.')
    expect(titleFor('Kept the PC awake 3 times')).toBe(AWAKE_WHAT)
    expect(sysWord(NEED_CHROME)).toContain('Chrome or Edge')
    expect(whatIsLines({ means: PREVIEW_MEANS })[0]).toContain('taken by Chrome (or Edge) on this PC')
    expect(settingsText({ 'look.language': 'auto' }, true, [], true)).toContain('look.language: Like the PC')
      setLang('sv')
    expect(tr('Keep Mac awake')).toBe('Håll datorn vaken')
    expect(tr(ASK_LINE)).toBe('Hålla datorn vaken medan du är borta? Svara /vaken-help run awake on')
    expect(tr(CREW3_NOTES[0])).toBe('Håll datorn vaken medan agenter arbetar.')
    expect(tr(CREW3_NOTES[1])).toBe('Håll datorn vaken för en telefon eller en fråga som väntar.')
    expect(sysWord(AWAKE_CAP_DETAIL, MAC)).toBe(AWAKE_CAP_DETAIL)
  } finally {
    setLang('en')
    setWordSystem(MAC)
  }
})

test('every Windows line the pane or the phone shows has a twin that differs in every full language', () => {
  for (const lang of LANGS.filter(l => l !== 'en' && langInfo(l).status === 'full')) {
    const own = byEnglish(lang)
    expect(Object.values(WIN_SHOWN).filter(en => (own[en] ?? '') === '' || own[en] === en), lang).toEqual([])
  }
  for (const en of englishOf('sys')) expect(Object.values(WIN_SHOWN).includes(en)).toBe(true)
})

test('the task file and the /vaken-tasks hint say this PC on Windows, the Mac text as before', () => {
  expect(templateFor(MAC)).toBe(TEMPLATE)
  expect(templateFor(WIN)).not.toBe(TEMPLATE)
  expect(templateFor(WIN)).toContain('as many at a time as this PC has room for by default')
  expect(/\bMac\b/.test(templateFor(WIN))).toBe(false)
  expect(templateFor(WIN).split('\n').length).toBe(TEMPLATE.split('\n').length)
  expect(parseTaskFile(templateFor(WIN))).toEqual([])
  expect(sysWord(TASKS_HINT, MAC)).toBe(TASKS_HINT)
  expect(sysWord(TASKS_HINT, WIN)).toContain('as many at a time as this PC has room for')
  expect(/\bMac\b/.test(sysWord(TASKS_HINT, WIN))).toBe(false)
})

test('no Windows line names the Mac', () => {
  const bad = [...Object.values(WIN_SHOWN), ...Object.values(WIN_ENGLISH), ...Object.values(byEnglish('sv', 'sys'))].filter(s => /\bMac(en)?\b|macOS|Google Chrome/.test(s))
  expect(bad).toEqual([])
})

test('the ~ forms: the Mac exactly as before, Windows in its own shape', () => {
  const old = (p: string, home: string): string => (home !== '' && p.startsWith(home) ? `~${p.slice(home.length)}` : p)
  for (const [p, h] of [['/Users/me/.claude/CLAUDE.md', '/Users/me'], ['/work/app/CLAUDE.md', '/Users/me'], ['/Users/me', '/Users/me'], ['/work/x', '']]) expect(homeShown(p, h)).toBe(old(p, h))
  expect(homeShown('C:\\Users\\me/.claude/CLAUDE.md', 'C:\\Users\\me')).toBe('~\\.claude\\CLAUDE.md')
  expect(homeShown('c:\\users\\ME\\.claude\\CLAUDE.md', 'C:\\Users\\me')).toBe('~\\.claude\\CLAUDE.md')
  expect(homeShown('D:\\work\\app\\CLAUDE.md', 'C:\\Users\\me')).toBe('D:\\work\\app\\CLAUDE.md')
  expect(homeShown('C:\\Users\\me', 'C:\\Users\\me')).toBe('~')
  expect(briefShown('ab12cd34')).toBe('~/.claude/cockpit/briefs/brief-ab12cd34.md')
  expect(briefShown('ab12cd34', '/Users/me')).toBe('~/.claude/cockpit/briefs/brief-ab12cd34.md')
  expect(briefShown('ab12cd34', 'C:\\Users\\me')).toBe('~\\.claude\\cockpit\\briefs\\brief-ab12cd34.md')
  expect(homeRel('.claude/x', 'C:\\Users\\me')).toBe('~\\.claude\\x')
  const report = { files: [{ path: 'C:\\Users\\me/.claude/CLAUDE.md', tokens: 100, lines: 3, big: false }], totalTokens: 100, heavy: false, repeats: [], longLines: 0 } as never
  expect(dietText(report, 'C:\\Users\\me')).toContain('~\\.claude\\CLAUDE.md')
})
