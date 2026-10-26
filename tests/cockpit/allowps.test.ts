// A recursive PowerShell delete (Remove-Item and its aliases with -Recurse) takes a whole folder, so the stopped-step line says so (allow.ask_delete_folder).
import { expect } from 'claude-code/testing'
import { test } from './slow'

import { askWords, stepSaid, wholeFolderOf } from '../hooks/core/allowrules'
import { setLang } from '../hooks/core/lang'

const ENV = { home: '/home/user', cwd: '/w/app', root: '/w/app' }
const said = (command: string) => stepSaid('PowerShell', { command }, ENV, [])
const step = (command: string): string => askWords({ said: said(command).said }).step

test('Remove-Item and its aliases with -Recurse name the whole folder, in any case and with any -r prefix', () => {
  const folder = 'Deletes the folder build/ and everything in it.'
  for (const command of [
    'Remove-Item -Recurse build',
    'Remove-Item build -Recurse',
    'remove-item -recurse -force build',
    'REMOVE-ITEM -RECURSE build/',
    'Remove-Item -r build',
    'Remove-Item -rec build',
    'Remove-Item -Recu build\\*',
    'ri -Recurse build',
    'del -Recurse build',
    'erase -recurse build',
    'rd -Recurse build',
    'rmdir -Recurse build',
    'rm -Recurse build',
    'rm -Recurse -Force build',
    'Remove-Item -Path build -Recurse',
    'Remove-Item -LiteralPath build -Recurse',
    'Remove-Item -Recurse -Force -Path build',
    'Remove-Item -Recurse -Include *.log build',
  ]) expect(step(command), command).toBe(folder)
})

test('a PowerShell delete without -Recurse keeps its count, and -Force alone is not a recursion', () => {
  for (const command of ['Remove-Item build/a.js', 'Remove-Item -Force build/a.js', 'rm -Force build/a.js', 'del build/a.js', 'rmdir build', 'Remove-Item -Confirm build/a.js']) {
    expect(wholeFolderOf(command, ENV), command).toBeUndefined()
    expect(step(command), command).not.toMatch(/everything in it/)
  }
})

test('the folder is said from the project, outside it with its own path, and it is risky', () => {
  expect(wholeFolderOf('Remove-Item -Recurse ../shared/build', ENV)).toBe('shared/build/')
  const line = said('Remove-Item -Recurse -Force build')
  expect(line.risky).toBe(true)
  setLang('sv')
  try {
    expect(askWords({ said: line.said }).step).toBe('Tar bort mappen build/ och allt i den.')
  } finally {
    setLang('en')
  }
})

test('rm -r of the shell still works as before', () => {
  for (const command of ['rm -r build/', 'rm -R build/*', 'rm --recursive -f build', 'rm -rf build']) expect(wholeFolderOf(command, ENV), command).toBe('build/')
  expect(wholeFolderOf('rm build/a.js', ENV)).toBeUndefined()
  expect(wholeFolderOf('rm -f build/a.js', ENV)).toBeUndefined()
})
