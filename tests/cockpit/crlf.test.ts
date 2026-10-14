// Text with CRLF line endings parses like text with LF, and the system language falls back cleanly.
import { expect } from 'claude-code/testing'
import { test } from './slow'

import { parseIndex, parseNote } from '../hooks/core/memory'
import { findBlocks, splitCommands } from '../hooks/core/phonedo'
import { parseRules } from '../hooks/core/rules'
import { systemLanguage } from '../hooks/core/settings'

test('a note file with CRLF endings shows its header like one with LF', () => {
  const lf = '---\nname: x\ndescription: Short hook\ntype: user\n---\nThe body.\nSecond line.\n'
  const crlf = lf.replace(/\n/g, '\r\n')
  expect(parseNote(lf)).toEqual({ description: 'Short hook', type: 'user', body: 'The body.\nSecond line.' })
  const w = parseNote(crlf)
  expect(w.description).toBe('Short hook')
  expect(w.type).toBe('user')
  expect(w.body).toBe('The body.\r\nSecond line.')
})

test('the memory index with CRLF endings gives the same notes', () => {
  const lf = '- [A](a.md) — one\n- [B](b.md) — two\n'
  expect(parseIndex(lf.replace(/\n/g, '\r\n'))).toEqual(parseIndex(lf))
  expect(parseIndex(lf).length).toBe(2)
})

test('phone blocks with CRLF endings keep a Windows path at the end of a line', () => {
  const answer = 'Run this:\r\n```bash\r\nls -la\r\ncd C:\\work\\app\r\n```\r\n'
  const blocks = findBlocks(answer)
  expect(blocks.length).toBe(1)
  expect(blocks[0].commands).toEqual(['ls -la', 'cd C:\\work\\app'])
  expect(splitCommands('ls\r\npwd\r\n')).toEqual(['ls', 'pwd'])
})

test('rules with CRLF endings carry no trailing carriage return', () => {
  const r = parseRules('Never use `pkill` here.\r\nOther line.\r\n', 'CLAUDE.md')
  expect(r.length).toBe(1)
  expect(r[0].text).toBe('Never use `pkill` here.')
})

test('the system language: the Mac reads LANG exactly as before, Windows falls back then English', () => {
  expect(systemLanguage({ LANG: 'sv_SE.UTF-8' }, 'posix')).toBe('sv_SE.UTF-8')
  expect(systemLanguage({}, 'posix')).toBe('en')
  // The Mac never looks at the other two variables.
  expect(systemLanguage({ LC_ALL: 'sv_SE' }, 'posix')).toBe('en')
  expect(systemLanguage({}, 'win32')).toBe('en')
  expect(systemLanguage({ LANG: '', LC_ALL: 'sv_SE.UTF-8' }, 'win32')).toBe('sv_SE.UTF-8')
  expect(systemLanguage({ LANGUAGE: 'sv' }, 'win32')).toBe('sv')
  expect(systemLanguage({ LANG: 'en_US' }, 'win32')).toBe('en_US')
})
