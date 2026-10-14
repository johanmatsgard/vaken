// The Preview card's eyes: core/eyes.ts (paths, the programs' arguments, readers, words) and core/eyesdev.ts (dev-server truth).
import { expect } from 'claude-code/testing'

import { CHROME, EYES_SETTINGS, LOOK_CAP, LOOK_WHAT, NEED_CHROME, WRAP_SCRIPT, isOwnProfile, lookText, parseHashes, parseReach, parseSizes, pidsOfProfile, profilePath, shotArgs, stamp, wrapArgv } from '../hooks/core/eyes'
import { BODY_HEAD, devLine, errorWords, parseCurl, parseLsof } from '../hooks/core/eyesdev'
import { didToday } from '../hooks/core/ledger'
import { test } from './slow'

const NOW = Date.parse('2026-10-10T12:00:00Z')

test('the Preview setting: one row in the Eyes group, On by default (Recommended, the modes sorted by cost)', () => {
  expect(EYES_SETTINGS.map(s => s.key)).toEqual(['preview.auto'])
  expect(new Set(EYES_SETTINGS.map(s => s.group))).toEqual(new Set(['Page pictures']))
  expect(EYES_SETTINGS.map(s => s.default)).toEqual(['on'])
  for (const s of EYES_SETTINGS) expect(s.options.map(o => o.value)).toContain(s.default)
})

test('the folder name is the local time as yyyymmdd-hhmmss', () => {
  expect(stamp(new Date(2026, 9, 10, 14, 3, 22).getTime())).toBe('20261010-140322')
  expect(stamp(new Date(2026, 0, 2, 3, 4, 5).getTime())).toBe('20260102-030405')
})


test('the profile folder is unique and only a folder made by this block counts as its own', () => {
  const p = profilePath('/home/user', NOW, 3)
  expect(p).toBe(`/home/user/.claude/cockpit/eyes/profile-${NOW}-3`)
  expect(isOwnProfile('/home/user', p)).toBe(true)
  expect(isOwnProfile('/home/user', '/home/user')).toBe(false)
  expect(isOwnProfile('/home/user', '/home/user/.claude/cockpit/eyes')).toBe(false)
  expect(isOwnProfile('/home/user', '/home/user/.claude/cockpit/eyes/profile-1/../../..')).toBe(false)
  expect(isOwnProfile('/home/user', `${'/ho' + 'me/other'}/.claude/cockpit/eyes/profile-1`)).toBe(false)
  expect(isOwnProfile('', '/.claude/cockpit/eyes/profile-1')).toBe(false)
})

test('the Chrome arguments: background, no window, its own profile, the size, the picture file and the address last', () => {
  const a = shotArgs('/p/profile-1', '/p/profile-1/shot.png', 390, 'http://localhost:5173/')
  expect(a).toContain('--headless=new')
  expect(a).toContain('--user-data-dir=/p/profile-1')
  expect(a).toContain('--screenshot=/p/profile-1/shot.png')
  expect(a).toContain('--window-size=390,844')
  expect(a[a.length - 1]).toBe('http://localhost:5173/')
  expect(shotArgs('/p', '/p/s.png', 768, 'x').join(' ')).toMatch(/--window-size=768,1024/)
  expect(shotArgs('/p', '/p/s.png', 1280, 'x').join(' ')).toMatch(/--window-size=1280,800/)
  // The shot never turns on file access between local files.
  expect(a).not.toContain('--allow-file-access-from-files')
})

test('the script that runs Chrome is a constant: what varies is only handed over as arguments, and it ends nothing by name', () => {
  const run = wrapArgv('/p/out', 'bytes written to file', 80, ['--screenshot=/p/a b.png', 'http://x.test/?a=1&b=$(rm -rf)'])
  expect(run.slice(0, 4)).toEqual(['sh', '-c', WRAP_SCRIPT, 'eyes'])
  expect(run.slice(4, 8)).toEqual(['/p/out', 'bytes written to file', '80', CHROME])
  expect(run.slice(8)).toEqual(['--screenshot=/p/a b.png', 'http://x.test/?a=1&b=$(rm -rf)'])
  expect(WRAP_SCRIPT).not.toMatch(/pkill|killall|kill |rm /)
  expect(WRAP_SCRIPT).not.toMatch(/http|--screenshot|user-data-dir/)
})

const PS = [
  '  PID COMMAND',
  '    1 /sbin/launchd',
  '  900 /Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '  901 /Applications/Google Chrome.app/Contents/Frameworks/Google Chrome Framework.framework/Helpers/Google Chrome Helper.app/Contents/MacOS/Google Chrome Helper --type=renderer',
  '  5000 /Applications/Google Chrome.app/Contents/MacOS/Google Chrome --headless=new --user-data-dir=/h/.claude/cockpit/eyes/profile-7-1 --screenshot=/h/.claude/cockpit/eyes/profile-7-1/shot.png --window-size=390,844 http://localhost:5173/',
  '  5001 /Applications/Google Chrome.app/Contents/Frameworks/Google Chrome Helper --type=gpu-process --user-data-dir=/h/.claude/cockpit/eyes/profile-7-1 --headless',
  '  5002 /Applications/Google Chrome.app/Contents/Frameworks/Google Chrome Helper --type=renderer --user-data-dir=/h/.claude/cockpit/eyes/profile-7-1',
  '  5100 /Applications/Google Chrome.app/Contents/MacOS/Google Chrome --headless=new --user-data-dir=/h/.claude/cockpit/eyes/profile-7-10 --dump-dom file:///x',
  '  5200 /Applications/Google Chrome.app/Contents/MacOS/Google Chrome --user-data-dir=/h/.claude/cockpit/eyes/profile-7-1-copy',
].join('\n')

test('leftovers are found by their own profile folder and nothing else: not the person\'s Chrome, not a profile whose name starts the same', () => {
  expect(pidsOfProfile(PS, '/h/.claude/cockpit/eyes/profile-7-1')).toEqual([5000, 5001, 5002])
  expect(pidsOfProfile(PS, '/h/.claude/cockpit/eyes/profile-7-10')).toEqual([5100])
  expect(pidsOfProfile(PS, '/h/.claude/cockpit/eyes/profile-7-2')).toEqual([])
  expect(pidsOfProfile('garbage', '/p')).toEqual([])
})

test('hashes, sizes and the answer of curl', () => {
  const A = 'a'.repeat(64)
  const B = 'b'.repeat(64)
  expect(parseHashes(`${A}  /p/one.png\n${B}  /p/two words.png\nnot a line\n`)).toEqual(new Map([['/p/one.png', A], ['/p/two words.png', B]]))
  expect(parseSizes('6890 /p/one.png\n7123 /p/two.png\n')).toEqual(new Map([['/p/one.png', 6890], ['/p/two.png', 7123]]))
  expect(parseReach(0, '200')).toBe(200)
  expect(parseReach(0, '500')).toBe(500)
  expect(parseReach(0, '000')).toBeUndefined()
  expect(parseReach(7, '000')).toBeUndefined()
  expect(parseReach(28, '')).toBeUndefined()
  expect(parseReach(23, '200')).toBe(200)
  expect(parseReach(23, '000')).toBeUndefined()
  expect(parseReach(23, 'garbage')).toBeUndefined()
})

test('the look text: new pictures, unchanged ones, a failed one, and the cap', () => {
  const t = lookText('http://localhost:5173/', 'home', [{ width: 390, status: 'saved', path: '/p/home-390.png', bytes: 6890 }, { width: 768, status: 'unchanged', path: '/p/old-768.png' }, { width: 1280, status: 'failed', why: 'Chrome wrote no picture' }])
  expect(t).toMatch(/^Took 1 new picture of http:\/\/localhost:5173\/ \(name: home\)\./)
  expect(t).toMatch(/Phone, 390 wide: \/p\/home-390\.png \(6\.7 KB\)/)
  expect(t).toMatch(/Tablet, 768 wide: unchanged since the last picture \(\/p\/old-768\.png\)/)
  expect(t).toMatch(/Desktop, 1280 wide: no picture \(Chrome wrote no picture\)/)
  expect(t).toMatch(/Look at them by reading the path\./)
  expect(lookText('u', 'n', [{ width: 390, status: 'unchanged', path: '/p/a.png' }])).toMatch(/^Nothing changed on u/)
  expect(lookText('u', 'n', [], true)).toBe(`No picture taken: ${LOOK_CAP} pictures were taken in this answer already.`)
  expect(NEED_CHROME).toMatch(/^The Preview card needs Google Chrome\./)
})


test('the ledger counts the title of a picture', () => {
  expect(LOOK_WHAT).toBe('Took pictures of a page')
  expect(didToday([{ at: NOW, what: LOOK_WHAT, did: true }, { at: NOW, what: LOOK_WHAT, did: true }], NOW)).toEqual([{ what: LOOK_WHAT, n: 2 }])
})


const LSOF = 'COMMAND   PID       USER   FD   TYPE             DEVICE SIZE/OFF NODE NAME\nnode    41234 someone   23u  IPv6 0x1234567890      0t0  TCP *:5173 (LISTEN)\n'

test('lsof: the listener, or nothing', () => {
  expect(parseLsof(0, LSOF)).toEqual({ command: 'node', pid: 41234 })
  expect(parseLsof(1, '')).toBeUndefined()
  expect(parseLsof(0, 'COMMAND PID USER\n')).toBeUndefined()
})

test('curl: the code and the time, the start of the page; no answer is undefined', () => {
  expect(parseCurl(0, '<html>ok</html>\n200 0.043210')).toEqual({ status: 200, seconds: 0.04321, head: '<html>ok</html>' })
  expect(parseCurl(0, '\n500 0.5')).toEqual({ status: 500, seconds: 0.5, head: '' })
  expect(parseCurl(28, '')).toBeUndefined()
  expect(parseCurl(7, '\n000 0.000')).toBeUndefined()
  expect(parseCurl(0, 'x'.repeat(5000) + '\n200 0.1')?.head.length).toBe(BODY_HEAD)
})

test('error words in the start of a page are fixed words, never the page', () => {
  expect(errorWords('<h1>Unhandled Runtime Error</h1> Error: boom')).toEqual(['Unhandled Runtime Error'])
  expect(errorWords('Cannot GET /about')).toEqual(['Cannot GET'])
  expect(errorWords('Internal Server Error')).toEqual(['Internal Server Error'])
  expect(errorWords('<h1>Welcome</h1>')).toEqual([])
  expect(errorWords('Error')).toEqual(['Error'])
})

test('the dev-server lines the brief gives, and the others', () => {
  const who = { command: 'node', pid: 1 }
  expect(devLine(5173, who, { status: 200, seconds: 0.04, head: '<html>' })).toBe('Port 5173: up, answers 200 in 0.04 s.')
  expect(devLine(3000, who, { status: 500, seconds: 0.2, head: 'x' })).toBe('Port 3000: something listens, but it answers 500: the page shows an error.')
  expect(devLine(3000, who, { status: 500, seconds: 0.2, head: 'Unhandled Runtime Error' })).toBe('Port 3000: something listens, but it answers 500: the page shows an error. The page text holds: Unhandled Runtime Error.')
  expect(devLine(3001, undefined, undefined)).toBe('Port 3001: nothing listens.')
  expect(devLine(3001, who, undefined)).toBe('Port 3001: something listens (node), but it did not answer in 3 s.')
  expect(devLine(8080, who, { status: 404, seconds: 0.01, head: 'Cannot GET /' })).toMatch(/answers 404: the page was not found\. The page text holds: Cannot GET\./)
  expect(devLine(8000, who, { status: 200, seconds: 0.1, head: 'Traceback (most recent call last)' })).toMatch(/answers 200 in 0\.10 s, but the start of the page holds: Traceback\. The page may show an error\./)
})
