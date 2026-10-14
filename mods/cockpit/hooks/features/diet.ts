// Instruction-file diet runtime: find the instruction files that apply to this folder, report their size on request
import type { EngineInterface, On } from 'claude-code'

import { postBand } from '../core/band'
import { DIET_WHAT, analyze, dietText, dietToast } from '../core/diet'
import type { InstructionFile, Report } from '../core/diet'
import { withToastGate } from '../core/io'
import { instructionDirs } from '../core/instrdirs'
import { homeFrom, lastPart, under } from '../core/platform'
import type { Io } from '../core/io'
import { startOfDay } from '../core/ledger'
import { readSetting } from '../core/settings'
import { LEDGER_KEY, pushLog } from './compaction'
import { subArgs } from '../core/menu'

// IO-BLOCK-START
function io($: EngineInterface): Io {
  return withToastGate({
    now: () => $.clock.now(),
    home: () => homeFrom({ HOME: () => $.env.get('HOME'), USERPROFILE: () => $.env.get('USERPROFILE'), HOMEDRIVE: () => $.env.get('HOMEDRIVE'), HOMEPATH: () => $.env.get('HOMEPATH') }),
    sessionId: () => $.session.id(),
    get: key => $.store.get(key),
    set: (key, value) => $.store.set(key, value),
    del: key => $.store.delete(key),
    keys: () => $.store.keys(),
    read: path => $.fs.read(path),
    write: (path, text) => $.fs.write(path, text),
    run: (argv, init) => $.process.run(argv, init),
    ask: (question, options) => $.ui.ask(question, options),
    complete: req => $.model.complete(req),
    toast: text => $.ui.toast(text),
    invalidate: () => $.ui.invalidate('ui.render'),
  })
}
// IO-BLOCK-END

const TOLD_KEY = 'cockpit:diet:told'
const NAMES = ['CLAUDE.md', '.claude/CLAUDE.md', 'AGENTS.md']

const folders = (dirs: string[], home: string): string[] => {
  const out = [...dirs]
  if (home !== '') out.push(under(home, '.claude'))
  return [...new Set(out)]
}

// `exists` says whether a file is there: the command asks the engine
export async function collectFiles(i: Io, exists: (path: string) => Promise<boolean>, cwd: string, root: string, isTop?: (dir: string) => Promise<boolean>): Promise<{ report: Report; home: string }> {
  const home = await i.home()
  const files: InstructionFile[] = []
  const top =
    isTop ??
    (async (dir: string): Promise<boolean> => {
      for (const n of ['.git/HEAD', '.git']) {
        try {
          await i.read(under(dir, n))
          return true
        } catch {
        }
      }
      return false
    })
  for (const dir of folders(await instructionDirs(cwd, root, top), home)) {
    for (const name of lastPart(dir) === '.claude' ? ['CLAUDE.md'] : NAMES) {
      const path = under(dir, name)
      try {
        if (await exists(path)) files.push({ path, text: await i.read(path) })
      } catch {
      }
    }
  }
  return { report: analyze(files), home }
}

async function collect($: EngineInterface): Promise<{ report: Report; home: string }> {
  return collectFiles(io($), path => $.fs.exists(path), await $.session.cwd(), await $.session.root(), dir => $.fs.exists(under(dir, '.git')))
}

export function registerDiet(on: On): void {
  on('session.start', { cwd: /(?<diet>)/ }, async ($, e, next) => {
    try {
      $.clock.after(8_000, () => {
        void (async () => {
          try {
            const i = io($)
            if ((await readSetting(i, 'diet.mode')) === 'off') return
            const now = await i.now()
            const told = await i.get(TOLD_KEY)
            if (typeof told === 'number' && told >= startOfDay(now)) return
            const { report } = await collect($)
            if (!report.heavy && !report.files.some(f => f.big)) return
            await i.set(TOLD_KEY, now)
            await pushLog(i, LEDGER_KEY, { at: now, session: await i.sessionId(), what: DIET_WHAT, detail: dietToast(report), how: 'auto', did: true })
            await postBand(i, 'info', 'diet', 'Instruction files are heavy', 5 * 60_000)
            i.toast(dietToast(report))
          } catch {
          }
        })()
      })
    } catch {
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'vaken-help' }, async ($, e0, next) => {
    const rest0 = subArgs(e0.args, 'run', 'diet')
    if (rest0 === undefined) return next(e0)
    const { report, home } = await collect($)
    return { text: dietText(report, home) }
  })
}
