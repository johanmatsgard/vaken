import { expect } from 'claude-code/testing'
import { test } from './slow'

import { FILE_BIG_TOKENS, TOTAL_HEAVY_TOKENS, analyze, dietText } from '../hooks/core/diet'

const big = (tokens: number): string => `${'word '.repeat(Math.ceil((tokens * 4) / 5))}`

test('a file is big from 4k tokens and the set is heavy from 8k', () => {
  const r = analyze([{ path: '/a/CLAUDE.md', text: big(FILE_BIG_TOKENS) }, { path: '/b/CLAUDE.md', text: big(TOTAL_HEAVY_TOKENS - FILE_BIG_TOKENS + 100) }])
  expect(r.files[0].big).toBe(true)
  expect(r.heavy).toBe(true)
  expect(analyze([{ path: '/a', text: 'short' }]).heavy).toBe(false)
})

test('a rule that sits in two files is found; headings, short lines and tables are not counted', () => {
  const rule = 'Always run the full test suite before you say a change is done.'
  const r = analyze([
    { path: '/a/CLAUDE.md', text: `# Rules\n${rule}\n| a | b |\nok` },
    { path: '/b/CLAUDE.md', text: `# Rules\n${rule.toUpperCase()}\nok` },
  ])
  expect(r.repeats).toHaveLength(1)
  expect(r.repeats[0].paths).toEqual(['/a/CLAUDE.md', '/b/CLAUDE.md'])
})

test('the words: one line per file, then plain advice or "light"', () => {
  expect(dietText(analyze([]), '/h')).toMatch(/No CLAUDE.md/)
  const light = dietText(analyze([{ path: '/h/.claude/CLAUDE.md', text: 'Be brief.' }]), '/h')
  expect(light).toMatch(/~\/\.claude\/CLAUDE\.md: about 2 tokens/)
  expect(light).toMatch(/They look light/)
  const heavy = dietText(analyze([{ path: '/x/CLAUDE.md', text: big(9000) }]), '/h')
  expect(heavy).toMatch(/Together they are heavy/)
  expect(heavy).toMatch(/is big\. Move rarely needed parts/)
})
