// The pane's footer (the view switch and the presses) at narrow and normal widths, English and Swedish, framed presses on and off:
// no footer label is cut, each line's drawn width fits the body, and no label carries a key, since a keyed word is cut ("Stan…", "H.."):
// a plain Button with a hotkey draws "h: Help", and the frame was as wide as the word alone; the footer says plain words, so it has no key.
import { expect, mock } from 'claude-code/testing'
import { test } from './slow'
import { forgetProjectSet } from '../hooks/core/io'
import { forgetContext } from '../hooks/features/home/context'
import { forgetStartCheck } from '../hooks/features/home/starttask'
import { checkShown } from '../hooks/features/orchestra'
import { setLang } from '../hooks/core/lang'
import { framedLabel, glyphPt, wordBox } from '../hooks/ui/kit'
import { columnPt, FRAME_PAD_X_PT } from '../hooks/ui/tokens'
import { BASE_SEEDS, HOME, SETUP_BASE, NOW, engine, kids, nameOf, propsAt, walk } from './statefixtures'
import type { Node, Pane, World } from './statefixtures'

const WIDTHS = [288, 330, 420, 440]
const CLOSE = 0.01
// What a plain Button with a hotkey draws (the engine's `1: Yes`), written here on its own so the test does not lean on the kit's measure
const keyedLabel = (text: string, key?: string): string => (key === undefined ? text : `${key}: ${text}`)
const lettersPt = (s: string): number => [...s].reduce((sum, c) => sum + glyphPt(c), 0)
const num = (v: unknown): number => (typeof v === 'number' ? v : 0)
const find = (n: Node, pred: (x: Node) => boolean): Node | undefined => (pred(n) ? n : kids(n).map(c => find(c, pred)).find(x => x !== undefined))
const label = (b: Node): string => String(b.props?.label ?? '')
const hotkey = (b: Node): string | undefined => (typeof b.props?.hotkey === 'string' ? b.props.hotkey : undefined)
// The width a part draws in one line, in points: a box of a set width is that wide; a host button is its label and key padded; a row adds its parts and gaps
const drawnPt = (n: Node): number => {
  if (n.props?.position === 'absolute') return 0
  if (typeof n.props?.width === 'number') return n.props.width * columnPt()
  if (n.type === 'Button') return wordBox(framedLabel(keyedLabel(label(n), hotkey(n)))).minW
  if (n.type === 'Svg' || n.type === 'Client') return 0
  const parts = kids(n).map(drawnPt).filter(w => w > 0)
  if (n.props?.flexDirection !== 'row') return Math.max(0, ...parts)
  return parts.reduce((a, b) => a + b, 0) + num(n.props?.columnGap) * columnPt() * Math.max(0, parts.length - 1)
}
// The footer's lines: each line of the view switch on its own row, and the presses' row, or each of its lines
const linesOf = (root: Node): Node[] => {
  const switchRow = find(root, n => nameOf(n) === 'view-switch-row')
  const footer = find(root, n => nameOf(n) === 'footer') as Node
  const split = walk(footer).filter(n => /^footer-line-\d+$/.test(nameOf(n)))
  return [...(switchRow === undefined ? [] : kids(switchRow)), ...(split.length > 0 ? split : [footer])]
}

for (const lang of ['en', 'sv'] as const) {
  for (const surface of ['desktop', 'mobile'] as const) {
    test(`the footer at ${WIDTHS.join(', ')} pt, ${lang}, framed ${surface === 'desktop' ? 'on' : 'off'}: no label is cut and every line fits the body`, { timeoutMs: 120_000 }, async ($, on) => {
      mock.clock(on, { now: NOW })
      mock.env(on, { HOME })
      const w: World = { mem: new Map(), files: new Map(Object.entries(SETUP_BASE)), listening: {}, procs: [] }
      BASE_SEEDS(w.mem)
      w.mem.set('cockpit:setting:look.view', 'standard')
      if (lang === 'sv') w.mem.set('cockpit:setting:look.language', 'sv')
      engine(on, w)
      forgetProjectSet()
      forgetContext()
      forgetStartCheck()
      delete checkShown.sig
      const ui = (await ($ as unknown as { ui: { mount: (a: unknown) => Promise<unknown> } }).ui.mount({ plugin: 'vaken', surface, component: 'Pane', requestId: 'cockpit-home', props: propsAt(WIDTHS[0] ?? 288) })) as Pane
      try {
        for (const wPt of WIDTHS) {
          await ui.redraw(propsAt(wPt))
          const root = await ui.drawn()
          const lines = linesOf(root)
          const presses = lines.flatMap(l => walk(l).filter(n => n.type === 'Button'))
          // The view switch's three words and Help and Settings at least
          expect(presses.length, `${wPt}`).toBeGreaterThanOrEqual(5)
          for (const b of presses) {
            // Plain words: no key on the Button, so none is drawn before its label ("h: Help")
            expect(hotkey(b), `${label(b)} at ${wPt}`).toBeUndefined()
            expect(label(b), `${wPt}`).not.toMatch(/^\S: /)
            // A framed press: its box holds what the Button draws (the key, a colon, the label) and the frame's air each side
            const box = lines.flatMap(l => walk(l)).find(n => kids(n).includes(b) && typeof n.props?.width === 'number')
            if (box !== undefined) expect(num(box.props?.width) * columnPt() + CLOSE, `${label(b)} at ${wPt}`).toBeGreaterThanOrEqual(lettersPt(keyedLabel(label(b), hotkey(b))) + 2 * FRAME_PAD_X_PT)
          }
          for (const l of lines) expect(drawnPt(l), `${nameOf(l)} at ${wPt}`).toBeLessThanOrEqual(wPt + CLOSE)
        }
      } finally {
        await ui.unmount()
        setLang('en')
      }
    })
  }
}
