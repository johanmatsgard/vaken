// The sidebar title of a session, read from its transcript when the app's session list does not give it.
import { bytesFromBase64 } from './fileops'
import type { Io } from './io'
import type { AppSession, AppSessions } from './appsessions'

export const TAIL_BYTES = 262_144
export const HEAD_BYTES = 65_536
export const WHOLE_BYTES = TAIL_BYTES + HEAD_BYTES
export const LOOKUPS_PER_REFRESH = 12
export const LIST_DIRS_MAX = 80
const CACHE_MAX = 200
const TITLE_MAX = 60
const RUN_MS = 10_000

export type TitleSource = {
  home: () => Promise<string>
  stat: (path: string) => Promise<{ size: number; mtimeMs: number } | undefined>
  list: (dir: string) => Promise<string[]>
  read: (path: string) => Promise<string>
  run: Io['run']
  win: () => Promise<boolean>
  now?: () => Promise<number>
}

export const slugOf = (cwd: string): string => cwd.replace(/[^A-Za-z0-9]/g, '-')

const isWinPath = (p: string): boolean => /^(?:[A-Za-z]:|\\\\)/.test(p)
const joinPath = (base: string, ...rest: string[]): string => {
  const s = isWinPath(base) ? '\\' : '/'
  return [base.replace(/[\\/]+$/, ''), ...rest].join(s)
}
export const projectsDir = (home: string): string => joinPath(home, '.claude', 'projects')
export const transcriptPath = (home: string, cwd: string, sessionId: string): string => joinPath(projectsDir(home), slugOf(cwd), `${sessionId}.jsonl`)

export function lastTitleIn(text: string, sessionId?: string): string | undefined {
  const lines = text.split('\n')
  for (let k = lines.length - 1; k >= 0; k -= 1) {
    const line = lines[k]
    if (!line.includes('"custom-title"') || line.length > 4_000) continue
    try {
      const o = JSON.parse(line) as { type?: unknown; customTitle?: unknown; sessionId?: unknown }
      if (o.type !== 'custom-title' || typeof o.customTitle !== 'string') continue
      if (sessionId !== undefined && typeof o.sessionId === 'string' && o.sessionId !== sessionId) continue
      const t = o.customTitle.replace(/\s+/g, ' ').trim()
      if (t !== '') return t.length > TITLE_MAX ? `${t.slice(0, TITLE_MAX - 1)}…` : t
    } catch {
    }
  }
  return undefined
}

const WIN_WINDOW_SCRIPT =
  "$ErrorActionPreference='Stop';$f=[System.IO.File]::Open($env:COCKPIT_TT_0,'Open','Read','ReadWrite');try{$n=[int]$env:COCKPIT_TT_N;$len=$f.Length;" +
  "if($env:COCKPIT_TT_M -eq 'tail'){$s=[Math]::Max(0,$len-$n)}else{$s=0};$c=[int][Math]::Min($n,$len-$s);$b=New-Object byte[] $c;[void]$f.Seek($s,'Begin');" +
  '$g=$f.Read($b,0,$c);[Console]::Out.Write([Convert]::ToBase64String($b,0,$g))}finally{$f.Close()}'
export function windowCall(win: boolean, where: 'head' | 'tail', bytes: number, path: string): { argv: string[]; env?: Record<string, string> } | undefined {
  if (path === '' || /[\u0000-\u001f]/.test(path)) return undefined
  if (!win) return { argv: [where, '-c', String(bytes), path] }
  return { argv: ['powershell.exe', '-NoProfile', '-NonInteractive', '-Command', WIN_WINDOW_SCRIPT], env: { COCKPIT_TT_0: path, COCKPIT_TT_N: String(bytes), COCKPIT_TT_M: where } }
}

function decode(bytes: Uint8Array): string {
  try {
    if (typeof TextDecoder !== 'undefined') return new TextDecoder('utf-8').decode(bytes)
  } catch {
  }
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  try {
    return decodeURIComponent(escape(s))
  } catch {
    return s
  }
}

// Kept per session, not per file state: a live transcript grows every answer, and a key made of size and time would rerun the (slow) program at every refresh.
export const RECHECK_MS = 10 * 60_000
type Kept = { at: number; title: string | null; path: string; size: number; mtimeMs: number }
const kept = new Map<string, Kept>()
const remember = (sid: string, k: Kept): void => {
  if (kept.size >= CACHE_MAX && !kept.has(sid)) kept.delete(kept.keys().next().value as string)
  kept.set(sid, k)
}
export const forgetTitles = (): void => kept.clear()

async function windowText(src: TitleSource, where: 'head' | 'tail', path: string): Promise<string> {
  const call = windowCall(await src.win(), where, where === 'tail' ? TAIL_BYTES : HEAD_BYTES, path)
  if (call === undefined) return ''
  const r = await src.run(call.argv, { timeoutMs: RUN_MS, ...(call.env === undefined ? {} : { env: call.env }) })
  if (r.exitCode !== 0) return ''
  return call.env === undefined ? r.stdout : decode(bytesFromBase64(r.stdout.trim()))
}

const nowOf = async (src: TitleSource): Promise<number> => (src.now === undefined ? Date.now() : await src.now())

export async function lookupTitle(src: TitleSource, sessionId: string, cwd: string): Promise<{ title: string | undefined; ran: boolean }> {
  let ran = false
  try {
    const home = await src.home()
    if (home === '' || sessionId === '' || /[\\/]/.test(sessionId)) return { title: undefined, ran }
    const now = await nowOf(src)
    const old = kept.get(sessionId)
    let path = cwd === '' ? undefined : transcriptPath(home, cwd, sessionId)
    let st = path === undefined ? undefined : await src.stat(path)
    if (st === undefined && old !== undefined && now - old.at < RECHECK_MS && old.title !== null) return { title: old.title, ran }
    if (st === undefined) {
      const dir = projectsDir(home)
      for (const name of (await src.list(dir)).slice(0, LIST_DIRS_MAX)) {
        const p = joinPath(dir, name, `${sessionId}.jsonl`)
        const s = await src.stat(p)
        if (s !== undefined) {
          path = p
          st = s
          break
        }
      }
    }
    if (path === undefined || st === undefined) return { title: undefined, ran }
    if (old !== undefined) {
      const same = old.path === path && old.size === st.size && old.mtimeMs === st.mtimeMs
      const fresh = now - old.at < RECHECK_MS
      if (old.title !== null && (fresh || same)) return { title: old.title, ran }
      if (old.title === null && (same || (fresh && old.path === path && st.size >= old.size))) return { title: undefined, ran }
    }
    let title: string | undefined
    if (st.size <= WHOLE_BYTES) title = lastTitleIn(await src.read(path), sessionId)
    else {
      ran = true
      title = lastTitleIn(await windowText(src, 'tail', path), sessionId)
      if (title === undefined) title = lastTitleIn(await windowText(src, 'head', path), sessionId)
    }
    remember(sessionId, { at: now, title: title ?? null, path, size: st.size, mtimeMs: st.mtimeMs })
    return { title, ran }
  } catch {
    return { title: undefined, ran }
  }
}

export const transcriptTitle = async (src: TitleSource, sessionId: string, cwd: string): Promise<string | undefined> => (await lookupTitle(src, sessionId, cwd)).title

export async function withTranscriptTitles(list: AppSessions, mine: ReadonlyArray<{ sessionId: string; cwd: string }>, src: TitleSource): Promise<AppSessions> {
  const sessions: AppSession[] = list.sessions.map(s => ({ ...s }))
  let looked = 0
  let added = 0
  for (const rec of mine) {
    if (looked >= LOOKUPS_PER_REFRESH) break
    const own = sessions.find(s => s.id === rec.sessionId || s.id === `local_${rec.sessionId}`)
    if (own !== undefined && own.title !== '') continue
    const got = await lookupTitle(src, rec.sessionId, rec.cwd)
    if (got.ran) looked += 1
    const title = got.title
    if (title === undefined) continue
    added += 1
    if (own !== undefined) own.title = title
    else sessions.push({ id: rec.sessionId, title, cwd: rec.cwd, isRunning: false })
  }
  return added === 0 ? list : { at: list.at, sessions }
}
