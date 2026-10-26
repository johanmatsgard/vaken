// The step words of a stopped step: what the step does in the guard's terms (stepSaid), the risky ones amber, secrets never in the line.
// Claude Code's own "Allow?" question is not answered or explained by vaken (the band line, the allow rule offer and the PermissionRequest hook are gone).
import { expect } from 'claude-code/testing'
import { test } from './slow'

import { askWords, folderOf, stepSaid } from '../hooks/core/allowrules'
import type { AskView } from '../hooks/core/allowrules'
import { setLang } from '../hooks/core/lang'
import { BAND_MARK_PT, TEXT_CHAR_PT } from '../hooks/ui/tokens'

const ENV = { home: '/home/user', cwd: '/w/app', root: '/w/app' }
const THREE = ['/w/app/build/a.js', '/w/app/build/b.js', '/w/app/build/c.js']
const line = (tool: string, args: Record<string, unknown>, changed: string[] = []): { view: AskView; risky: boolean } => {
  const s = stepSaid(tool, args, ENV, changed)
  return { view: { said: s.said }, risky: s.risky }
}
const text = (tool: string, args: Record<string, unknown>, changed: string[] = []): string => askWords(line(tool, args, changed).view).text

test('a delete says how many files and in which folder, in English and Swedish', () => {
  const v = line('Bash', { command: 'rm build/a.js build/b.js build/c.js' }, THREE)
  expect(askWords(v.view).text).toBe('Deletes 3 files in build/.')
  expect(v.risky).toBe(false)
  setLang('sv')
  try {
    expect(askWords(v.view).text).toBe('Tar bort 3 filer i build/.')
  } finally {
    setLang('en')
  }
  expect(text('Bash', { command: 'rm build/a.js' }, [THREE[0]])).toBe('Deletes 1 file in build/.')
})

test('a recursive delete of a folder says the folder and everything in it, and is risky, however few files were counted', () => {
  const v = line('Bash', { command: 'rm -rf ../shared/build' }, ['/w/shared/build'])
  expect(askWords(v.view).text).toBe('Deletes the folder shared/build/ and everything in it.')
  expect(v.risky).toBe(true)
  // Inside the project, a trailing slash or star, and the long flag say the same
  for (const command of ['rm -r build/', 'rm -R build/*', 'rm --recursive -f build']) expect(text('Bash', { command })).toBe('Deletes the folder build/ and everything in it.')
  expect(line('Bash', { command: 'rm -r build' }).risky).toBe(true)
  // A plain rm of files keeps its count
  expect(text('Bash', { command: 'rm build/a.js' }, [THREE[0]])).toBe('Deletes 1 file in build/.')
  setLang('sv')
  try {
    expect(askWords(v.view).step).toBe('Tar bort mappen shared/build/ och allt i den.')
  } finally {
    setLang('en')
  }
})

test('each kind of step says what it does in the guard\'s terms', () => {
  expect(text('Bash', { command: 'cat README.md' })).toBe('Only reads. Nothing changes.')
  expect(text('Bash', { command: 'npm test' })).toBe('Runs the tests.')
  expect(text('Bash', { command: 'npm run build' })).toBe('Builds or checks the code.')
  expect(text('Bash', { command: 'git commit -m "x"' })).toBe('Runs git commit.')
  expect(text('Edit', { file_path: '/w/app/src/login/form.ts' }, ['/w/app/src/login/form.ts'])).toBe('Edits login/form.ts.')
  expect(text('WebFetch', { url: 'https://docs.example.com/page?a=1' })).toBe('Reads a web page from docs.example.com.')
  expect(text('mcp__notes__search', {})).toBe('Uses notes search.')
  expect(folderOf(['/w/app/a.txt', '/w/app/b.txt'], '/w/app')).toBe('app/')
  expect(folderOf(['/w/app/src/a/x.ts', '/w/app/src/b/y.ts'], '/w/app')).toBe('src/')
})

test('the guard\'s risky steps are risky; secrets never reach the line', () => {
  for (const c of ['git push --force origin main', 'git reset --hard HEAD~3', 'rm -rf src', 'npx prisma migrate deploy']) {
    const s = stepSaid('Bash', { command: c }, ENV, [])
    expect([c, s.risky]).toEqual([c, true])
  }
  expect(stepSaid('Edit', { file_path: '/w/app/.claude/settings.json' }, ENV, []).risky).toBe(true)
  expect(stepSaid('Edit', { file_path: '/w/other/a.ts' }, ENV, []).risky).toBe(true)
  const token = `ghp_${'a'.repeat(36)}`
  const s = stepSaid('Bash', { command: `curl -H "Authorization: token ${token}" https://api.example.com` }, ENV, [])
  expect(JSON.stringify(s)).not.toContain(token)
  expect(askWords({ said: s.said }).text).not.toContain(token)
})

test('a step that reaches outside says it in short fixed words that fit one line at 288 pt, in English and Swedish', () => {
  const step = (tool: string, args: Record<string, unknown>): string => askWords(line(tool, args).view).step
  const cases: Array<[string, Record<string, unknown>, string]> = [
    ['Bash', { command: 'git push origin main' }, 'Pushes to a git remote.'],
    ['Bash', { command: 'docker push app:1' }, 'Pushes to a container registry.'],
    ['Bash', { command: 'kubectl apply -f x.yaml' }, 'Changes a Kubernetes cluster.'],
    ['Bash', { command: 'terraform apply' }, 'Changes your infrastructure.'],
    ['Bash', { command: 'stripe charges create --amount 5' }, 'Changes Stripe.'],
    ['Bash', { command: 'sendmail -s hello' }, 'Reaches outside with sendmail.'],
  ]
  for (const [tool, args, want] of cases) expect([args.command, step(tool, args)]).toEqual([args.command, want])
  const all: Array<[string, Record<string, unknown>]> = [...cases.map(([t, a]): [string, Record<string, unknown>] => [t, a]), ['Bash', { command: 'scp a.txt a-very-long-host-name-of-a-machine.example.test:/tmp' }], ['Bash', { command: 'npm publish' }]]
  for (const lang of ['en', 'sv'] as const) {
    setLang(lang)
    try {
      for (const [tool, args] of all) {
        const l = line(tool, args)
        expect([lang, args.command, l.risky, askWords(l.view).step.length * TEXT_CHAR_PT + BAND_MARK_PT <= 288]).toEqual([lang, args.command, true, true])
      }
    } finally {
      setLang('en')
    }
  }
  setLang('sv')
  try {
    expect(step('Bash', { command: 'git push origin main' })).toBe('Skickar till ett git-fjärrarkiv.')
    expect(step('Bash', { command: 'kubectl apply -f x.yaml' })).toBe('Ändrar ett Kubernetes-kluster.')
  } finally {
    setLang('en')
  }
})
