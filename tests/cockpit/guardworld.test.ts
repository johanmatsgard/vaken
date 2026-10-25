// The Guard: the rules and the hooks as the engine runs them.
import { expect, mock } from 'claude-code/testing'
import type { EngineInterface, On } from 'claude-code'

import { bashEffects, effectWords, hostOf, mcpEffect, outwardOf } from '../hooks/core/guardeffects'
import { checkSecretRead, maskSecrets, scanSecrets, secretFileKind, secretsAfter, secretsBefore } from '../hooks/core/guardsecrets'
import { GUARDWORLD_SETTINGS, GUARDWORLD_WHATS, addOutbox, awayText, emptyOutbox, judgeWorld, outboxBand, outboxLine, outboxText, parseAwayAsk, parseOutbox } from '../hooks/core/guardworld'
import { SLOW, test } from './slow'
import { viaParent } from './viaparent'

// Text that looks like an address or a key is built in pieces, so the repository scan does not take it for a real one.
const AT = '@'

const NOW = Date.parse('2026-10-10T12:00:00Z')
const fake = (...p: string[]): string => p.join('')
const AWS_KEY = fake('AKIA', 'Q3X7K9M2P5R8T1V4')
const GH_TOKEN = fake('ghp_', 'a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6q7R8')
const PEM = fake('-----BEGIN RSA ', 'PRIVATE KEY-----\n', 'MIIEowIBAAKCAQEAx7Qp9Zk2v4Lm8Nn3Bb6Cc1Dd5Ee0Ff7Gg2Hh9Jj4Kk8Ll3Mm6Nn1Pp5Qq0R')

test('maskSecrets: a key on the 400,000-character edge is masked whole, at every place across the cut', () => {
  const KEEP = 400_000
  for (const [token, lead] of [[GH_TOKEN, 30_000], [AWS_KEY, 30_000], [GH_TOKEN, 90_000]] as const) {
    for (const inside of [0, 1, 5, Math.floor(token.length / 2), token.length - 1, token.length]) {
      const text = 'x '.repeat(lead) + token + ' ' + 'y'.repeat(KEEP - inside - 1)
      const out = maskSecrets(text)
      expect(out.length).toBeLessThanOrEqual(KEEP + 8)
      for (let s = 0; s + 6 <= token.length; s++) expect(out.includes(token.slice(s, s + 6))).toBe(false)
      expect(out.endsWith(` ${'y'.repeat(KEEP - inside - 1)}`)).toBe(true)
      if (inside > 0) expect(out).toContain('[hidden]')
    }
  }
  const many = Array.from({ length: 3000 }, () => GH_TOKEN).join(' ') + ' ' + 'z'.repeat(KEEP - 10)
  const out = maskSecrets(many)
  expect(out).not.toContain(GH_TOKEN.slice(-8))
  expect(out.length).toBeLessThanOrEqual(KEEP)
  expect(maskSecrets(`a ${GH_TOKEN} b`)).toBe('a [hidden] b')
  expect(maskSecrets('plain')).toBe('plain')
})

test('the Settings rows sit in group Guard, and have the right choices and defaults', () => {
  expect(GUARDWORLD_SETTINGS.map(s => s.key)).toEqual(['guard.world', 'guard.secrets', 'guard.outbox', 'away.policy'])
  for (const s of GUARDWORLD_SETTINGS) expect(s.group).toBe('Risky steps')
  const by = (k: string) => GUARDWORLD_SETTINGS.find(s => s.key === k)!
  expect(by('guard.world').options.map(o => o.value)).toEqual(['off', 'warn', 'hold'])
  expect(by('guard.world').default).toBe('warn')
  expect(by('guard.secrets').options.map(o => o.value)).toEqual(['off', 'warn', 'hold'])
  expect(by('guard.secrets').default).toBe('warn')
  expect(by('guard.outbox').options.map(o => o.value)).toEqual(['off', 'on'])
  expect(by('guard.outbox').default).toBe('on')
  expect(by('away.policy').options.map(o => o.value)).toEqual(['off', 'careful'])
  expect(by('away.policy').default).toBe('off')
})

test('a plain pull request step is routine: Warn says nothing, Hold still holds it; --admin and close are not routine', () => {
  const judge = (cmd: string, world: 'warn' | 'hold') => judgeWorld('Bash', { command: cmd }, { world, secrets: 'warn' }).found.length
  for (const c of ['gh pr create --title x --body y', 'gh pr merge 12 --squash', 'gh pr edit 12 --title z', 'gh pr ready 12']) {
    expect(judge(c, 'warn')).toBe(0)
    expect(judge(c, 'hold')).toBe(1)
  }
  for (const c of ['gh pr merge 12 --admin --squash', 'gh pr close 12', 'gh pr comment 5 --body hi', 'gh issue create']) expect(judge(c, 'warn')).toBe(1)
  expect(judgeWorld('Bash', { command: 'gh pr merge 12 --squash' }, { world: 'warn', secrets: 'warn' }).outs.length).toBe(1)
})

// A real outside server is named by an id, so the place comes from the words of the tool.
const mcp = (name: string) => mcpEffect(`mcp__aec81d26-a53b-490c-8f73-fc4c1f8f364e__${name}`)

test('an outside tool that sends, posts, creates, changes, deletes, pays or shares is an effect; its words name the effect and the place', () => {
  const o = mcp('slack_send_message')!
  expect(o.to).toBe('Slack')
  expect(effectWords(o, 'would')).toBe('This would send a message in Slack: it changes something other people see.')
  expect(effectWords(o, 'did')).toBe('This sent a message in Slack: it changes something other people see.')
  const table: [string, string, string][] = [
    ['create_event', 'create or change a calendar event', 'Calendar'],
    ['reply', 'send a message', 'another app'],
    ['forward', 'send a message', 'another app'],
    ['trash_message', 'delete a message', 'your mail'],
    ['share_file', 'share a file with other people', 'another app'],
    ['slack_add_reaction', 'add a reaction', 'Slack'],
    ['slack_schedule_message', 'send a message', 'Slack'],
    ['slack_create_canvas', 'create or change a file', 'Slack'],
    ['merge_pull_request', 'merge a pull request', 'another app'],
    ['add_issue_comment', 'add a comment', 'another app'],
    ['create_refund', 'move money for a payment', 'another app'],
    ['update_file', 'create or change a file', 'another app'],
    ['delete_event', 'delete a calendar event', 'Calendar'],
  ]
  for (const [name, now, to] of table) {
    const e = mcp(name)
    expect(e, name).toBeDefined()
    expect(e!.now.startsWith(now), `${name}: ${e!.now}`).toBe(true)
    expect(e!.to, name).toBe(to)
    expect(e!.guarded).toBe(true)
  }
  expect(effectWords(mcpEffect('mcp__stripe__create_refund')!, 'would')).toMatch(/^This would move money for a payment in Stripe: it moves money\.$/)
  expect(effectWords(mcp('trash_message')!, 'would')).toMatch(/may not come back/)
  expect(mcpEffect('mcp__github__merge_pull_request')!.label).toEqual(['pull request change', 'pull request changes'])
})

test('reads, drafts, labels, other kinds of names and the app\'s own tools always pass', () => {
  const quiet = [
    'slack_read_channel', 'slack_search_public', 'slack_read_user_profile', 'search_threads', 'list_events', 'get_event', 'get_file_permissions', 'download_file_content', 'suggest_time', 'list_drafts',
    'create_draft', 'update_draft', 'delete_draft', 'slack_send_message_draft', 'label_message', 'create_label', 'update_message_labels', 'mark_message_spam', 'untrash_message', 'exec', 'render-ui', 'query', 'open_application',
  ]
  for (const name of quiet) expect(mcp(name), name).toBeUndefined()
  for (const t of ['mcp__ccd_session_mgmt__send_message', 'mcp__ccd_sidebar__move_sessions', 'mcp__Claude_Browser__navigate', 'mcp__terminal__run_in_terminal', 'Bash', 'Read', 'mcp__nonsense']) expect(mcpEffect(t), t).toBeUndefined()
})

const guarded = (cmd: string): string[] => bashEffects(cmd).filter(o => o.guarded).map(o => o.now)
const hits = (cmd: string): number => guarded(cmd).length

test('shell commands that change things outside are found; reads and local calls are not', () => {
  const writes: [string, RegExp][] = [
    ['curl -X POST https://hooks.example.com/x -d "{}"', /^send a POST request that changes data at hooks.example.com$/],
    ['curl -XDELETE https://api.example.com/a/1', /DELETE request/],
    ['curl --request PUT https://api.example.com/a', /PUT request/],
    ['curl -X PATCH https://api.example.com/a', /PATCH request/],
    ['curl -d x=1 https://api.example.com/a', /POST request/],
    ['wget --post-data=a=1 https://api.example.com/a', /POST request/],
    ['gh pr merge 12 --squash', /^merge a pull request in GitHub$/],
    ['gh pr create --title x --body y', /pull request in GitHub/],
    ['gh pr comment 5 --body hi', /^add a comment on a pull request in GitHub$/],
    ['gh -R o/r issue close 3', /issue in GitHub/],
    ['gh issue create', /issue in GitHub/],
    ['gh issue comment 3 --body x', /comment on an issue/],
    ['gh release create v1 --notes x', /^publish a release in GitHub$/],
    ['gh release delete v1', /^delete a release in GitHub$/],
    ['gh api -X POST repos/o/r/issues', /something in GitHub/],
    ['gh api repos/o/r/issues -f title=x', /something in GitHub/],
    ['gh api graphql -f query="mutation { x }"', /something in GitHub/],
    ['aws s3 rm s3://b/x', /^delete cloud resources in AWS$/],
    ['aws ec2 terminate-instances --instance-ids i-1', /^delete cloud resources in AWS$/],
    ['aws s3 cp ./a s3://b/a', /cloud resources in AWS/],
    ['aws lambda invoke --function-name f out.json', /cloud resources in AWS/],
    ['gcloud compute instances delete vm1', /^delete cloud resources in Google Cloud$/],
    ['gcloud run deploy svc --image x', /cloud resources in Google Cloud/],
    ['gsutil rm gs://b/x', /cloud resources/],
    ['az vm delete -n x -g y', /^delete cloud resources in Azure$/],
    ['stripe customers create --email a@b.c', /^move money for a payment in Stripe$/],
    ['stripe refunds create --charge ch_1', /Stripe/],
    ['echo hi | sendmail a@b.c', /^send an email$/],
    ['mail -s hi a@b.c < body.txt', /^send an email$/],
    ['slack deploy', /^send a message in Slack$/],
    ['npm publish', /publish a package to a public package registry/],
    ['terraform apply -auto-approve', /live infrastructure/],
    ['kubectl delete pod web-1', /cluster resources/],
    ['cd app && curl -X POST https://api.example.com/x', /POST request/],
  ]
  for (const [cmd, re] of writes) {
    const found = guarded(cmd)
    expect(found.length, cmd).toBeGreaterThan(0)
    expect(found.some(f => re.test(f)), `${cmd} -> ${found.join(' | ')}`).toBe(true)
  }
  const quiet = [
    'ls -la', 'git status', 'curl https://api.example.com/x', 'curl -s -H "Accept: x" https://api.example.com/x | jq .', 'curl -I https://example.com', 'curl -G -d q=1 https://api.example.com/s',
    'curl -X POST http://localhost:3000/x -d a=1', 'curl -d x http://127.0.0.1:8080/y', 'wget https://example.com/f.zip',
    'gh pr view 5', 'gh pr list', 'gh pr diff 5', 'gh pr checks', 'gh issue list', 'gh issue view 3', 'gh release list', 'gh repo clone o/r', 'gh api repos/o/r', 'gh api graphql -f query="query { x }"', 'gh auth status',
    'aws s3 ls', 'aws ec2 describe-instances', 'aws s3 cp s3://b/x .', 'aws sts get-caller-identity', 'aws configure set region eu-west-1', 'aws ec2 run-instances --dry-run',
    'gcloud compute instances list', 'gcloud run services list', 'gcloud config set project p', 'az vm list', 'az account set -s x', 'gsutil ls gs://b',
    'stripe customers list', 'stripe listen', 'stripe logs tail', 'mail', 'slack list', 'npm install', 'npm test', 'terraform plan', 'kubectl get pods', 'docker build .',
    'echo "curl -X POST https://api.example.com"', 'cat <<EOF\ncurl -X POST https://x.example.com\nEOF',
  ]
  for (const cmd of quiet) expect(hits(cmd), `${cmd} -> ${guarded(cmd).join(' | ')}`).toBe(0)
})

test('the place of a web request is the domain name only, never the path, the query or a password', () => {
  expect(hostOf(`https://user:pw${AT}API.Example.com:8443/v1/secret/path?token=abc`)).toBe('api.example.com')
  expect(hostOf('api.example.com/x')).toBe('api.example.com')
  expect(hostOf('$API_URL/x')).toBeUndefined()
  const out = bashEffects(`curl -X POST https://user:pw${AT}api.example.com/v1/secret/path?token=abc -d "private words"`)
  expect(out.map(o => o.to)).toEqual(['api.example.com'])
  const all = JSON.stringify(out)
  for (const leak of ['pw', 'secret', 'token', 'private words', 'abc']) expect(all.includes(leak), leak).toBe(false)
  expect(bashEffects('curl -X POST "$URL" -d a=1')[0]?.to).toBe('a web address')
})

test('outbox-only effects: a plain web read, a search, a git push and a copy to another machine are listed but never guarded', () => {
  const o = (cmd: string) => bashEffects(cmd).map(x => ({ label: x.label[0], to: x.to, guarded: x.guarded, write: x.write }))
  expect(o('curl https://api.example.com/x')).toEqual([{ label: 'web request', to: 'api.example.com', guarded: false, write: false }])
  expect(o('git push origin main')).toEqual([{ label: 'git push', to: 'a git remote', guarded: false, write: true }])
  expect(o(`scp a.txt me${AT}build.example.com:/tmp/`)).toEqual([{ label: 'file copy', to: 'build.example.com', guarded: false, write: true }])
  expect(o('git push --dry-run')).toEqual([])
  expect(outwardOf('WebFetch', { url: 'https://docs.example.com/page?q=1' }).map(x => x.to)).toEqual(['docs.example.com'])
  expect(outwardOf('WebFetch', { url: 'http://localhost:3000' })).toEqual([])
  expect(outwardOf('WebSearch', { query: 'private words' }).map(x => x.label[0])).toEqual(['web search'])
  expect(JSON.stringify(outwardOf('WebSearch', { query: 'private words' }))).not.toMatch(/private words/)
})

test('secret files: env files, keys, credentials and login settings count; examples and public files do not', () => {
  for (const p of ['/w/.env', '/w/.env.local', '/w/.env.production', '/w/prod.env', '/home/u/.ssh/id_rsa', '/home/u/.ssh/id_ed25519', '/w/server.pem', '/home/u/.aws/credentials', '/w/.npmrc', '/home/u/.netrc', '/w/.dev.vars']) {
    expect(secretFileKind(p), p).toBeDefined()
  }
  for (const p of ['/w/.env.example', '/w/.env.sample', '/w/env.ts', '/w/src/environment.ts', '/home/u/.ssh/id_rsa.pub', '/w/README.md', '/w/credentials-guide.md']) expect(secretFileKind(p), p).toBeUndefined()
})

test('keys are found by kind, placeholders are not, and no value is ever returned', () => {
  expect(scanSecrets(`export KEY=${AWS_KEY}`).map(h => h.kind)).toEqual(['an AWS-style key id'])
  expect(scanSecrets(`token ${GH_TOKEN}`).map(h => h.kind)).toEqual(['a GitHub-style token'])
  expect(scanSecrets(PEM).map(h => h.kind)).toEqual(['a private key'])
  expect(scanSecrets(`postgres://admin:Zx9fQ2kLm${AT}db.example.com/app`).map(h => h.kind)).toEqual(['a password inside a web address'])
  expect(scanSecrets('API_TOKEN=abcd1234efgh5678ijkl').map(h => h.kind)).toEqual(['a secret value in a variable'])
  for (const text of [`export KEY=${'AKIA' + 'EXAMPLEEXAMPLE12'}`, 'API_TOKEN=your-token-here-1234567', 'NEXT_PUBLIC_KEY=abcd1234efgh5678ijkl', `postgres://user:password${AT}localhost/db`, 'grep -r "BEGIN PRIVATE KEY" .', 'API_KEY=$SOME_VARIABLE_NAME_1']) {
    expect(scanSecrets(text), text).toEqual([])
  }
  expect(scanSecrets(`old ${AWS_KEY}`, `old ${AWS_KEY}`)).toEqual([])
  expect(JSON.stringify(scanSecrets(`${AWS_KEY} ${GH_TOKEN} ${PEM}`))).not.toMatch(/AKIA|ghp_|MIIE/)
})

test('a call is checked for secrets by its arguments, and what is said names the kind and the tool, never the secret', () => {
  const read = secretsBefore('Read', { file_path: '/w/.env' })
  expect(read.length).toBe(1)
  expect(read[0]?.words).toMatch(/Read tool is about to open an env file/)
  expect(secretsBefore('Read', { file_path: '/w/.env.example' })).toEqual([])
  expect(secretsBefore('Grep', { pattern: 'x', path: '/home/u/.aws/credentials' }).length).toBe(1)
  expect(checkSecretRead('cat .env')).toMatch(/^cat would print the inside of an env file/)
  expect(checkSecretRead('printenv')).toMatch(/printenv/)
  expect(checkSecretRead('echo $GITHUB_TOKEN')).toMatch(/GITHUB_TOKEN/)
  expect(checkSecretRead('source .env && npm test')).toBeUndefined()
  expect(checkSecretRead('cat README.md')).toBeUndefined()
  const sent = secretsBefore('Bash', { command: `curl -H "Authorization: Bearer ${GH_TOKEN}" https://api.example.com` })
  expect(sent[0]?.words).toMatch(/GitHub-style token/)
  const mcpCall = secretsBefore('mcp__srv__slack_send_message', { text: `here ${AWS_KEY}`, channel: 'general' })
  expect(mcpCall[0]?.words).toMatch(/AWS-style key id/)
  expect(mcpCall[0]?.words).toMatch(/slack_send_message/)
  const edit = secretsBefore('Write', { file_path: '/w/src/config.ts', content: `const k = "${AWS_KEY}"` })
  expect(edit[0]?.words).toMatch(/not a secret file/)
  expect(secretsBefore('Write', { file_path: '/w/.env', content: `K=${AWS_KEY}` })).toEqual([])
  expect(secretsAfter('Bash', `output ${GH_TOKEN} more`)[0]?.words).toMatch(/result of the Bash tool holds a GitHub-style token/)
  expect(secretsAfter('Bash', 'all fine')).toEqual([])
  const all = JSON.stringify([read, sent, mcpCall, edit, secretsAfter('Bash', `x ${GH_TOKEN}`)])
  for (const leak of [AWS_KEY, GH_TOKEN, 'general']) expect(all.includes(leak), leak).toBe(false)
})

test('judging a call gives the effects for the outbox and, for the checks that are on, the findings', () => {
  const modes = { world: 'warn', secrets: 'warn' } as const
  const j = judgeWorld('mcp__srv__slack_send_message', { text: 'hi' }, modes)
  expect(j.outs.length).toBe(1)
  expect(j.found.map(f => f.rule)).toEqual(['world'])
  expect(j.found[0]?.words).toBe('This would send a message in Slack: it changes something other people see.')
  expect(judgeWorld('mcp__srv__slack_send_message', { text: 'hi' }, { world: 'off', secrets: 'warn' })).toMatchObject({ found: [] })
  expect(judgeWorld('mcp__srv__slack_send_message', { text: 'hi' }, { world: 'off', secrets: 'warn' }).outs.length).toBe(1)
  expect(judgeWorld('Read', { file_path: '/w/.env' }, { world: 'off', secrets: 'off' }).found).toEqual([])
  expect(judgeWorld('Bash', { command: 'git push origin x' }, modes).found).toEqual([])
})

test('the outbox counts kinds and places, in plain words, and the band line is short and only about changes', () => {
  let box = emptyOutbox(NOW)
  for (const cmd of ['gh pr comment 5 --body hi']) box = addOutbox(box, bashEffects(cmd))
  box = addOutbox(box, [mcp('slack_send_message')!])
  box = addOutbox(box, [mcp('slack_send_message')!])
  box = addOutbox(box, bashEffects('curl https://docs.example.com/a'))
  expect(outboxLine(box.items)).toBe('1 pull request comment to GitHub, 2 messages to Slack, 1 web request to docs.example.com')
  expect(outboxBand(box)).toBe('Sent: 1 pull request comment to GitHub, 2 messages to Slack')
  expect(outboxBand(addOutbox(emptyOutbox(NOW), bashEffects('curl https://docs.example.com/a')))).toBe('')
  let many = emptyOutbox(NOW)
  for (const host of ['a.example.com', 'b.example.com', 'c.example.com', 'd.example.com']) many = addOutbox(many, bashEffects(`curl -X POST https://${host}/x`))
  expect(outboxBand(many).length).toBeLessThanOrEqual(60)
  expect(outboxBand(many)).toMatch(/\+\d$/)
  expect(outboxText(box, true)).toMatch(/^This answer: 1 pull request comment to GitHub, 2 messages to Slack, 1 web request to docs.example.com\./)
  expect(outboxText({ ...box, open: false }, true)).toMatch(/^Last answer:/)
  expect(outboxText(undefined, true)).toMatch(/nothing has left this computer/)
  expect(outboxText(emptyOutbox(NOW), false)).toMatch(/outbox is off/)
  expect(parseOutbox(box)).toEqual(box)
  expect(parseOutbox('x')).toBeUndefined()
})

test('the away words: the switch, and the policy in plain words', () => {
  expect(parseAwayAsk('')).toEqual({ kind: 'status' })
  expect(parseAwayAsk('on')).toEqual({ kind: 'on' })
  expect(parseAwayAsk('OFF')).toEqual({ kind: 'off' })
  expect(parseAwayAsk('maybe')).toMatchObject({ kind: 'bad' })
  expect(awayText({ away: true, policy: 'careful', refused: [] })).toMatch(/Away is ON[\s\S]*Careful[\s\S]*Safe steps keep running/)
  expect(awayText({ away: true, policy: 'careful', refused: [] })).toMatch(/edits to protected files or outside your folders, odd new packages, weakened tests/)
  expect(awayText({ away: true, policy: 'off', refused: [] })).toMatch(/nothing is stopped/)
  expect(awayText({ away: false, policy: 'off', refused: ['x'] })).toMatch(/Last stopped:\nx/)
})

function memStore(on: On): Map<string, unknown> {
  const mem = new Map<string, unknown>()
  on('store.get', (_$, e) => ({ value: mem.get(e.key) }) as never)
  on('store.set', (_$, e) => {
    mem.set(e.key, e.value)
    return { value: undefined } as never
  })
  on('store.delete', (_$, e) => {
    mem.delete(e.key)
    return { value: undefined } as never
  })
  on('store.keys', () => ({ value: [...mem.keys()] }) as never)
  return mem
}

const out = { text: 'done' }
const sessionOf = { id: 'session-a' }

// The guard is the plugin's own hooks, so register.tsx must call registerGuard and registerGuardWorld.
async function setup(_$: EngineInterface, on: On): Promise<Map<string, unknown>> {
  mock.clock(on, { now: NOW })
  const mem = memStore(on)
  mock.session(on)
  mock.env(on, { HOME: '/home/user' })
  sessionOf.id = 'session-a'
  out.text = 'done'
  on('session.id', () => ({ value: sessionOf.id }))
  on('session.cwd', () => ({ value: '/home/user/app' }))
  on('session.root', () => ({ value: '/home/user/app' }))
  on('fs.read', () => {
    throw new Error('no such file')
  })
  on('process.run', () => ({ value: { exitCode: 1, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }) as never)
  on('tool.call', { tool: /^(?:Bash|Write|Edit|Read|Grep|WebFetch|mcp__srv__.*)$/ }, () => ({ result: { stdout: '', stderr: '', code: 0 }, text: out.text }) as never)
  on('ui.toast', () => ({ value: undefined }) as never)
  on('turn.start', (_$, e) => ({ turnId: e.turnId }))
  on('turn.complete', (_$, e) => ({ text: e.answer }))
  return mem
}

const set = (mem: Map<string, unknown>, key: string, value: string): void => void mem.set(`cockpit:setting:${key}`, value)
const whats = (mem: Map<string, unknown>): string[] => ((mem.get('cockpit:ledger:compact') ?? []) as Array<{ what: string }>).map(l => l.what)
const text = async ($: EngineInterface, command: string, args = ''): Promise<string> => ((await $.command.run({ ...viaParent(command, args), origin: { kind: 'composer' } } as never)) as { text: string }).text
// A change the person makes in Settings, once the plugin keeps the settings in one key: a raw store write would not be seen at once.
const change = ($: EngineInterface, key: string, value: string): Promise<string> => text($, 'vaken-settings', `${key} ${value}`)
const denied = (r: unknown): boolean => /"deny":/.test(JSON.stringify(r)) || /"isError":true/.test(JSON.stringify(r))
const SLACK = { tool: 'mcp__srv__slack_send_message', text: 'the secret plan', channel: 'general' }
const bandOf = (mem: Map<string, unknown>): Array<{ id: string; level: string; text: string }> => ((mem.get('cockpit:band:session-a') ?? []) as Array<{ id: string; level: string; text: string }>).filter(b => b.id === 'outbox')
const startTurn = ($: EngineInterface, turnId = 't1') => $.turn.start({ text: 'go', turnId })
const endTurn = ($: EngineInterface, turnId = 't1') => $.turn.complete({ answer: 'ok', durationMs: 1000, isAborted: false, turnId, reason: 'answer' } as never)

test('Warn (the default): the step runs, Claude reads what it did and where, a ledger line, and the same finding again has a line but no second note', SLOW, async ($, on) => {
  const mem = await setup($, on)
  const first = await $.tool.call(SLACK)
  expect(denied(first)).toBe(false)
  expect(JSON.stringify(first)).toMatch(/outside-actions check saw a risk in the step that just ran/)
  expect(JSON.stringify(first)).toMatch(/This would send a message in Slack: it changes something other people see\./)
  expect(JSON.stringify(first)).not.toMatch(/secret plan|general/)
  expect(whats(mem)).toEqual(['Warned before an action outside your computer'])
  const again = await $.tool.call(SLACK)
  expect(JSON.stringify(again)).not.toMatch(/saw a risk/)
  expect(whats(mem).length).toBe(2)
  expect(JSON.stringify([...mem.entries()])).not.toMatch(/secret plan|general/)
})

test('reads and local calls pass without a note or a ledger line, and Off checks nothing', SLOW, async ($, on) => {
  const mem = await setup($, on)
  for (const call of [{ tool: 'mcp__srv__slack_read_channel', channel: 'x' }, { tool: 'Bash', command: 'curl https://api.example.com/x' }, { tool: 'Bash', command: 'gh pr view 3' }, { tool: 'Bash', command: 'curl -X POST http://localhost:3000/x' }] as const) {
    expect(JSON.stringify(await $.tool.call(call))).not.toMatch(/vaken/)
  }
  expect(whats(mem)).toEqual([])
  set(mem, 'guard.world', 'off')
  expect(JSON.stringify(await $.tool.call(SLACK))).not.toMatch(/saw a risk/)
  expect(whats(mem)).toEqual([])
})

test('Hold: the step is refused with what it would do and where, and the way out; one ledger line however often it is tried', async ($, on) => {
  const mem = await setup($, on)
  set(mem, 'guard.world', 'hold')
  const a = await $.tool.call(SLACK)
  expect(denied(a)).toBe(true)
  expect(JSON.stringify(a)).toMatch(/outside-actions check stopped this step/)
  expect(JSON.stringify(a)).toMatch(/This would send a message in Slack: it changes something other people see\./)
  expect(JSON.stringify(a)).toMatch(/\/vaken-guard allow once/)
  expect(JSON.stringify(a)).not.toMatch(/secret plan|general/)
  expect(denied(await $.tool.call(SLACK))).toBe(true)
  expect(whats(mem)).toEqual(['Held an action outside your computer'])
  const sh = await $.tool.call({ tool: 'Bash', command: 'gh pr merge 12 --squash' })
  expect(denied(sh)).toBe(true)
  expect(JSON.stringify(sh)).toMatch(/This would merge a pull request in GitHub/)
  expect(denied(await $.tool.call({ tool: 'Bash', command: 'curl -X DELETE https://api.example.com/a/1' }))).toBe(true)
  expect(denied(await $.tool.call({ tool: 'Bash', command: 'gh pr view 12' }))).toBe(false)
})

test('/vaken-guard allow once lets the single next stopped step through (the same yes as the first guard), then holds again', SLOW, async ($, on) => {
  const mem = await setup($, on)
  set(mem, 'guard.world', 'hold')
  expect(denied(await $.tool.call(SLACK))).toBe(true)
  await text($, 'vaken-guard', 'allow once')
  const r = await $.tool.call(SLACK)
  expect(denied(r)).toBe(false)
  expect(JSON.stringify(r)).toMatch(/person allowed it once/)
  expect(denied(await $.tool.call(SLACK))).toBe(true)
  for (const w of ['Held an action outside your computer', 'Let a stopped step through']) expect(whats(mem)).toContain(w)
})

test('the outbox: per turn, kinds and places, a band line at the end if something changed outside, nothing of the content', async ($, on) => {
  const mem = await setup($, on)
  await startTurn($)
  await $.tool.call(SLACK)
  await $.tool.call({ tool: 'Bash', command: 'gh pr comment 5 --body "private words"' })
  await $.tool.call({ tool: 'Bash', command: 'curl https://docs.example.com/a' })
  expect(await text($, 'vaken-outbox')).toMatch(/^This answer: 1 message to Slack, 1 pull request comment to GitHub, 1 web request to docs.example.com\./)
  await endTurn($)
  expect(await text($, 'vaken-outbox')).toMatch(/^Last answer: 1 message to Slack/)
  expect(bandOf(mem).map(b => [b.id, b.level, b.text])).toEqual([['outbox', 'warn', 'Sent: 1 message to Slack, 1 pull request comment to GitHub']])
  expect(JSON.stringify([...mem.entries()])).not.toMatch(/secret plan|private words|general/)
  await startTurn($, 't2')
  expect(bandOf(mem)).toEqual([])
  expect(await text($, 'vaken-outbox')).toMatch(/nothing has left/)
})

test('the outbox counts a stopped step as not sent, a read-only turn leaves no band line, and Off records nothing', async ($, on) => {
  const mem = await setup($, on)
  set(mem, 'guard.world', 'hold')
  await startTurn($)
  await $.tool.call(SLACK)
  await $.tool.call({ tool: 'Bash', command: 'curl https://docs.example.com/a' })
  await endTurn($)
  expect(await text($, 'vaken-outbox')).toMatch(/^Last answer: 1 web request to docs.example.com\./)
  expect(bandOf(mem)).toEqual([])
  set(mem, 'guard.outbox', 'off')
  await startTurn($, 't2')
  await $.tool.call({ tool: 'Bash', command: 'git push origin main' })
  await endTurn($, 't2')
  expect(await text($, 'vaken-outbox')).toMatch(/outbox is off/)
  expect(bandOf(mem)).toEqual([])
})

test('Secret tripwire in Warn: a secret file read, a printed environment, a key in a command or in a result are told to Claude by kind, never by value', async ($, on) => {
  const mem = await setup($, on)
  const read = await $.tool.call({ tool: 'Read', file_path: '/home/user/app/.env' })
  expect(denied(read)).toBe(false)
  expect(JSON.stringify(read)).toMatch(/secret tripwire saw a risk/)
  expect(JSON.stringify(read)).toMatch(/Read tool is about to open an env file/)
  expect(JSON.stringify(await $.tool.call({ tool: 'Read', file_path: '/home/user/app/.env.example' }))).not.toMatch(/tripwire/)
  expect(JSON.stringify(await $.tool.call({ tool: 'Bash', command: 'cat .env' }))).toMatch(/cat would print the inside of an env file/)
  const cmd = await $.tool.call({ tool: 'Bash', command: `curl -H "Authorization: Bearer ${GH_TOKEN}" https://api.example.com/x` })
  expect(JSON.stringify(cmd)).toMatch(/GitHub-style token/)
  expect(JSON.stringify(cmd)).toMatch(/Do not repeat a secret/)
  out.text = `DB line\nAWS_KEY=${AWS_KEY}\n`
  const result = await $.tool.call({ tool: 'Bash', command: 'python show.py' })
  expect(denied(result)).toBe(false)
  expect(JSON.stringify(result)).toMatch(/what the step returned/)
  expect(JSON.stringify(result)).toMatch(/AWS-style key id/)
  expect(whats(mem)).toEqual(['Warned about a secret', 'Warned about a secret', 'Warned about a secret', 'Warned about a secret'])
  // What the tool itself answered is its own; what the cockpit said and kept must hold no secret.
  const said = [read, cmd, result].map(r => JSON.stringify((r as { context?: string[] }).context))
  expect(JSON.stringify([said, [...mem.entries()]])).not.toMatch(new RegExp(`${AWS_KEY}|${GH_TOKEN.slice(0, 12)}`))
})

test('Secret tripwire in Hold: a secret file is not read until allowed once; a result with a key is withheld; the key is never shown or kept', async ($, on) => {
  const mem = await setup($, on)
  set(mem, 'guard.secrets', 'hold')
  const read = await $.tool.call({ tool: 'Read', file_path: '/home/user/.ssh/id_rsa' })
  expect(denied(read)).toBe(true)
  expect(JSON.stringify(read)).toMatch(/secret tripwire stopped this step/)
  expect(JSON.stringify(read)).toMatch(/a private key file/)
  await text($, 'vaken-guard', 'allow once')
  expect(denied(await $.tool.call({ tool: 'Read', file_path: '/home/user/.ssh/id_rsa' }))).toBe(false)
  out.text = `token=${GH_TOKEN}`
  const withheld = await $.tool.call({ tool: 'Bash', command: 'python show.py' })
  expect(denied(withheld)).toBe(true)
  expect(JSON.stringify(withheld)).toMatch(/withheld this result/)
  expect(JSON.stringify(withheld)).toMatch(/GitHub-style token/)
  const sentKey = await $.tool.call({ tool: 'mcp__srv__slack_send_message', text: `use ${AWS_KEY}` })
  expect(denied(sentKey)).toBe(true)
  expect(JSON.stringify(sentKey)).toMatch(/AWS-style key id/)
  expect(whats(mem)).toContain('Held a step that touches a secret')
  expect(JSON.stringify([withheld, sentKey, [...mem.entries()]])).not.toMatch(new RegExp(`${AWS_KEY}|${GH_TOKEN.slice(0, 12)}`))
})

test('Secrets Off checks nothing', async ($, on) => {
  const mem = await setup($, on)
  set(mem, 'guard.secrets', 'off')
  out.text = `K=${AWS_KEY}`
  expect(JSON.stringify(await $.tool.call({ tool: 'Read', file_path: '/home/user/app/.env' }))).not.toMatch(/tripwire/)
  expect(whats(mem)).toEqual([])
})

test('Away policy: while away and Careful, a step the guard would flag is refused by itself; safe steps run; no allow once; nothing the guard would allow is refused', async ($, on) => {
  const mem = await setup($, on)
  expect(await text($, 'vaken-away', 'on')).toMatch(/Away is ON/)
  await change($, 'away.policy', 'off')
  expect(denied(await $.tool.call(SLACK))).toBe(false)
  await change($, 'away.policy', 'careful')
  const r = await $.tool.call(SLACK)
  expect(denied(r)).toBe(true)
  expect(JSON.stringify(r)).toMatch(/You are away; vaken stopped a risky step\. It waits for you\./)
  expect(JSON.stringify(r)).not.toMatch(/secret plan|general/)
  expect(denied(await $.tool.call({ tool: 'Bash', command: 'gh pr merge 4' }))).toBe(true)
  expect(denied(await $.tool.call({ tool: 'Read', file_path: '/home/user/app/.env' }))).toBe(true)
  expect(denied(await $.tool.call({ tool: 'Bash', command: 'git reset --hard HEAD~2' }))).toBe(true)
  expect(denied(await $.tool.call({ tool: 'Edit', file_path: '/home/user/.zshrc', old_string: 'a', new_string: 'b' }))).toBe(true)
  for (const call of [{ tool: 'Bash', command: 'ls' }, { tool: 'Read', file_path: '/home/user/app/a.ts' }, { tool: 'Edit', file_path: '/home/user/app/a.ts', old_string: 'a', new_string: 'b' }, { tool: 'Bash', command: 'npm test' }, { tool: 'Bash', command: 'curl https://api.example.com/x' }, { tool: 'mcp__srv__slack_read_channel', channel: 'x' }] as const) {
    expect(denied(await $.tool.call(call)), JSON.stringify(call)).toBe(false)
  }
  expect(whats(mem).filter(w => w === 'Refused a risky step while away').length).toBe(5)
  await change($, 'guard.world', 'hold')
  await text($, 'vaken-guard', 'allow once')
  expect(denied(await $.tool.call(SLACK))).toBe(true)
  expect(mem.has('cockpit:guard:allow:session-a')).toBe(true)
  await change($, 'guard.world', 'off')
  await change($, 'guard.destructive', 'off')
  expect(denied(await $.tool.call(SLACK))).toBe(false)
  expect(denied(await $.tool.call({ tool: 'Bash', command: 'git reset --hard HEAD~2' }))).toBe(false)
  expect(await text($, 'vaken-away')).toMatch(/Last stopped:/)
  const band = (mem.get('cockpit:band:session-a') ?? []) as Array<{ id: string; text: string }>
  expect(band.some(b => b.id === 'away')).toBe(true)
  expect(await text($, 'vaken-away', 'off')).toMatch(/Away is off/)
  await change($, 'guard.world', 'warn')
  expect(denied(await $.tool.call(SLACK))).toBe(false)
  expect(mem.has('cockpit:away')).toBe(false)
  expect((mem.get('cockpit:band:session-a') as Array<{ id: string }>).some(b => b.id === 'away')).toBe(false)
  expect(await text($, 'vaken-away', 'sideways')).toMatch(/^Use:/)
  for (const w of ['Turned on away mode', 'Turned off away mode', 'Refused a risky step while away']) expect(whats(mem)).toContain(w)
})

test('every ledger line this block writes is an action (did) with a plain title from its list', async ($, on) => {
  const mem = await setup($, on)
  await $.tool.call(SLACK)
  await $.tool.call({ tool: 'Read', file_path: '/home/user/app/.env' })
  set(mem, 'guard.world', 'hold')
  await $.tool.call({ tool: 'Bash', command: 'gh pr merge 1' })
  await text($, 'vaken-away', 'on')
  set(mem, 'away.policy', 'careful')
  await $.tool.call({ tool: 'Bash', command: 'gh pr merge 2' })
  await text($, 'vaken-away', 'off')
  const list = (mem.get('cockpit:ledger:compact') ?? []) as Array<{ what: string; did?: boolean; session?: string }>
  expect(list.length).toBe(7)
  for (const l of list) {
    expect(l.did).toBe(true)
    expect(l.session).toBe('session-a')
    expect([...GUARDWORLD_WHATS, 'Let a stopped step through', 'Ended away mode with a digest']).toContain(l.what)
  }
})

test('a held outside action points to /vaken-undo last when copies were kept since the last message', async ($, on) => {
  const mem = await setup($, on)
  set(mem, 'guard.world', 'hold')
  const bare = await $.tool.call(SLACK)
  expect(denied(bare)).toBe(true)
  expect(JSON.stringify(bare)).not.toMatch(/vaken-undo last/)
  mem.set('cockpit:undo:index:session-a', { next: 2, snaps: [{ id: 1, path: '/home/user/app/a.ts', at: NOW, tool: 'Edit', kind: 'saved', hash: 'h', bytes: 1, lines: 1 }] })
  const offered = await $.tool.call(SLACK)
  expect(JSON.stringify(offered)).toMatch(/\/vaken-undo last/)
})
