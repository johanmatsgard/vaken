// The Preview card: is the page up, and what does it look like. No new engine. The page console is not read because that would start a headless Chrome for up to 40 seconds. The nudge is a card line only; nothing is sent to Claude.
import type { Listener, Reply } from './eyesdev'
import { devLine, errorSnippet, errorWords } from './eyesdev'
import type { Width } from './eyes'
import { PREVIEW_APP, PREVIEW_ROW, PREVIEW_TAKE_ALL, PREVIEW_BLURB, PREVIEW_CHANGED, PREVIEW_DESKTOP, PREVIEW_ERROR, PREVIEW_HEAD_SERVER, PREVIEW_IPAD, PREVIEW_NONE, PREVIEW_PICTURE, PREVIEW_PORT, PREVIEW_R_ERROR, PREVIEW_R_SILENT, PREVIEW_R_UP, PREVIEW_SILENT, PREVIEW_TAKE, PREVIEW_TITLE, PREVIEW_UP } from './previewwords'
import type { WhatIs } from './whatis'
import { fillIn } from './fillin'
import { fmt } from './fmt'
import { RECENT_SHOW_MS } from './time'
import { langNow } from '../i18n/t'

// `changed`: some edits since the last look. `said`: the error the page names, short (eyesdev.ts errorSnippet). `picture`: the picture taken last, shown until RECENT_SHOW_MS.
export type DevFact = { port: number; who: string; status?: number; words: string[]; line: string; said?: string }
export type Picture = { width: Width; path: string; at: number }
export type PreviewFacts = { dev?: DevFact; edits: number; changed: boolean; auto: boolean; picture?: Picture; now?: number }
export type PreviewState = 'none' | 'silent' | 'error' | 'up'
export type PreviewDo = { do: 'look'; width: Width | 'all' } | { do: 'see'; path: string; width: Width }
export type PreviewGroupRow = { key: string; title: string; right?: string; what: WhatIs; press?: PreviewDo }
export type PreviewView = { title: string; blurb: string; short: string; lines: string[]; whats: WhatIs[]; shortWhat: WhatIs; groups: { head: string; rows: PreviewGroupRow[] }[] }


// In memory only. `looked` is the count when a picture was last pressed.
export const frontEdits: { n: number; looked: number } = { n: 0, looked: 0 }
// The picture saved last by a press on the card; in memory only.
export const lastPicture: { now?: Picture } = {}
const FRONT_EXT = ['html', 'htm', 'css', 'scss', 'sass', 'less', 'tsx', 'jsx', 'vue', 'svelte']
export function isFrontFile(path: string): boolean {
  if (/(^|\/)node_modules\//.test(path) || /\.(test|spec|stories)\.[a-z]+$/i.test(path)) return false
  const ext = /\.([a-z0-9]+)$/i.exec(path)?.[1]?.toLowerCase()
  return ext !== undefined && FRONT_EXT.includes(ext)
}


export const PREVIEW_SIZES: ReadonlyArray<{ width: Width; title: string }> = [
  { width: 390, title: 'Phone' },
  { width: 768, title: PREVIEW_IPAD },
  { width: 1280, title: PREVIEW_DESKTOP },
]

export function devFact(port: number, who: Listener, reply: Reply | undefined): DevFact {
  const said = reply === undefined ? '' : errorSnippet(reply.head)
  return { port, who: who.command, ...(reply === undefined ? {} : { status: reply.status }), words: reply === undefined ? [] : errorWords(reply.head), line: devLine(port, who, reply), ...(said === '' ? {} : { said }) }
}

export function previewState(f: PreviewFacts): PreviewState {
  const d = f.dev
  if (d === undefined) return 'none'
  if (d.status === undefined) return 'silent'
  return d.status >= 400 || d.words.length > 0 ? 'error' : 'up'
}

export const previewShown = (f: PreviewFacts): boolean => f.dev !== undefined || f.edits > 0

export const previewNudge = (f: PreviewFacts): boolean => f.auto && f.changed && (previewState(f) === 'up' || previewState(f) === 'error')

export type PreviewLoudness = 'error' | 'changed' | 'up' | 'none'
export function previewLoud(f: PreviewFacts | undefined): PreviewLoudness {
  if (f === undefined) return 'none'
  const s = previewState(f)
  return s === 'error' || s === 'silent' ? 'error' : previewNudge(f) ? 'changed' : s === 'up' ? 'up' : 'none'
}

const fill = (s: string, n: number | string): string => s.replace('{n}', String(n))

export const PREVIEW_MEANS = 'Whether the dev server of your front-end work is up and answers, and pictures of the page at phone, iPad and desktop size, taken by the Chrome on this Mac in the background. Vaken looks at the usual dev ports and never starts a server.'
export const PREVIEW_APP_MEANS = "Claude Code Desktop shows the running page live in its own browser pane, from the project's .claude/launch.json. This card adds whether the dev server answers and pictures at three sizes."
const PREVIEW_NEXT = 'Vaken looks at the usual dev ports and never starts a server. A press takes a picture; nothing is sent to Claude.'

export function previewShort(f: PreviewFacts, t: (s: string) => string): string {
  const s = previewState(f)
  const port = f.dev?.port ?? 0
  if (s === 'none') return t(PREVIEW_NONE)
  if (s === 'silent') return fill(t(PREVIEW_SILENT), port)
  if (previewNudge(f)) return t(PREVIEW_CHANGED)
  return s === 'error' ? t(PREVIEW_ERROR) : fill(t(PREVIEW_UP), port)
}

const lookWhat = (size: { width: Width; title: string }, f: PreviewFacts, t: (s: string) => string): WhatIs => ({
  means: fillIn(t('A picture of {where} {width} points wide, {taken}'), { where: f.dev === undefined ? t('the page') : `localhost:${f.dev.port}`, width: size.width, taken: t('taken by the Chrome on this Mac in the background.') }),
  next: t('Press to take it. The picture is kept in the project folder and the toast names it; nothing is sent to Claude. Ask Claude to look at the file if you want it to see it.'),
  setting: 'cards.preview',
})

export function previewView(f: PreviewFacts | undefined, t: (s: string) => string): PreviewView {
  const facts: PreviewFacts = f ?? { edits: 0, changed: false, auto: false }
  const s = previewState(facts)
  const short = previewShort(facts, t)
  const answers = s === 'up' || s === 'error'
  const d = facts.dev
  const serverWhat: WhatIs = { means: PREVIEW_MEANS, ...(d === undefined ? {} : { facts: [d.line] }), next: d === undefined ? 'Start your dev server. The card looks at the usual ports again within a minute.' : PREVIEW_NEXT, setting: 'cards.preview' }
  const server: PreviewGroupRow =
    d === undefined
      ? { key: 'server', title: t(PREVIEW_NONE), what: serverWhat }
      : { key: 'server', title: fill(t(PREVIEW_PORT), d.port), right: s === 'silent' ? t(PREVIEW_R_SILENT) : `${s === 'error' ? t(PREVIEW_R_ERROR) : t(PREVIEW_R_UP)} · ${d.status}${s === 'error' && d.said !== undefined ? ` · ${d.said}` : ''}`, what: serverWhat }
  const nudge: PreviewGroupRow[] = previewNudge(facts)
    ? [{ key: 'changed', title: t(PREVIEW_CHANGED), right: t(PREVIEW_TAKE_ALL), press: { do: 'look', width: 'all' }, what: { means: 'A screen file was edited since you last looked, and the dev server answers. Press to take the pictures at all three sizes.', next: 'The setting is Settings > Agents > Preview after edits. Nothing is sent to Claude.', setting: 'preview.auto' } }]
    : []
  const sizes: PreviewGroupRow[] = answers ? PREVIEW_SIZES.map((z): PreviewGroupRow => ({ key: `look-${z.width}`, title: fillIn(t(PREVIEW_ROW), { size: t(z.title) }), right: t(PREVIEW_TAKE), press: { do: 'look', width: z.width }, what: lookWhat(z, facts, t) })) : []
  const pic = facts.picture
  const now = facts.now ?? 0
  const sizeOf = (w: Width): string => t(PREVIEW_SIZES.find(z => z.width === w)?.title ?? 'Phone')
  const picture: PreviewGroupRow[] =
    pic === undefined || now - pic.at > RECENT_SHOW_MS || now < pic.at
      ? []
      : [{ key: 'picture', title: fillIn(t(PREVIEW_PICTURE), { size: sizeOf(pic.width), age: fmt.ago(now - pic.at, 'days', langNow()) }), press: { do: 'see', path: pic.path, width: pic.width }, what: { means: fillIn(t('The picture taken last: {path}.'), { path: pic.path }), next: t('Press to ask Claude to look at it. The line goes after a day.'), setting: 'cards.preview' } }]
  // One fact row, never a press, first after a nudge: the live view is the app's own
  const app: PreviewGroupRow = { key: 'app', title: t(PREVIEW_APP), what: { means: t(PREVIEW_APP_MEANS), setting: 'cards.preview' } }
  const groups = [
    ...(nudge.length === 0 ? [] : [{ head: '', rows: nudge }]),
    { head: '', rows: [app] },
    { head: t(PREVIEW_HEAD_SERVER), rows: [server] },
    ...(sizes.length === 0 ? [] : [{ head: t('Pictures'), rows: sizes }]),
    ...(picture.length === 0 ? [] : [{ head: '', rows: picture }]),
  ]
  const what: WhatIs = { means: PREVIEW_MEANS, ...(d === undefined ? {} : { facts: [d.line] }), next: PREVIEW_NEXT, setting: 'cards.preview' }
  return {
    title: PREVIEW_TITLE,
    blurb: t(PREVIEW_BLURB),
    short,
    lines: [short, ...groups.flatMap(g => g.rows.filter(r => r.press === undefined && r.key !== 'app').map(r => r.title))].filter((l, n, all) => all.indexOf(l) === n),
    whats: [what],
    shortWhat: what,
    groups,
  }
}

export function previewCardText(f: PreviewFacts | undefined): string[] {
  if (f === undefined || !previewShown(f)) return []
  const id = (s: string): string => s
  const s = previewState(f)
  return [`Preview: ${previewShort(f, id)}`, ...(s === 'up' || s === 'error' ? ['Pictures at phone, iPad and desktop size: press a row on the Preview card, when it shows.'] : [])]
}
