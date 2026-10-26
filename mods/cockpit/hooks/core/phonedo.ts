// Runs a command from Claude's last answer: finds and numbers the shell blocks, judges each safe, risky or blocked, masks secrets and cuts output. The commands are kept in memory only, never in the store.
import type { Io } from './io'
import { sentence } from './guarddestroy'
import type { ProcPlatform } from './procs'
import { judgeTool } from './guardjudge'
import type { Env, Modes } from './guardjudge'
import { checkSecretRead, maskSecrets, scanSecrets } from './guardsecrets'
import { checkWindows } from './guardwin'
import type { Setting } from './settings'
import {
  DO_GROUP, DO_SETTING_LABEL, DO_SETTING_NOTE, DO_T_BAD, DO_T_BLOCK, DO_T_BLOCKED, DO_T_CHANGED, DO_T_CUT, DO_T_FAILED, DO_T_HEAD, DO_T_MORE, DO_T_NEEDYES, DO_T_NOOUT, DO_T_NONE, DO_T_NOSUCH, DO_T_OFF, DO_T_OUTPUT,
  DO_T_RAN, DO_T_TIMEOUT, DO_T_TYPE_RISKY, DO_T_TYPE_SAFE, DO_V_BLOCKED, DO_V_RISKY, DO_V_SAFE, DO_W_DELETE, DO_W_DEPLOY, DO_W_DEVICE, DO_W_EVAL, DO_W_FETCH, DO_W_GIT, DO_W_GUARD, DO_W_HIDDEN, DO_W_INSTALL, DO_W_OUTSIDE,
  DO_W_PERMS, DO_W_PIPE, DO_W_SAFE, DO_W_SECRET, DO_W_SUDO, DO_W_WIPE, DO_W_WRITE,
} from './dowords'

export const DO_W_CODE = 'It runs code or changes files.'


export const DO_TIMEOUT_MS = 120_000
export const DO_OUTPUT_LINES = 40
export const DO_OUTPUT_CHARS = 4_000
export const DO_TELL_LINES = 20
export const DO_TELL_CHARS = 2_000
export const DO_MAX_BLOCKS = 9
export const DO_ANSWER_CHARS = 200_000
export const DO_FIRST_CHARS = 60
export const DO_CARD_ROWS = 4
export const DO_LIST_ROWS = 9

export type DoMode = 'off' | 'ask'
export const DO_SETTINGS: Setting[] = [
  {
    key: 'do.mode',
    group: DO_GROUP,
    label: DO_SETTING_LABEL,
    note: DO_SETTING_NOTE,
    options: [
      { value: 'ask', label: 'Ask' },
      { value: 'off', label: 'Off' },
    ],
    default: 'ask',
  },
]
export const doModeOf = (v: unknown): DoMode => (v === 'off' ? 'off' : 'ask')


export type Verdict = 'safe' | 'risky' | 'blocked'
// `outside`: quoted from outside text or of unsure origin.
export type RawBlock = { lang: string; commands: string[]; outside: boolean }
// `script` is exactly what would run.
export type DoBlock = { n: number; script: string; first: string; verdict: Verdict; why: string[]; outside: boolean }

const SHELL_LANGS = new Set(['bash', 'sh', 'zsh', 'shell', 'shellscript', 'console', 'terminal', 'shell-session', 'shellsession'])
const PROMPT_LANGS = new Set(['console', 'terminal', 'shell-session', 'shellsession'])
// An untagged block counts only when it looks like a command.

const KNOWN_PROGRAMS = new Set([
  'npm', 'npx', 'pnpm', 'yarn', 'bun', 'node', 'deno', 'git', 'gh', 'ls', 'cd', 'cat', 'grep', 'rg', 'find', 'mkdir', 'rm', 'cp', 'mv', 'echo', 'curl', 'wget', 'python', 'python3', 'pip', 'pip3', 'make', 'cargo', 'go',
  'docker', 'kubectl', 'brew', 'claude', 'tsc', 'jest', 'vitest', 'pytest', 'bash', 'sh', 'zsh', 'touch', 'head', 'tail', 'wc', 'sed', 'awk', 'chmod', 'open', 'code', 'export', 'source', 'which', 'pwd', 'ps', 'kill', 'lsof',
  'tar', 'unzip', 'sort', 'diff', 'env', 'printenv', 'date', 'uname', 'df', 'du', 'ssh', 'scp', 'rsync', 'terraform', 'ruby', 'bundle', 'rake', 'php', 'composer', 'swift', 'xcodebuild', 'sudo', 'mvn', 'gradle', 'dotnet',
])
// Windows names for programs that LOOK or INSTALL. System-changing ones (schtasks, reg, netsh, sc, bcdedit, Set-ExecutionPolicy, icacls, takeown) are left out on purpose, so such a block is never taken for a command by its first word. Compared in lower case.
const WIN_PROGRAMS = new Set([
  'powershell', 'pwsh', 'cmd', 'where', 'winget', 'choco', 'scoop', 'tasklist', 'dir', 'type', 'findstr', 'copy', 'move', 'del', 'ren', 'md', 'cls', 'ipconfig', 'hostname', 'whoami',
  'get-childitem', 'get-content', 'get-location', 'set-location', 'get-process', 'get-command', 'get-item', 'get-date', 'select-string', 'test-path', 'write-output', 'write-host', 'new-item', 'remove-item',
  'copy-item', 'move-item', 'invoke-webrequest', 'invoke-restmethod', 'iwr', 'irm', 'stop-process', 'start-process', 'set-content', 'out-file',
])
// A Mac has no PowerShell, so these count only on Windows.
const WIN_SHELL_LANGS = new Set(['powershell', 'pwsh', 'ps1', 'posh', 'pwsh-session', 'powershell-session'])
const NOT_SHELL = /^(?:[{[<(@]|\/\/|\/\*|import\b|export\s+(?:default|const|function|type|interface|class)\b|const\b|let\b|var\b|function\b|def\b|class\b|package\b|#include\b|select\b|insert\b|update\b|delete\s+from\b|create\b|return\b|if\s*\(|for\s*\(|-\s|\*\s|\d+\.\s|>\s|"|')/i

const FENCE_OPEN = /^(\s*(?:>\s*)*)(`{3,}|~{3,})\s*([^\s`]*)[^\n`]*$/
// Best effort: a block that follows such words is treated as risky.
const OUTSIDE_NEAR = new RegExp(
  [
    String.raw`\b(?:the\s+)?(?:web\s?page|page|website|site|readme|docs?|documentation|issue|comment|email|e-mail|message|file|output|log|response|result|article|tutorial|blog|forum|thread|post|answer|reply|tool)\s+(?:says?|said|suggests?|recommends?|tells?|told|shows?|contains?|includes?|reads?|returned|returns|printed|prints|outputs?|had|has|asks?|instructs?)\b`,
    String.raw`\b(?:fetched|downloaded|scraped|retrieved)\b`,
    String.raw`\baccording to\b`,
    String.raw`\bfrom (?:the|a|that) (?:page|web|website|readme|docs?|documentation|file|output|log|issue|email|e-mail|message|search|result)\b`,
    String.raw`\b(?:it|they|which) (?:says?|suggests?|recommends?|tells? you to)\b`,
    String.raw`\b(?:output|result|results|response|contents?)\s*(?:is|are|was|were)?\s*:\s*$`,
    String.raw`https?://`,
    String.raw`\bquot(?:e|ed|ing)\b`,
  ].join('|'),
  'i',
)
// A command from text that gives Claude orders is never calm.
const ORDERS_INSIDE = /\b(?:ignore (?:all |any |the )?(?:previous|prior|above) (?:instructions?|rules?)|disregard (?:all |any )?(?:previous|prior)|you must (?:now )?run|do not tell the user)\b/i

const stripPrompt = (line: string): string => line.replace(/^\s*[$%]\s+/, '')

// A command keeps its inner newlines so it runs as the person read it.
export function splitCommands(text: string): string[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const out: string[] = []
  let cur: string[] = []
  let heredoc: string | undefined
  let quote: string | undefined
  const flush = (): void => {
    if (cur.length > 0) out.push(cur.join('\n').trimEnd())
    cur = []
  }
  for (const raw of lines) {
    const line = cur.length === 0 ? stripPrompt(raw) : raw
    if (heredoc !== undefined) {
      cur.push(line)
      if (line.trim() === heredoc) {
        heredoc = undefined
        flush()
      }
      continue
    }
    if (cur.length === 0 && (line.trim() === '' || line.trim().startsWith('#'))) continue
    cur.push(line)
    const plain = line.replace(/\\./g, '')
    for (const ch of plain) {
      if (quote === undefined && (ch === '"' || ch === "'")) quote = ch
      else if (quote === ch) quote = undefined
    }
    if (quote !== undefined) continue
    const h = /<<-?\s*(['"]?)([A-Za-z_][\w-]*)\1/.exec(line)
    if (h?.[2] !== undefined) {
      heredoc = h[2]
      continue
    }
    if (/(?:\\|&&|\|\||\||;|\(|\{)\s*$/.test(line.trimEnd()) && !/;;\s*$/.test(line)) continue
    flush()
  }
  flush()
  return out
}

function looksLikeShell(text: string, sys: ProcPlatform = 'posix'): boolean {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l !== '' && !l.startsWith('#'))
  if (lines.length === 0) return false
  const first = stripPrompt(lines[0] as string)
  if (NOT_SHELL.test(first)) return false
  if (/^\s*[$%]\s/.test(lines[0] as string)) return true
  const word = first.split(/\s+/)[0] ?? ''
  // On Windows a program may be named by a backslash path and with .exe or .cmd (git.exe, C:\tools\npm.cmd).
  const base = sys === 'win32' ? word.replace(/^.*[\\/]/, '').replace(/\.(exe|cmd|bat)$/i, '').toLowerCase() : word.includes('/') ? (word.split('/').pop() ?? '') : word
  if (/^[A-Z_][A-Z0-9_]*=/.test(word)) return true
  if (sys === 'win32' && (WIN_PROGRAMS.has(word.replace(/^.*[\\/]/, '').replace(/\.exe$/i, '').toLowerCase()) || /^\$[A-Za-z_][\w:]*\s*=/.test(first) || /^\$env:/i.test(first))) return true
  if (sys === 'win32' && (/^[A-Za-z]:[\\/]/.test(word) || word.startsWith('.\\'))) return word.startsWith('.\\') || KNOWN_PROGRAMS.has(base)
  if (word.startsWith('./') || word.startsWith('~/') || word.startsWith('/')) return word.startsWith('./') || word.startsWith('~/') || KNOWN_PROGRAMS.has(base)
  return KNOWN_PROGRAMS.has(base)
}

function consoleCommands(text: string): string {
  const lines = text.split(/\r?\n/)
  if (!lines.some(l => /^\s*[$%]\s/.test(l))) return text
  const out: string[] = []
  let joined = false
  for (const l of lines) {
    if (/^\s*[$%]\s/.test(l)) {
      out.push(l)
      joined = /(?:\\|&&|\|\||\|)\s*$/.test(l.trimEnd())
    } else if (joined) {
      out.push(l)
      joined = /(?:\\|&&|\|\||\|)\s*$/.test(l.trimEnd())
    }
  }
  return out.join('\n')
}

export function findBlocks(answer: string, sys: ProcPlatform = 'posix', dropped?: { n: number }): RawBlock[] {
  const text = answer.length > DO_ANSWER_CHARS ? answer.slice(0, DO_ANSWER_CHARS) : answer
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const found: RawBlock[] = []
  let at = 0
  let prevEnd = 0
  while (at < lines.length) {
    const open = FENCE_OPEN.exec(lines[at] as string)
    if (open === null) {
      at += 1
      continue
    }
    const quoted = /^\s*>/.test(open[1] ?? '')
    const fence = open[2] as string
    const lang = (open[3] ?? '').toLowerCase()
    const body: string[] = []
    let end = at + 1
    while (end < lines.length) {
      const l = (lines[end] as string).replace(/^\s*(?:>\s*)*/, '')
      if (l.trimEnd().startsWith(fence) && l.trim().replace(new RegExp(`^\\${fence[0]}+`), '') === '') break
      body.push((lines[end] as string).replace(/^\s*(?:>\s*)+/, ''))
      end += 1
    }
    const closed = end < lines.length
    const rawText = body.join('\n')
    const shellLang = SHELL_LANGS.has(lang) || (sys === 'win32' && WIN_SHELL_LANGS.has(lang))
    const isShell = shellLang || (lang === '' && looksLikeShell(rawText, sys))
    if (isShell && closed) {
      const script = PROMPT_LANGS.has(lang) ? consoleCommands(rawText) : rawText
      const commands = splitCommands(script)
      if (commands.length > 0) {
        const before = lines.slice(Math.max(prevEnd, at - 4), at).join('\n')
        const unsure = lang === '' || PROMPT_LANGS.has(lang)
        const outside = quoted || OUTSIDE_NEAR.test(before) || ORDERS_INSIDE.test(rawText) || (unsure && /\boutput\b/i.test(before))
        found.push({ lang, commands, outside })
      }
    }
    prevEnd = closed ? end + 1 : lines.length
    at = closed ? end + 1 : lines.length
  }
  if (dropped !== undefined) dropped.n = Math.max(0, found.length - DO_MAX_BLOCKS)
  return found.slice(0, DO_MAX_BLOCKS)
}


type Rule = { re: RegExp; why: string }
// sudo and su are blocked on purpose.
export const BLOCKED_RULES: Rule[] = [
  { re: /(?:^|[\s;&|(`])(?:sudo|doas)(?:\s|$)/, why: DO_W_SUDO },
  { re: /(?:^|[;&|(`]\s*)su(?:\s|$)/m, why: DO_W_SUDO },
  { re: /\bmkfs(?:\.\w+)?\b|\bdd\b[^\n|;&]*\bof=\/dev\/|>\s*\/dev\/(?:sd|disk|nvme|hd)|:\(\)\s*\{|\b(?:shutdown|reboot|poweroff)\b/, why: DO_W_DEVICE },
  // Also quoted, with long flags, and in the forms Git Bash takes.
  { re: /\brm\s+(?:--?[a-zA-Z-]+\s+)+["']?(?:\/|~|\$HOME|\$\{HOME\}|\$USERPROFILE|\$\{USERPROFILE\}|%USERPROFILE%|[A-Za-z]:|\/[A-Za-z](?=[\/"'\s]|$))(?:[\\/]?\*?)["']?(?:\s|$)/, why: DO_W_WIPE },
]
// Windows only. Wiping a drive or the home folder, a disk tool or a shutdown is blocked; anything system-changing needs yes yes.
export const WIN_BLOCKED_RULES: Rule[] = [
  { re: /\b(?:format-volume|clear-disk|initialize-disk|remove-partition|restart-computer|stop-computer)\b|\bformat\s+[a-z]:|\bdiskpart\b|\bbcdedit\b|(?:^|[\s;&|(`])shutdown(?:\.exe)?\s+\/[a-z]/im, why: DO_W_DEVICE },
  { re: /(?:^|[\s;&|(`])(?:remove-item|ri|rm|del|erase|rd|rmdir)\s+(?:[^\n;&|]*\s)?["']?(?:[a-z]:[\\/]?|~[\\/]?|\$(?:env:userprofile|home|env:systemroot|env:windir)[\\/]?)\*?["']?(?=\s|$|[;&|])/im, why: DO_W_WIPE },
]
export const WIN_RISKY_RULES: Rule[] = [
  { re: /\b(?:winget|choco|scoop)\s+(?:install|uninstall|upgrade|remove|update)\b|\b(?:install|uninstall)-(?:module|package|script|windowsfeature)\b/i, why: DO_W_INSTALL },
  { re: /\b(?:invoke-webrequest|invoke-restmethod|iwr|irm|start-bitstransfer|curl\.exe)\b|\bcertutil\s+-urlcache\b/i, why: DO_W_FETCH },
  { re: /\|\s*(?:iex|invoke-expression|powershell|pwsh|cmd)\b|\b(?:iex|invoke-expression)\b/i, why: DO_W_PIPE },
  { re: /(?:^|[\s;&|(`])(?:remove-item|ri|del|erase|rd|rmdir|move-item|mi|ren|rename-item|rni|clear-content|clear-item)(?:\s|$)|(?:^|[;&|]\s*)move\s+\S/im, why: DO_W_DELETE },
  { re: /\b(?:set-content|add-content|out-file|new-item|copy-item|cpi|xcopy|robocopy|export-csv|tee-object)\b|(?:^|[^>&\d<])>>?(?!&|\s*\$null)\s*[^\s&|;]/i, why: DO_W_WRITE },
  { re: /(?:^|[\s;&|(`])(?:stop-process|taskkill|set-acl|icacls|takeown|attrib|schtasks|reg|regedit|netsh|sc|net|set-executionpolicy|set-itemproperty|new-itemproperty|remove-itemproperty|set-service|stop-service|set-mppreference|setx)(?:\.exe)?(?=\s|$)/im, why: DO_W_PERMS },
  { re: /\b(?:ssh|scp|kubectl|docker|terraform|az|aws|gcloud|vercel|netlify|firebase|flyctl|heroku|wrangler)\b|\b(?:enter-pssession|invoke-command|new-pssession)\b/i, why: DO_W_DEPLOY },
  { re: /\b(?:start-process|invoke-item|add-type)\b|-verb\s+runas\b|\s-enc(?:odedcommand)?\s|(?:^|[;&|]\s*)&\s+\S|(?:^|[;&|]\s*)\.\s+\S/im, why: DO_W_EVAL },
]

export const RISKY_RULES: Rule[] = [
  { re: /\b(?:npm|pnpm|yarn|bun)\s+(?:i|install|add|ci|update|upgrade|remove|uninstall|link|publish|exec|dlx)\b|\bnpx\b|\bpip3?\s+(?:install|uninstall)\b|\bbrew\s+(?:install|uninstall|upgrade|reinstall)\b|\b(?:gem|cargo)\s+(?:install|uninstall|publish)\b|\bgo\s+(?:install|get)\b|\bapt(?:-get)?\s+(?:install|remove)\b/, why: DO_W_INSTALL },
  { re: /\b(?:curl|wget|fetch)\b/, why: DO_W_FETCH },
  { re: /\|\s*(?:sudo\s+)?(?:ba|z|da|k)?sh\b|\|\s*(?:python3?|node|ruby|perl)\b/, why: DO_W_PIPE },
  { re: /\bgit\s+(?:push|pull|merge|cherry-pick|am|apply|reset|clean|rebase|checkout\s+--|restore|stash\s+(?:drop|clear)|branch\s+-[dD]|tag\s+-d|remote\s+(?:add|set-url)|commit\s+--amend|filter-branch|gc|reflog\s+expire)\b|\bgh\s+(?:pr\s+(?:merge|close|create)|release|repo\s+(?:delete|create)|issue\s+(?:close|create)|api)\b/, why: DO_W_GIT },
  { re: /(?:^|[\s;&|(`])(?:rm|rmdir|mv|unlink|shred|truncate|trash)(?:\s|$)|\s-delete\b/, why: DO_W_DELETE },
  { re: /(?:^|[^>&\d<])>>?(?!&|\s*\/dev\/null)\s*[^\s&|;]|\btee\b|\bsed\s+(?:-[a-zA-Z]*i|--in-place)|\bperl\s+-[a-zA-Z]*i|\bcp\b|\binstall\s+-/, why: DO_W_WRITE },
  { re: /\b(?:chmod|chown|chgrp|kill|killall|pkill|launchctl|systemctl|crontab|defaults\s+write|networksetup|diskutil)\b/, why: DO_W_PERMS },
  { re: /\b(?:docker\s+(?:run|rm|rmi|system|volume|compose\s+(?:up|down))|kubectl\s+(?:apply|delete|exec|patch|scale)|terraform\s+(?:apply|destroy)|helm\s+(?:install|upgrade|uninstall)|ssh|scp|rsync|sftp|(?:vercel|netlify|firebase|fly|flyctl|heroku|wrangler|serverless|sls|aws|gcloud|az)\b|(?:npm|yarn|pnpm)\s+(?:run\s+)?(?:deploy|release|publish))\b/, why: DO_W_DEPLOY },
  { re: /\beval\b|\bsource\b|(?:^|[;&|]\s*)\.\s+\S|\$\(\s*(?:curl|wget)|`\s*(?:curl|wget)|\bxargs\b|\bbash\s+-c\b|\bsh\s+-c\b/m, why: DO_W_EVAL },
]


// A deny list always misses a way to run code (interpreter, quoted name, path, here-doc, alias), so the safe side is the short allow list.
const anyWords = (): boolean => true
const noWords = (w: string[]): boolean => w.length === 0
const FIND_RUNS = new Set(['-exec', '-execdir', '-ok', '-okdir', '-delete', '-fprint', '-fprint0', '-fprintf', '-fls'])
const GIT_LOOK = new Set(['status', 'log', 'diff', 'show'])
const GIT_NO = /^--(?:output|ext-diff|textconv|exec|upload-pack|config|git-dir|work-tree)\b|^-[cO]$/
const BRANCH_LOOK = new Set(['-a', '-r', '-v', '-vv', '--all', '--remotes', '--list', '--show-current', '--verbose', '--no-color', '--color'])
const ALLOWED: Record<string, (w: string[]) => boolean> = {
  ls: anyWords,
  pwd: anyWords,
  cd: anyWords,
  cat: anyWords,
  head: anyWords,
  tail: anyWords,
  wc: anyWords,
  which: anyWords,
  echo: anyWords,
  printf: anyWords,
  // date with words can set the clock.
  date: w => w.every(x => x.startsWith('+')),
  env: noWords,
  // ripgrep's --pre and -z run other programs on each file.
  grep: w => !w.some(x => /^--pre\b/.test(x)),
  egrep: w => !w.some(x => /^--pre\b/.test(x)),
  fgrep: w => !w.some(x => /^--pre\b/.test(x)),
  rg: w => !w.some(x => /^--pre\b|^-z$|^--search-zip$/.test(x)),
  find: w => !w.some(x => FIND_RUNS.has(x)),
  // No -c, config or alias, and no flags that write a file or run a helper.
  git: w => {
    const sub = w[0] ?? ''
    if (sub === 'branch') return w.slice(1).every(x => BRANCH_LOOK.has(x))
    return GIT_LOOK.has(sub) && !w.slice(1).some(x => GIT_NO.test(x))
  },
  // Never --web.
  gh: w => w[0] === 'pr' && GH_PR_LOOK.has(w[1] ?? '') && !w.includes('--web'),
}
const GH_PR_LOOK = new Set(['view', 'checks', 'status', 'list', 'diff'])

// A script block or sub-expression needs braces or brackets, which a plain command never has.
const WIN_LOOKS = new Set([
  'get-childitem', 'gci', 'dir', 'get-content', 'gc', 'type', 'get-location', 'gl', 'get-item', 'gi', 'test-path', 'get-date', 'get-process', 'get-command', 'gcm',
  'select-object', 'select', 'select-string', 'sls', 'measure-object', 'sort-object', 'format-table', 'ft', 'format-list', 'fl', 'write-output', 'write-host', 'where',
])

// Undefined for anything that is not a plain command.
function plainCommands(script: string): { name: string; quoted: boolean; words: string[] }[] | undefined {
  const text = script.replace(/\\\r?\n/g, ' ').replace(/(?:^|\s)\d?>\s*\/dev\/null(?=\s|$|[;&|])/g, ' ').replace(/(?:^|\s)2>&1(?=\s|$|[;&|])/g, ' ')
  const cmds: { name: string; quoted: boolean; words: string[] }[] = []
  let words: string[] = []
  let quotedFirst = false
  let word = ''
  let inWord = false
  let wordQuoted = false
  let q: '' | "'" | '"' = ''
  const endWord = (): void => {
    if (inWord) {
      if (words.length === 0) quotedFirst = wordQuoted
      words.push(word)
    }
    word = ''
    inWord = false
    wordQuoted = false
  }
  const endCmd = (): void => {
    endWord()
    if (words.length > 0) cmds.push({ name: words[0] as string, quoted: quotedFirst, words: words.slice(1) })
    words = []
  }
  for (let k = 0; k < text.length; k++) {
    const c = text[k] as string
    if (q === "'") {
      if (c === "'") q = ''
      else word += c
      continue
    }
    if (c === '`' || (c === '$' && text[k + 1] === '(')) return undefined
    if (q === '"') {
      if (c === '"') q = ''
      else if (c === '\\') word += text[++k] ?? ''
      else word += c
      continue
    }
    if (c === "'" || c === '"') {
      q = c
      inWord = true
      wordQuoted = true
      continue
    }
    if ('<>(){}'.includes(c)) return undefined
    if (c === '\\') {
      word += text[++k] ?? ''
      inWord = true
      wordQuoted = true
      continue
    }
    if (c === ';' || c === '&' || c === '|' || c === '\n') {
      endCmd()
      continue
    }
    if (c === ' ' || c === '\t' || c === '\r') {
      endWord()
      continue
    }
    word += c
    inWord = true
  }
  if (q !== '') return undefined
  endCmd()
  return cmds
}

export function onlyLooks(script: string, sys: ProcPlatform = 'posix'): boolean {
  const cmds = plainCommands(script.split('\n').filter(l => !/^\s*#/.test(l)).join('\n'))
  if (cmds === undefined || cmds.length === 0) return false
  return cmds.every(c => {
    if (c.quoted) return false
    const name = sys === 'win32' ? c.name.toLowerCase() : c.name
    if (sys === 'win32' && WIN_LOOKS.has(name)) return true
    return /^[a-z]+$/.test(name) && Object.hasOwn(ALLOWED, name) && (ALLOWED[name] as (w: string[]) => boolean)(c.words)
  })
}

// Characters that do not show, or show as something else: controls (all but tab and newline), zero-width and direction marks. The judge reads the real text, but the
// person reads what shows, so a block with any of them is never calm.
// eslint-disable-next-line no-control-regex
const HIDDEN = /[\u0000-\u0008\u000b-\u001f\u007f-\u009f\u00ad\u200b-\u200f\u2028-\u202e\u2060-\u2069\ufeff]/

// Safe needs more than no rule matching; `guard` is the judge's own sentences for this script.
export function verdictOf(script: string, guard: string[], outside: boolean, hard: string[] = [], sys: ProcPlatform = 'posix'): { verdict: Verdict; why: string[] } {
  const blocked = [...[...BLOCKED_RULES, ...(sys === 'win32' ? WIN_BLOCKED_RULES : [])].filter(r => r.re.test(script)).map(r => r.why), ...hard.map(g => DO_W_GUARD.replace('{x}', g))]
  if (blocked.length > 0) return { verdict: 'blocked', why: [...new Set(blocked)] }
  const why: string[] = []
  if (outside) why.push(DO_W_OUTSIDE)
  if (HIDDEN.test(script)) why.push(DO_W_HIDDEN)
  for (const g of guard) why.push(DO_W_GUARD.replace('{x}', g))
  if (checkSecretRead(script, sys === 'win32' ? 'powershell' : 'posix') !== undefined || scanSecrets(script).length > 0) why.push(DO_W_SECRET)
  for (const r of [...RISKY_RULES, ...(sys === 'win32' ? WIN_RISKY_RULES : [])]) if (r.re.test(script)) why.push(r.why)
  if (why.length === 0 && !onlyLooks(script, sys)) why.push(DO_W_CODE)
  const uniq = [...new Set(why)]
  return uniq.length > 0 ? { verdict: 'risky', why: uniq } : { verdict: 'safe', why: [DO_W_SAFE] }
}

// Only the destructive check is asked for: the others are about Claude's edits, and the package check would look things up on the internet. Never throws.
export const DO_JUDGE_MODES: Modes = { destructive: 'hold', scope: 'off', packages: 'off', tests: 'off' }
export async function guardWords(i: Io, env: Env, script: string, sys: ProcPlatform = 'posix'): Promise<string[]> {
  try {
    const j = await judgeTool(i, env, sys === 'win32' ? 'PowerShell' : 'Bash', { command: script }, DO_JUDGE_MODES)
    return j.found.map(f => f.words)
  } catch {
    return ['Vaken could not check it.']
  }
}

// The judge's words lose the guard's Windows 'block', so it is read here and the block is blocked. Never throws.
export function hardWords(env: Env, script: string, sys: ProcPlatform = 'posix'): string[] {
  try {
    return checkWindows(script, { home: env.home, cwd: env.cwd }, sys === 'win32')
      .filter(f => f.verdict === 'block')
      .map(sentence)
  } catch {
    return []
  }
}

export async function judgeScript(i: Io, env: Env, script: string, outside: boolean, sys: ProcPlatform = 'posix'): Promise<{ verdict: Verdict; why: string[] }> {
  return verdictOf(script, await guardWords(i, env, script, sys), outside, hardWords(env, script, sys), sys)
}

export const firstLine = (script: string): string => {
  const line = (script.split(/\r?\n/).find(l => l.trim() !== '') ?? '').trim()
  return line.length > DO_FIRST_CHARS ? `${line.slice(0, DO_FIRST_CHARS - 1)}…` : line
}

export async function judgeBlocks(i: Io, env: Env, raws: RawBlock[], sys: ProcPlatform = 'posix'): Promise<DoBlock[]> {
  const out: DoBlock[] = []
  for (const [k, b] of raws.entries()) {
    const script = b.commands.join('\n')
    const v = await judgeScript(i, env, script, b.outside, sys)
    out.push({ n: k + 1, script, first: firstLine(script), verdict: v.verdict, why: v.why, outside: b.outside })
  }
  return out
}


export type DoShown = { n: number; exit: number | 'timeout' | 'failed'; lines: string[]; cut?: boolean }
// `seen` makes a yes run only what was looked at. `dropped`: blocks beyond DO_MAX_BLOCKS.
export const doMem: { blocks: DoBlock[]; shown?: DoShown; seen?: Record<number, string>; dropped?: number } = { blocks: [] }
export const doBlocks = (): DoBlock[] => doMem.blocks
export const doCount = (): number => doMem.blocks.length
export function setDoBlocks(blocks: DoBlock[], dropped = 0): void {
  doMem.blocks = blocks
  if (dropped > 0) doMem.dropped = dropped
  else delete doMem.dropped
  delete doMem.shown
}
export const forgetDo = (): void => {
  setDoBlocks([])
  delete doMem.seen
}
export const doSignature = (): string => `${doMem.blocks.map(b => `${b.n}${b.verdict}${b.first}`).join('|')}#${doMem.shown?.n ?? ''}${doMem.shown?.exit ?? ''}`


// Colour codes go first so a code inside a secret cannot hide it from the mask.
export function cutOutput(text: string): { lines: string[]; cut: boolean } {
  const all = maskSecrets(text.replace(/\r\n/g, '\n').replace(/\x1b\[[0-9;]*[A-Za-z]/g, '')).trimEnd().split('\n')
  let lines = all.length === 1 && all[0] === '' ? [] : all
  let cut = false
  if (lines.length > DO_OUTPUT_LINES) {
    lines = lines.slice(-DO_OUTPUT_LINES)
    cut = true
  }
  let joined = lines.join('\n')
  if (joined.length > DO_OUTPUT_CHARS) {
    joined = joined.slice(-DO_OUTPUT_CHARS)
    lines = joined.split('\n').slice(1)
    cut = true
  }
  return { lines, cut }
}

export function tellNote(n: number, first: string, exit: number | 'timeout' | 'failed', lines: string[]): string {
  const end = exit === 'timeout' ? 'ran too long and was stopped' : exit === 'failed' ? 'could not be started' : `ended with exit ${exit}`
  const tail = lines.slice(-DO_TELL_LINES).join('\n')
  const body = tail.length > DO_TELL_CHARS ? tail.slice(-DO_TELL_CHARS) : tail
  return `I ran block ${n} from your last answer (${first}). It ${end}.${body === '' ? ' It printed nothing.' : ` The last lines of its output:\n${body}`}\nPlease carry on from here.`
}


export type DoAsk = { kind: 'list' } | { kind: 'block'; n: number; level: 0 | 1 | 2; tell: boolean } | { kind: 'bad' }
export function parseDo(args: string): DoAsk {
  const words = args.toLowerCase().match(/[a-zåäö]+|\d+/g) ?? []
  let n: number | undefined
  let yes = 0
  let tell = false
  for (const w of words) {
    // A 'no' after the number is a no, so '2 yes no' runs nothing.
    if (w === 'no' && n !== undefined) return { kind: 'bad' }
    if (/^\d+$/.test(w)) {
      if (n !== undefined) return { kind: 'bad' }
      n = Number(w)
    } else if (w === 'yes' || w === 'y' || w === 'ja') yes += 1
    else if (w === 'tell' || w === 'send') tell = true
    else if (w === 'do' || w === 'block' || w === 'run' || w === 'vaken' || w === 'nr' || w === 'no') continue
    else return { kind: 'bad' }
  }
  if (n === undefined) return words.length === 0 || words.every(w => w === 'do' || w === 'vaken') ? { kind: 'list' } : { kind: 'bad' }
  if (n < 1 || n > 99) return { kind: 'bad' }
  return { kind: 'block', n, level: yes >= 2 ? 2 : yes === 1 ? 1 : 0, tell }
}


export type Say = (s: string) => string
const fill = (s: string, v: Record<string, string | number>): string => Object.entries(v).reduce((acc, [k, x]) => acc.split(`{${k}}`).join(String(x)), s)
const verdictWord = (v: Verdict, t: Say): string => t(v === 'safe' ? DO_V_SAFE : v === 'risky' ? DO_V_RISKY : DO_V_BLOCKED)

const GUARD_PREFIX = DO_W_GUARD.split('{x}')[0] ?? ''
// A guard sentence the table does not know stays English.
const whyWord = (w: string, t: Say): string => (w.startsWith(GUARD_PREFIX) ? t(DO_W_GUARD).replace('{x}', t(w.slice(GUARD_PREFIX.length))) : t(w))

export const offText = (t: Say): string => t(DO_T_OFF)
export const noneText = (t: Say): string => t(DO_T_NONE)
export const badText = (t: Say): string => t(DO_T_BAD)
export const noSuchText = (n: number, t: Say): string => fill(t(DO_T_NOSUCH), { n })

export function listText(blocks: DoBlock[], t: Say): string {
  if (blocks.length === 0) return noneText(t)
  const rows = blocks.slice(0, DO_LIST_ROWS).map(b => `${b.n}. ${b.first} · ${verdictWord(b.verdict, t)}`)
  const go = blocks.find(b => b.verdict !== 'blocked')
  const nextHint = go === undefined ? fill(t(DO_T_MORE), { n: (blocks[0] as DoBlock).n }) : fill(t(go.verdict === 'safe' ? DO_T_TYPE_SAFE : DO_T_TYPE_RISKY), { n: go.n })
  return [t(DO_T_HEAD), ...rows, '', nextHint].join('\n')
}

export function showText(b: DoBlock, t: Say): string {
  const nextHint = b.verdict === 'blocked' ? '' : fill(t(b.verdict === 'safe' ? DO_T_TYPE_SAFE : DO_T_TYPE_RISKY), { n: b.n })
  return [fill(t(DO_T_BLOCK), { n: b.n, a: verdictWord(b.verdict, t) }), ...b.script.split('\n').map(l => `  ${l}`), ...b.why.map(w => whyWord(w, t)), ...(nextHint === '' ? [] : ['', nextHint])].join('\n')
}

export const needYesText = (n: number, t: Say): string => fill(t(DO_T_NEEDYES), { n })
export const changedText = (b: DoBlock, t: Say): string => [fill(t(DO_T_CHANGED), { n: b.n }), showText(b, t)].join('\n')
export function blockedText(b: DoBlock, t: Say): string {
  return [fill(t(DO_T_BLOCKED), { n: b.n }), ...b.why.map(w => whyWord(w, t))].join('\n')
}

export function ranText(n: number, exit: number | 'timeout' | 'failed', lines: string[], cut: boolean, t: Say): string {
  const head = exit === 'timeout' ? fill(t(DO_T_TIMEOUT), { n, c: DO_TIMEOUT_MS / 1000 }) : exit === 'failed' ? fill(t(DO_T_FAILED), { n }) : fill(t(DO_T_RAN), { n, c: exit })
  if (lines.length === 0) return `${head} ${t(DO_T_NOOUT)}`
  return [head, t(DO_T_OUTPUT), ...(cut ? [t(DO_T_CUT)] : []), ...lines].join('\n')
}

export function doCardText(blocks: DoBlock[]): string[] {
  return blocks.length === 0 ? [] : [`Run commands: ${blocks.length} in the last answer · /vaken-help run do`]
}
