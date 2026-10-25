// Test-tamper alert: spots an edit that skips tests or removes assertions. A flag for a person to read, never a silent block.

import { tEn } from '../i18n/t'
export function looksLikeTest(path: string): boolean {
  const p = path.replace(/\\/g, '/')
  return (
    /\.(test|spec)\.[A-Za-z0-9]+$/.test(p) ||
    /(^|\/)__tests__\//.test(p) ||
    /(^|\/)test_[^/]+\.py$/.test(p) ||
    /_test\.(py|go|rb|rs|exs?)$/.test(p) ||
    /_spec\.rb$/.test(p) ||
    /(^|\/)(tests?|spec|specs)\//.test(p) ||
    /(Test|Tests|Spec)\.(java|kt|scala|cs|swift)$/.test(p)
  )
}

const SKIPS: { label: string; re: RegExp }[] = [
  { label: '.skip', re: /\b(?:it|test|describe|context|suite|specify)\.skip\b/g },
  { label: '.only', re: /\b(?:it|test|describe|context|suite|specify)\.only\b/g },
  { label: 'it.todo', re: /\b(?:it|test|describe)\.(?:todo|fixme)\b/g },
  { label: 'xit or xdescribe', re: /(?<![.$\w])(?:xit|xdescribe|xtest|fit|fdescribe)\s*\(/g },
  { label: '@pytest.mark.skip', re: /@pytest\.mark\.(?:skip|skipif|xfail)\b/g },
  { label: 'pytest.skip', re: /\bpytest\.skip\s*\(/g },
  { label: 'unittest skip', re: /@unittest\.skip\w*|@skip\b/g },
  { label: 't.Skip', re: /\bt\.Skip(?:f|Now)?\s*\(/g },
  { label: '@Ignore', re: /@(?:Ignore|Disabled)\b/g },
  { label: '#[ignore]', re: /#\[ignore\b/g },
]

const ASSERTS = /\bexpect\s*\(|\bassert[A-Za-z_]*\s*[(!.:\s]|\bassert!|\bshould\./g
const TRIVIAL = /expect\(\s*true\s*\)\s*\.toBe\(\s*true\s*\)|\bassert\s+True\b|\bassert\s+1\s*==\s*1\b|assert\.ok\(\s*true\s*\)/g

const count = (re: RegExp, text: string) => (text.match(re) ?? []).length

type Tamper = { skipped: { label: string; added: number }[]; assertionsRemoved: number; trivialAdded: number }

export function checkTamper(path: string, oldText: string, newText: string): Tamper | undefined {
  if (!looksLikeTest(path)) return undefined
  const skipped: { label: string; added: number }[] = []
  for (const s of SKIPS) {
    const added = count(s.re, newText) - count(s.re, oldText)
    if (added > 0) skipped.push({ label: s.label, added })
  }
  const removed = oldText === '' ? 0 : count(ASSERTS, oldText) - count(ASSERTS, newText)
  const trivial = count(TRIVIAL, newText) - count(TRIVIAL, oldText)
  if (skipped.length === 0 && removed <= 0 && trivial <= 0) return undefined
  return { skipped, assertionsRemoved: Math.max(0, removed), trivialAdded: Math.max(0, trivial) }
}

export function describeTamper(path: string, t: Tamper): string {
  const parts: string[] = []
  for (const s of t.skipped) parts.push(`${tEn('words.test', { n: s.added })} switched off or narrowed (${s.label})`)
  if (t.assertionsRemoved > 0) parts.push(`${tEn('words.check', { n: t.assertionsRemoved })} removed`)
  if (t.trivialAdded > 0) parts.push(`${t.trivialAdded} check that can never fail added`)
  return `This edit to ${path} has ${parts.join(' and ')}. A test that is skipped or weakened can hide a real failure.`
}
