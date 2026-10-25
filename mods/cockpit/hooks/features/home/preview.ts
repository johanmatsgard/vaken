// The Preview card's facts (core/previewcard.ts).
import type { Io } from '../../core/io'
import { tr } from '../../core/lang'
import { projectOf } from '../../core/projects'
import { fillIn } from '../../core/fillin'
import { PREVIEW_FAILED, PREVIEW_NO_SERVER, PREVIEW_SAID, PREVIEW_SAVED } from '../../core/previewwords'
import { PREVIEW_SIZES, frontEdits, lastPicture } from '../../core/previewcard'
import type { DevFact, PreviewFacts } from '../../core/previewcard'
import { devFound, paneLook } from '../eyes'
import type { HomeEngine } from './engine'
import type { Prefs } from './prefs'

// A reading is asked for again after PREVIEW_FRESH_MS when a screen file was edited since it was made (the page may have changed)
export const PREVIEW_FRESH_MS = 30_000
export const PREVIEW_QUIET_MS = 5 * 60_000
let kept: { at: number; dev: DevFact | undefined; edits: number; asking?: Promise<void> } | undefined

const sameDev = (a: DevFact | undefined, b: DevFact | undefined): boolean => a?.line === b?.line

// Never throws.
export async function loadPreview(i: Io, hidden: boolean, now: number, root?: string): Promise<DevFact | undefined> {
  if (hidden) return undefined
  if (root === undefined) return kept?.dev
  const ask = async (quiet: boolean): Promise<void> => {
    const before = kept?.dev
    const dev = await devFound(i, root)
    kept = { at: now, dev, edits: frontEdits.n }
    if (!quiet && !sameDev(before, dev)) i.invalidate()
  }
  try {
    if (kept === undefined) {
      kept = { at: now, dev: undefined, edits: frontEdits.n }
      kept.asking = ask(true)
      await kept.asking
    } else if ((now < kept.at || now - kept.at >= (frontEdits.n === kept.edits ? PREVIEW_QUIET_MS : PREVIEW_FRESH_MS)) && kept.asking === undefined) {
      const asking = ask(false).finally(() => {
        if (kept !== undefined) kept.asking = undefined
      })
      kept.asking = asking
    }
  } catch {
  }
  return kept?.dev
}
export const forgetPreview = (): void => {
  kept = undefined
  lastPicture.now = undefined
}

// `now`: the picture row says its age from it (none without it)
export function previewFactsOf(prefs: Prefs, now?: number): PreviewFacts {
  return { ...(prefs.devServer === undefined ? {} : { dev: prefs.devServer }), edits: frontEdits.n, changed: frontEdits.n > frontEdits.looked, auto: prefs.values['preview.auto'] === 'on', ...(now === undefined || lastPicture.now === undefined ? {} : { picture: lastPicture.now, now }) }
}

// The prompt that asks Claude to look at a picture the card took (en-only: a prompt sent to Claude)
export const picturePrompt = (path: string, width: number): string => `Look at the picture ${path} (the page at ${width} points wide, taken just now) and tell me in short lines what looks wrong or broken.`

// Never throws.
export async function runPreview(eng: HomeEngine, width: 390 | 768 | 1280 | 'all'): Promise<void> {
  const i = eng.io()
  const dev = kept?.dev
  if (dev === undefined || dev.status === undefined) {
    i.toast(tr(PREVIEW_NO_SERVER), true)
    return
  }
  try {
    i.toast(tr(PREVIEW_SAID), true)
    frontEdits.looked = frontEdits.n
    i.invalidate()
    const root = (await projectOf(i)) ?? (await eng.cwd())
    const { said, saved, paths } = await paneLook(i, root, dev.port, width === 'all' ? PREVIEW_SIZES.map(z => z.width) : [width])
    const first = paths[0]
    if (first !== undefined) lastPicture.now = { width: first.width, path: first.path, at: await i.now() }
    if (said === '') i.toast(tr(PREVIEW_FAILED), true)
    else i.toast(saved ? fillIn(tr(PREVIEW_SAVED), { said }) : said, true)
  } catch {
    i.toast(tr(PREVIEW_FAILED), true)
  }
  i.invalidate()
}
