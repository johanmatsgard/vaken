// Clear yes: the allow rule offered after 3 yes answers to Claude Code's own question, never for a risky step; the masked short form of a stopped step; Keep stopped.
import { expect } from 'claude-code/testing'
import { test } from './slow'

import type { Io } from '../hooks/core/io'
import {
  ALLOW_RULES_KEY, ALLOW_RULES_SETTINGS, ALLOW_RULES_STRINGS, RULE_QUIET_MS, RULE_WINDOW_MS, SHORT_MAX,
  addOffer, allowMem, allowRulesModeOf, countAllow, dropOffer, noteAllow, notePending, offerWords, parseBook, ruleFormOf, rulesText, shortStepOf, takePending,
} from '../hooks/core/allowrules'
import type { RuleBook } from '../hooks/core/allowrules'
import { closeStop, grantAllow, isKeptStopped, keepOpenStop, noteHeld, openShort, stopMem } from '../hooks/core/allowonce'
import { parseGuardAsk } from '../hooks/core/guard'
import { PRESETS } from '../hooks/core/presets'
import { quietRowToWrite } from '../hooks/core/nextupgrade'
import { findSetting, settingPath } from '../hooks/core/settings'
import { itemRow, ruleGroups } from '../hooks/features/home/needs'
import type { InboxItem } from '../hooks/core/inbox'
import { byEnglish } from '../hooks/i18n/table'

const NOW = Date.parse('2026-10-16T12:00:00Z')
const DAY = 86_400_000
const SID = 'session-a'
const ENV = { home: '/home/user', cwd: '/w/app', root: '/w/app' }
const SV = byEnglish('sv')
const token = (): string => `ghp_${'a'.repeat(36)}`
const bash = (command: string): string | undefined => ruleFormOf('Bash', { command }, ENV)?.rule

function fake(): { io: Io; mem: Map<string, unknown>; clock: { now: number } } {
  const mem = new Map<string, unknown>()
  const clock = { now: NOW }
  const no = (): never => {
    throw new Error('not in this test')
  }
  const io: Io = {
    now: async () => clock.now,
    home: async () => '/home/user',
    sessionId: async () => SID,
    get: async k => mem.get(k),
    set: async (k, v) => void mem.set(k, JSON.parse(JSON.stringify(v))),
    del: async k => void mem.delete(k),
    keys: async () => [...mem.keys()],
    read: async () => no(),
    write: async () => no(),
    run: async () => no(),
    ask: async () => no(),
    complete: async () => no(),
    toast: () => undefined,
    invalidate: () => undefined,
  }
  return { io, mem, clock }
}

test('the rule form is the program and its first word, as Claude Code writes it in settings', () => {
  expect(bash('npm test')).toBe('Bash(npm test:*)')
  expect(bash('npm test -- --grep adds')).toBe('Bash(npm test:*)')
  expect(bash('git status')).toBe('Bash(git status:*)')
  expect(bash('git diff --stat')).toBe('Bash(git diff:*)')
  expect(bash('npm run build')).toBe('Bash(npm run build:*)')
  expect(bash('make build')).toBe('Bash(make build:*)')
  expect(bash('npx prisma generate')).toBe('Bash(npx prisma generate:*)')
  expect(ruleFormOf('Bash', { command: 'npm test' }, ENV)?.what).toBe('`npm test`')
  expect(ruleFormOf('Edit', { file_path: '/w/app/src/a.ts' }, ENV)).toEqual({ rule: 'Edit(/src/**)', what: 'edits in src/' })
  expect(ruleFormOf('Write', { file_path: 'docs/guide.md' }, ENV)?.rule).toBe('Edit(/docs/**)')
  expect(ruleFormOf('WebFetch', { url: 'https://docs.example.com/a?b=1' }, ENV)).toEqual({ rule: 'WebFetch(domain:docs.example.com)', what: 'fetches from docs.example.com' })
})

test('a rule is never offered for a step the safety check rates risky, or one a prefix would not describe', () => {
  for (const c of ['rm -rf build', 'git push origin main', 'git reset --hard HEAD~3', 'git clean -fd', 'git checkout .', 'curl https://example.com', 'npm install left-pad', 'pip install x', 'npm publish', 'npm run deploy', 'npm run db:reset', 'sudo ls', 'psql -c "drop table x"', 'docker run x', 'npm test && rm -rf x', 'npm test | tee out.txt', 'echo $HOME', 'node -e "x"', 'python -m pytest', 'bash -c "ls"', './run.sh', 'kubectl delete pod x', 'terraform destroy', 'mv a b']) {
    expect([c, bash(c)]).toEqual([c, undefined])
  }
  // Protected files, files outside the project, files at its top and secret files: no Edit rule
  for (const p of ['/w/app/.claude/settings.json', '/w/app/.git/config', '/home/user/.zshrc', '/etc/hosts', '/w/other/src/a.ts', '/w/app/package.json', '/w/app/config/.env', '/w/app/keys/id_rsa']) {
    expect([p, ruleFormOf('Edit', { file_path: p }, ENV)]).toEqual([p, undefined])
  }
  expect(ruleFormOf('mcp__db__query', { sql: 'select 1' }, ENV)).toBeUndefined()
  expect(ruleFormOf('PowerShell', { command: 'Get-ChildItem' }, ENV)).toBeUndefined()
})

test('a rule never covers a whole program: no rule for the program alone, none for a program whose flags write or run, an exact one for a script', () => {
  for (const c of ['find . -name x', 'find src -name x', 'sed -i s/a/b/ notes.txt', 'sed -n 1p notes.txt', 'awk -f prog.awk data.txt', 'gawk 1 data.txt', 'tar -xzf a.tgz', 'tar xzf a.tgz', 'truncate -s 0 log.txt', 'install -m 755 a bin', 'ln -s a b', 'mkdir -p out', 'cp a b', 'mv a b', 'perl x.pl', 'ruby x.rb', 'node build.js', 'python3 manage.py runserver', 'python manage.py runserver', 'xargs echo', 'parallel echo', 'git config user.name x', 'chmod 644 a', 'chown me a', 'dd if=a of=b', 'rsync a b', 'ls -la', 'pytest tests/unit -q', 'npx prisma', 'npx prisma migrate reset', 'uv run manage.py flush']) {
    expect([c, bash(c)]).toEqual([c, undefined])
  }
  expect(bash('uv run manage.py runserver')).toBe('Bash(uv run manage.py runserver)')
  expect(bash('go run main.go')).toBe('Bash(go run main.go)')
  expect(bash('tsx gen.ts')).toBe('Bash(tsx gen.ts)')
  expect(bash('mkdir out')).toBe('Bash(mkdir out:*)')
})

test('a step with a secret in it gets no rule, and the rule never holds the secret', () => {
  expect(bash(`npm test -- --token ${token()}`)).toBeUndefined()
  expect(bash(`GITHUB_TOKEN=${token()} npm test`)).toBeUndefined()
  expect(ruleFormOf('WebFetch', { url: `https://api.example.com/x?access_token=${token()}` }, ENV)).toBeUndefined()
  expect(ruleFormOf('Edit', { file_path: `/w/app/src/${token()}.ts` }, ENV)).toBeUndefined()
})

test('the third yes in 7 days offers the rule; older ones fall out of the week', () => {
  const form = { rule: 'Bash(npm test:*)', what: '`npm test`' }
  let book: RuleBook = {}
  for (const at of [NOW, NOW + DAY]) {
    const r = noteAllow(book, form, at)
    expect(r.offer).toBeUndefined()
    book = r.book
  }
  const third = noteAllow(book, form, NOW + 2 * DAY)
  expect(third.offer).toEqual({ rule: 'Bash(npm test:*)', what: '`npm test`', n: 3 })
  // Spread over more than a week: the first yes has fallen out
  let slow: RuleBook = {}
  for (const at of [NOW, NOW + DAY]) slow = noteAllow(slow, form, at).book
  expect(noteAllow(slow, form, NOW + RULE_WINDOW_MS + 1).offer).toBeUndefined()
})

test('an offered rule is offered once, then not again for 30 days', () => {
  const form = { rule: 'Bash(git status:*)', what: '`git status`' }
  let book: RuleBook = {}
  let offers = 0
  const yes = (at: number): void => {
    const r = noteAllow(book, form, at)
    book = r.book
    if (r.offer !== undefined) offers += 1
  }
  for (let k = 0; k < 3; k += 1) yes(NOW + k)
  expect(offers).toBe(1)
  for (let k = 0; k < 9; k += 1) yes(NOW + DAY + k)
  expect(offers).toBe(1)
  for (let k = 0; k < 3; k += 1) yes(NOW + RULE_QUIET_MS + k)
  expect(offers).toBe(2)
})

test('the store keeps rule forms and counts, never the command', async () => {
  const w = fake()
  const form = ruleFormOf('Bash', { command: 'npm test -- --grep secretplan' }, ENV)
  expect(form).toBeDefined()
  if (form === undefined) return
  await countAllow(w.io, form, NOW)
  await countAllow(w.io, form, NOW + 1)
  const offer = await countAllow(w.io, form, NOW + 2)
  expect(offer?.rule).toBe('Bash(npm test:*)')
  const kept = JSON.stringify(w.mem.get(ALLOW_RULES_KEY))
  expect(kept.includes('secretplan')).toBe(false)
  expect(Object.keys(parseBook(w.mem.get(ALLOW_RULES_KEY)))).toEqual(['Bash(npm test:*)'])
  expect(rulesText(parseBook(w.mem.get(ALLOW_RULES_KEY)), 'offer')).toContain('Bash(npm test:*)')
  expect(rulesText({}, 'offer')).toContain('No rule offered yet.')
  expect(parseGuardAsk('rules')).toEqual({ kind: 'rules' })
})

test('the offer says what to add and where, and its row presses Copy the rule', () => {
  const o = { rule: 'Bash(npm test:*)', what: '`npm test`', n: 3 }
  expect(offerWords(o, x => x)).toBe('You allowed `npm test` 3 times. To stop this question, add this rule to your settings: Bash(npm test:*)')
  allowMem.offers = []
  addOffer(o)
  addOffer(o)
  expect(allowMem.offers.length).toBe(1)
  const g = ruleGroups(allowMem.offers, x => x)
  const row = g[0]?.rows[0] as { inside?: { label: string; action: unknown; more?: { label: string }[] }; what?: { facts?: string[] } } | undefined
  expect(row?.inside?.label).toBe('Copy the rule')
  expect(row?.inside?.action).toEqual({ kind: 'copyRule', rule: 'Bash(npm test:*)' })
  expect(row?.inside?.more?.map(m => m.label)).toEqual(['Dismiss'])
  expect(row?.what?.facts?.[0]).toContain('.claude/settings.json')
  dropOffer(o.rule)
  expect(ruleGroups(allowMem.offers, x => x)).toEqual([])
  // A yes is counted only for the call Claude Code asked about
  notePending('call-1', { rule: 'Bash(npm test:*)', what: '`npm test`' })
  expect(takePending('call-2')).toBeUndefined()
  expect(takePending('call-1')?.rule).toBe('Bash(npm test:*)')
  expect(takePending('call-1')).toBeUndefined()
})

test('a stopped step has a masked short form of at most 60 characters', () => {
  expect(shortStepOf({ tool: 'Bash', command: 'cd /w/app && git reset --hard HEAD~3' })).toBe('git reset --hard HEAD~3')
  expect(shortStepOf({ tool: 'Bash', command: 'rm -rf build/' })).toBe('rm -rf build/')
  const secret = shortStepOf({ tool: 'Bash', command: `curl -H "Authorization: Bearer ${token()}" -X DELETE https://api.example.com/v1/items` }) ?? ''
  expect(secret.includes(token())).toBe(false)
  expect(secret.includes('ghp_')).toBe(false)
  expect(secret.length).toBeLessThanOrEqual(SHORT_MAX)
  const long = shortStepOf({ tool: 'Bash', command: `rm -rf ${'very-long-folder-name/'.repeat(10)}` }) ?? ''
  expect(long.length).toBe(SHORT_MAX)
  expect(shortStepOf({ tool: 'Write', file_path: '/home/user/project/.env' })).toBe('Write .env')
  expect(shortStepOf({ tool: 'WebFetch', url: `https://example.com/x?token=${token()}` })).toBe('WebFetch example.com')
  expect(shortStepOf(undefined)).toBeUndefined()
})

test('the short form lives only while the stop is open, and Keep stopped keeps that exact step stopped', async () => {
  const w = fake()
  stopMem.kept.clear()
  const call = { tool: 'Bash', command: 'git reset --hard HEAD~3', tool_use_id: 'call-1' }
  await noteHeld(w.io, SID, { id: 'call-1', call }, ['destructive|reset'], 'This throws away work.')
  expect(openShort(SID, NOW)).toBe('git reset --hard HEAD~3')
  expect(openShort('session-b', NOW)).toBeUndefined()
  expect(JSON.stringify([...w.mem.values()]).includes('git reset')).toBe(false)
  // Allow once ends the stop, and the short form goes with it
  await grantAllow(w.io, SID)
  expect(openShort(SID, NOW)).toBeUndefined()
  // Dismiss ends it too
  await noteHeld(w.io, SID, { id: 'call-2', call }, ['destructive|reset'], 'This throws away work.')
  closeStop(SID)
  expect(openShort(SID, NOW)).toBeUndefined()
  // Keep stopped: the same step, retried with a new id, stays stopped; another step does not
  await noteHeld(w.io, SID, { id: 'call-3', call }, ['destructive|reset'], 'This throws away work.')
  expect(keepOpenStop(SID)).toBe(true)
  expect(openShort(SID, NOW)).toBeUndefined()
  expect(await isKeptStopped(SID, { id: 'call-4', call: { ...call, tool_use_id: 'call-4' } })).toBe(true)
  expect(await isKeptStopped(SID, { id: 'call-5', call: { tool: 'Bash', command: 'git reset --hard HEAD~1' } })).toBe(false)
  expect(await isKeptStopped('session-b', { id: 'call-6', call })).toBe(false)
  expect(keepOpenStop(SID)).toBe(false)
  stopMem.kept.clear()
})

test('a stopped step here offers Allow once, Keep stopped and Dismiss, and shows its short form', async () => {
  const w = fake()
  const it: InboxItem = { id: 'hold:x', kind: 'hold', sid: SID, name: 'app', here: true, what: 'Held a risky command. This throws away work.', since: NOW, lastAt: NOW, approx: false, todo: '', count: 1, allowed: false }
  await noteHeld(w.io, SID, { id: 'call-1', call: { tool: 'Bash', command: 'git reset --hard' } }, ['destructive|reset'], 'This throws away work.')
  const row = itemRow(it, 0, NOW, x => x) as { inside?: { label: string; more?: { label: string; action: unknown }[] }; what?: { facts?: string[] } }
  expect(row.inside?.label).toBe('Allow once')
  expect(row.inside?.more?.map(m => m.label)).toEqual(['Keep stopped', 'Dismiss'])
  expect(row.inside?.more?.[0]?.action).toEqual({ kind: 'keepStopped' })
  expect(row.what?.facts?.[0]).toBe('Step: git reset --hard')
  closeStop(SID)
})

test('the setting: Off or Offer, Offer in Recommended and Everything useful, Off in Only alerts, kept off the Settings pane', () => {
  const s = findSetting('allow.rules')
  expect(s?.default).toBe('offer')
  expect(s?.options.map(o => o.value)).toEqual(['off', 'offer'])
  expect(settingPath(ALLOW_RULES_SETTINGS[0])).toBe('/vaken-settings all')
  expect(PRESETS.find(p => p.name === 'quiet')?.values['allow.rules']).toBe('off')
  expect(PRESETS.find(p => p.name === 'balanced')?.values['allow.rules']).toBe('offer')
  expect(PRESETS.find(p => p.name === 'full')?.values['allow.rules']).toBe('offer')
  expect(allowRulesModeOf('off')).toBe('off')
  expect(allowRulesModeOf(undefined)).toBe('offer')
  const quiet = PRESETS.find(p => p.name === 'quiet')?.values ?? {}
  expect(quietRowToWrite('allow.rules', quiet, new Set(Object.keys(quiet).filter(k => k !== 'allow.rules')))).toBe('off')
})

test('every word has a Swedish row', () => {
  for (const s of ALLOW_RULES_STRINGS) expect([s, SV[s] !== undefined]).toEqual([s, true])
})
