// Undo on Windows: the files a PowerShell or cmd line is about to change, read from its text.
import { expect } from 'claude-code/testing'
import { test } from './slow'

import { bashPlan, shellPlan } from '../hooks/core/undo'
import { winPlan } from '../hooks/core/undowin'

const WIN = { home: 'C:\\Users\\me', cwd: 'C:\\Users\\me\\app' }
const APP = 'C:\\Users\\me\\app\\'
const ps = (c: string): string[] => shellPlan(c, WIN, 'powershell').targets.map(t => `${t.path.startsWith(APP) ? t.path.slice(APP.length) : t.path}${t.create ? ' +' : ''}`)

test('Remove-Item and its aliases, by -Path, -LiteralPath, a shortened name or position; -Recurse passes the folder on as rm -r does', () => {
  expect(ps('Remove-Item a.txt')).toEqual(['a.txt'])
  expect(ps('Remove-Item -Path a.txt -Force')).toEqual(['a.txt'])
  expect(ps('remove-item -path:a.txt')).toEqual(['a.txt'])
  expect(ps('REMOVE-ITEM -PA a.txt')).toEqual(['a.txt'])
  expect(ps('Remove-Item -LiteralPath a.txt')).toEqual(['a.txt'])
  expect(ps('Remove-Item -LP a.txt')).toEqual(['a.txt'])
  expect(ps('Remove-Item -PSPath a.txt')).toEqual(['a.txt'])
  for (const alias of ['ri', 'rm', 'del', 'erase', 'rd', 'rmdir']) expect(ps(`${alias} a.txt`), alias).toEqual(['a.txt'])
  expect(ps('rm -Recurse -Force build')).toEqual(['build'])
  expect(ps('Remove-Item -r -fo src\\old')).toEqual(['src\\old'])
  expect(ps('Remove-Item a.txt,b.txt')).toEqual(['a.txt', 'b.txt'])
  expect(ps('Remove-Item -Path a.txt -Filter b.txt -Include c.txt -Exclude d.txt')).toEqual(['a.txt'])
  expect(ps('Remove-Item a.txt b.txt')).toEqual(['a.txt'])
  expect(ps('Remove-Item C:\\work\\x.txt')).toEqual(['C:\\work\\x.txt'])
  expect(ps('Remove-Item C:/work/x.txt')).toEqual(['C:\\work\\x.txt'])
  expect(ps('Remove-Item ..\\other\\x.txt')).toEqual(['C:\\Users\\me\\other\\x.txt'])
  expect(ps('Remove-Item ~\\notes.txt')).toEqual(['C:\\Users\\me\\notes.txt'])
  expect(ps('Remove-Item $env:USERPROFILE\\notes.txt')).toEqual(['C:\\Users\\me\\notes.txt'])
  expect(ps('Remove-Item a.txt -WhatIf')).toEqual([])
})

test('Set-Content, Add-Content, Clear-Content, Out-File and Tee-Object, and > >> redirects', () => {
  expect(ps("Set-Content -Path out.txt -Value 'hi there'")).toEqual(['out.txt +'])
  expect(ps('Set-Content out.txt hello')).toEqual(['out.txt +'])
  expect(ps("Set-Content -Value 'x' -Encoding utf8 out.txt")).toEqual(['out.txt +'])
  expect(ps('sc out.txt x')).toEqual(['out.txt +'])
  expect(ps('Add-Content -LiteralPath log.txt -Value x')).toEqual(['log.txt +'])
  expect(ps('ac log.txt x')).toEqual(['log.txt +'])
  expect(ps('Clear-Content big.log')).toEqual(['big.log'])
  expect(ps('clc -Path big.log')).toEqual(['big.log'])
  expect(ps("'x' | Out-File -FilePath out.txt -Encoding utf8")).toEqual(['out.txt +'])
  expect(ps("'x' | Out-File out.txt -Append")).toEqual(['out.txt +'])
  expect(ps("'x' | Tee-Object -FilePath t.txt")).toEqual(['t.txt +'])
  expect(ps("echo hi > out.txt")).toEqual(['out.txt +'])
  expect(ps("Get-Date >> log.txt; dir 2> err.txt")).toEqual(['log.txt +', 'err.txt +'])
  expect(ps('echo hi > $null')).toEqual([])
  expect(ps('echo hi > nul')).toEqual([])
  expect(ps('Get-Process 2>&1 | Out-Null')).toEqual([])
  expect(ps('sc create svc binPath= x')).toEqual([])
})

test('Move-Item, Copy-Item and Rename-Item: a move empties the source, the destination is what gets overwritten', () => {
  expect(ps('Move-Item old.txt new.txt')).toEqual(['old.txt', 'new.txt +'])
  expect(ps('Move-Item -Path old.txt -Destination new.txt -Force')).toEqual(['old.txt', 'new.txt +'])
  expect(ps('Move-Item -Destination new.txt -Path old.txt')).toEqual(['old.txt', 'new.txt +'])
  expect(ps('Move-Item -Dest new.txt old.txt')).toEqual(['old.txt', 'new.txt +'])
  for (const alias of ['mi', 'move', 'mv']) expect(ps(`${alias} old.txt new.txt`), alias).toEqual(['old.txt', 'new.txt +'])
  expect(ps('Copy-Item a.txt b.txt')).toEqual(['b.txt +'])
  expect(ps('Copy-Item -Path a.txt -Destination C:\\out\\b.txt -Force')).toEqual(['C:\\out\\b.txt +'])
  for (const alias of ['cpi', 'copy', 'cp']) expect(ps(`${alias} a.txt b.txt`), alias).toEqual(['b.txt +'])
  expect(ps('Copy-Item -Recurse src dist')).toEqual(['dist +'])
  expect(ps('Copy-Item a.txt')).toEqual([])
  expect(ps('Rename-Item a.txt b.txt')).toEqual(['a.txt', 'b.txt +'])
  expect(ps('Rename-Item -Path src\\a.txt -NewName b.txt')).toEqual(['src\\a.txt', 'src\\b.txt +'])
  expect(ps('rni -NewName b.txt -LiteralPath src\\a[1].txt')).toEqual(['src\\a[1].txt', 'src\\b.txt +'])
  expect(ps('ren a.txt b.txt')).toEqual(['a.txt', 'b.txt +'])
})

test('cmd lines: del, erase, rd, move, copy, ren and rename, with /switches; a [ is a plain character there', () => {
  expect(ps('cmd /c del /f /q a.txt b.txt')).toEqual(['a.txt', 'b.txt'])
  expect(ps('cmd /c "erase a.txt"')).toEqual(['a.txt'])
  expect(ps('cmd /c rd /s /q build')).toEqual(['build'])
  expect(ps('cmd /c move /y a.txt b.txt c.txt dest.txt')).toEqual(['a.txt', 'b.txt', 'c.txt', 'dest.txt +'])
  expect(ps('cmd /c copy /y a.txt C:\\out\\a.txt')).toEqual(['C:\\out\\a.txt +'])
  expect(ps('cmd /c copy a.txt')).toEqual([])
  expect(ps('cmd /c ren a.txt b.txt')).toEqual(['a.txt', 'b.txt +'])
  expect(ps('cmd /c rename a.txt b.txt')).toEqual(['a.txt', 'b.txt +'])
  expect(ps('cmd /c del "a [1].txt"')).toEqual(['a [1].txt'])
  expect(ps('cmd /c echo x > out.txt')).toEqual(['out.txt +'])
  expect(ps('cmd /c sc stop x')).toEqual([])
  expect(ps('cmd /c type a.txt')).toEqual([])
  expect(ps('powershell -NoProfile -Command "Remove-Item a.txt"')).toEqual(['a.txt'])
  expect(ps('if (Test-Path a.txt) { Remove-Item a.txt }')).toEqual(['a.txt'])
})

test('odd paths: spaces, quotes, brackets, commas inside quotes', () => {
  expect(ps('Remove-Item "my file.txt"')).toEqual(['my file.txt'])
  expect(ps("Remove-Item 'it''s.txt'")).toEqual(["it's.txt"])
  expect(ps('Remove-Item -LiteralPath "C:\\My Docs\\a b.txt"')).toEqual(['C:\\My Docs\\a b.txt'])
  expect(ps("Remove-Item 'a,b.txt'")).toEqual(['a,b.txt'])
  expect(ps('Set-Content -LiteralPath "x[1].txt" -Value y')).toEqual(['x[1].txt +'])
  // In PowerShell [ ] in -Path is a pattern: skipped, never guessed.
  expect(ps('Remove-Item "x[1].txt"')).toEqual([])
  expect(ps('Remove-Item -Path x[1].txt')).toEqual([])
})

test('variable, computed and wildcard targets are skipped, never guessed', () => {
  for (const c of [
    'Remove-Item $x',
    'Remove-Item "$dir\\a.txt"',
    'Remove-Item $(Get-Item a.txt)',
    'Remove-Item (Join-Path $d a.txt)',
    'Remove-Item *.log',
    'Remove-Item a?.txt',
    'Remove-Item $env:TEMP\\a.txt',
    'Remove-Item ${env:APPDATA}\\a.txt',
    'cmd /c del %TEMP%\\a.txt',
    'cmd /c del *.tmp',
    'Get-ChildItem *.txt | ForEach-Object { Remove-Item $_ }',
    'Get-ChildItem build | Remove-Item -Recurse',
    'Remove-Item HKCU:\\Software\\X',
    'Remove-Item Env:\\FOO',
    'Remove-Item \\\\?\\C:\\x.txt',
    'Set-Content -Path $f -Value x',
    'echo hi > $out',
    'Get-ChildItem; git status; npm test',
  ]) expect(ps(c), c).toEqual([])
  expect(ps('Remove-Item a.txt, $x, *.log')).toEqual(['a.txt'])
})

test('git works through the PowerShell tool as through Bash', () => {
  expect(ps('git checkout -- a.ts b.ts')).toEqual(['a.ts', 'b.ts'])
  expect(shellPlan('git stash', WIN, 'powershell').gitDir).toBe('C:\\Users\\me\\app')
  expect(shellPlan('git -C C:\\w reset --hard', WIN, 'powershell').gitDir).toBe('C:\\w')
  expect(shellPlan('git status', WIN, 'powershell').gitDir).toBeUndefined()
})

test('at most 20 targets, as for a Bash line', () => {
  const many = Array.from({ length: 30 }, (_, n) => `f${n}.txt`).join(',')
  expect(shellPlan(`Remove-Item ${many}`, WIN, 'powershell').targets).toHaveLength(20)
})

test('the Bash tool on Windows: a Windows-shaped line adds the Windows reading to the POSIX one; an ordinary line is read exactly as before', () => {
  expect(shellPlan('cmd /c del a.txt', WIN, 'posix').targets.map(t => t.path)).toEqual([`${APP}a.txt`])
  expect(shellPlan('powershell -Command "Remove-Item a.txt"', WIN, 'posix').targets.map(t => t.path)).toEqual([`${APP}a.txt`])
  for (const c of ['rm a.txt', 'echo x > out.txt', 'mv a b', 'sed -i s/a/b/ x.ts', 'git stash']) expect(shellPlan(c, WIN, 'posix'), c).toEqual(bashPlan(c, WIN))
})

test('the plan is cheap: a long line is read quickly', () => {
  const line = Array.from({ length: 200 }, (_, n) => `Remove-Item -LiteralPath "dir ${n}\\file ${n}.txt" -Force`).join('; ')
  const t0 = Date.now()
  for (let n = 0; n < 20; n += 1) winPlan(line, WIN)
  expect(Date.now() - t0).toBeLessThan(1000)
})
