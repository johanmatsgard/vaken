import { expect } from 'claude-code/testing'
import { test } from './slow'

import { instructionDirs } from '../hooks/core/instrdirs'
import { collectFiles } from '../hooks/features/diet'

const disk = (files: Record<string, string>) => {
  const has = async (p: string): Promise<boolean> => Object.prototype.hasOwnProperty.call(files, p)
  const io = { home: async () => '', read: async (p: string) => (await has(p) ? files[p] : Promise.reject(new Error('missing'))) }
  return { has, io: io as never }
}

test('a session in a subfolder finds the CLAUDE.md at the repo root (Mac paths)', async () => {
  const d = disk({ '/work/app/.git': '', '/work/app/CLAUDE.md': 'Root rules.', '/work/CLAUDE.md': 'Above the repo.' })
  const { report } = await collectFiles(d.io, d.has, '/work/app/mods/x', '/work/app/mods/x', dir => d.has(`${dir}/.git`))
  expect(report.files.map(f => f.path)).toEqual(['/work/app/CLAUDE.md'])
})

test('a Windows-form session folder finds the CLAUDE.md at the repo root', async () => {
  const d = disk({ 'C:\\work\\app\\.git': '', 'C:\\work\\app\\CLAUDE.md': 'Root rules.', 'C:\\work\\CLAUDE.md': 'Above the repo.' })
  const { report } = await collectFiles(d.io, d.has, 'C:\\work\\app\\mods\\x', 'C:\\work\\app\\mods\\x', dir => d.has(`${dir}\\.git`))
  expect(report.files.map(f => f.path)).toEqual(['C:\\work\\app\\CLAUDE.md'])
})

test('nothing above the repo root is walked', async () => {
  const seen: string[] = []
  const dirs = await instructionDirs('/work/app/mods/x', '/work/app/mods/x', async dir => {
    seen.push(dir)
    return dir === '/work/app'
  })
  expect(dirs).toEqual(['/work/app/mods/x', '/work/app/mods', '/work/app'])
  expect(seen).not.toContain('/work')
})

test('the pane (no exists call) finds the repo root by reading .git/HEAD', async () => {
  const d = disk({ '/work/app/.git/HEAD': 'ref', '/work/app/AGENTS.md': 'Agents.' })
  const { report } = await collectFiles(d.io, async () => true, '/work/app/mods/x', '/work/app/mods/x')
  expect(report.files.map(f => f.path)).toEqual(['/work/app/AGENTS.md'])
})

test('no repo and a session root above the folder: walk to the session root; no repo and root equal to the folder: just the folder', async () => {
  const none = async (): Promise<boolean> => false
  expect(await instructionDirs('/work/app/mods/x', '/work/app', none)).toEqual(['/work/app/mods/x', '/work/app/mods', '/work/app'])
  expect(await instructionDirs('/work/app/mods/x', '/work/app/mods/x', none)).toEqual(['/work/app/mods/x'])
})
