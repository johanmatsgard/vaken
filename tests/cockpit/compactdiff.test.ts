import { expect } from 'claude-code/testing'
import { test } from './slow'

import { compare, diffWords, filesFromMessages, previewWords } from '../hooks/core/compactdiff'

const use = (tool: string, input: Record<string, unknown>) => ({ tool_use_id: 'x', tool, input })

test('the files a chat changed are listed once, in order, from edit tools only', () => {
  const messages = [
    { toolUses: [use('Edit', { file_path: '/src/a.ts' }), use('Read', { file_path: '/src/z.ts' })] },
    { toolUses: [use('Write', { file_path: '/src/b.ts' }), use('Edit', { file_path: '/src/a.ts' }), use('NotebookEdit', { notebook_path: '/n.ipynb' })] },
    { toolUses: [] },
  ]
  expect(filesFromMessages(messages as never)).toEqual(['/src/a.ts', '/src/b.ts', '/n.ipynb'])
})

test('the summary is compared by file name and branch', () => {
  const d = compare(['/src/a.ts', '/src/b.ts', '/src/c.ts'], 'We changed A.ts and c.ts on feat-x.', 'feat-x', 5)
  expect(d).toEqual({ at: 5, files: 3, kept: 2, dropped: ['b.ts'], branchKept: true })
  expect(diffWords(d)).toBe('The summary names 2 of 3 changed files (dropped: b.ts). It names the branch.')
  expect(diffWords(compare(['/a.ts'], 'nothing', 'main', 1))).toBe('The summary names 0 of 1 changed files (dropped: a.ts). It does not name the branch.')
  expect(diffWords(compare([], 'x', undefined, 1))).toBe('No files were changed in this session.')
  expect(diffWords(compare(['/a.ts'], 'a.ts', undefined, 1))).toBe('The summary names all 1 changed file.')
  expect(diffWords(undefined)).toBe('')
})

test('a long list of dropped files is cut with dots', () => {
  const files = Array.from({ length: 9 }, (_, n) => `/f${n}.ts`)
  const d = compare(files, 'none', undefined, 1)
  expect(d.dropped).toHaveLength(6)
  expect(diffWords(d)).toMatch(/dropped: f0\.ts, .*, \.\.\.\)/)
})

test('the preview says what a compaction would replace and what the keep-list protects', () => {
  const text = previewWords({ messages: 120, files: ['/a/x.ts', '/a/y.ts'], keepList: false, tokens: 150_000, after: 12_000 })
  expect(text).toMatch(/replace 120 messages \(about 150k tokens\) with one summary of about 12k tokens/)
  expect(text).toMatch(/Files changed in this session \(2\): x\.ts, y\.ts/)
  expect(text).toMatch(/What Claude keeps is off/)
  expect(previewWords({ messages: 1, files: [], keepList: true })).toMatch(/replace 1 message with one summary\.\nNo file was changed/)
})
