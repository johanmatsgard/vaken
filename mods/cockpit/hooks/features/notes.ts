// Continuity notes: the rules count, the parking lot, reflection and memory in plain words.
import { tr } from '../core/lang'
import type { EngineInterface, On } from 'claude-code'

import { postBand } from '../core/band'
import { withToastGate } from '../core/io'
import { isShellTool } from '../core/tools'
import { homeFrom, homeShown, parts as pathParts, under } from '../core/platform'
import { instructionDirs } from '../core/instrdirs'
import type { Io } from '../core/io'
import { clean, listText, parkKey, parseAsk, parseIdeas } from '../core/parking'
import { hashOf } from '../core/proof'
import { reflect, reflectText } from '../core/reflect'
import { RULE_WHAT, bandText, hitsOf, noteFor, parseRules, rulesKey, rulesText } from '../core/rules'
import type { Counts, Rule } from '../core/rules'
import { readSetting } from '../core/settings'
import { tellsClaude } from '../core/tellclaude'
import { kindWord, memorySpots, memoryText, parseIndex, parseNote } from '../core/memory'
import { LEDGER_KEY, pushLog, readLog } from './compaction'
import { subArgs, isFolded } from '../core/menu'
import { fillIn } from '../core/fillin'

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

async function instructionFiles($: EngineInterface): Promise<{ path: string; text: string }[]> {
  const i = io($)
  const home = await i.home()
  const cwd = await $.session.cwd()
  const root = await $.session.root()
  const dirs = await instructionDirs(cwd, root, dir => $.fs.exists(under(dir, '.git')))
  const paths = [...dirs.flatMap(d => [under(d, 'CLAUDE.md'), under(d, '.claude/CLAUDE.md')]), ...(home === '' ? [] : [under(home, '.claude/CLAUDE.md')])]
  const out: { path: string; text: string }[] = []
  for (const path of paths) {
    try {
      if (await $.fs.exists(path)) out.push({ path, text: await i.read(path) })
    } catch {
    }
  }
  return out
}

let ruleCache: { at: number; rules: Rule[] } | undefined
async function rulesNow($: EngineInterface): Promise<Rule[]> {
  const now = await $.clock.now()
  if (ruleCache !== undefined && now - ruleCache.at < 60_000) return ruleCache.rules
  const home = await io($).home()
  const rules: Rule[] = []
  for (const f of await instructionFiles($)) for (const r of parseRules(f.text, homeShown(f.path, home) !== f.path ? homeShown(f.path, home) : pathParts(f.path).slice(-2).join('/'))) if (!rules.some(x => x.command === r.command)) rules.push(r)
  ruleCache = { at: now, rules }
  return rules
}

export function registerNotes(on: On): void {
  on('session.start', { cwd: /(?<notes>)/ }, async ($, e, next) => {
    try {
      await $.command.register({ name: 'vaken-memory', description: 'What Claude remembers about this project, in plain words. A word after it runs a part: decide, decisions, rules, park, reflect.', argumentHint: 'decide | decisions | rules | park | reflect | [note file]', immediate: true })
    } catch {
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: /(?<notes>)/ }, async ($, e, next) => {
    const result = await next(e)
    // Nothing below may throw: a failure after next must not run the tool twice.
    try {
      const mode = await readSetting(io($), 'rules.mode')
      if (isShellTool(e.tool) && e.agentId === undefined && mode !== 'off' && result.deny === undefined) {
        const hits = hitsOf(await rulesNow($), String((e as unknown as { command?: unknown }).command ?? ''))
        if (hits.length > 0) {
          const i = io($)
          const key = rulesKey(await i.sessionId())
          const counts = ((await i.get(key)) as Counts | undefined) ?? {}
          for (const h of hits) counts[h.id] = (counts[h.id] ?? 0) + 1
          await i.set(key, counts)
          await pushLog(i, LEDGER_KEY, { at: await i.now(), session: await i.sessionId(), what: RULE_WHAT, detail: hits.map(h => h.command).join(', '), how: 'auto', did: true })
          if (mode === 'warn') {
            await postBand(i, 'warn', 'rule', bandText(hits), 5 * 60_000)
            return (await tellsClaude(i)) ? { ...result, context: [...(result.context ?? []), noteFor(hits)] } : result
          }
        }
      }
    } catch {
    }
    return result
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'vaken-memory' }, async ($, e0, next) => {
    const rest0 = subArgs(e0.args, 'rules')
    if (rest0 === undefined) return next(e0)
    const i = io($)
    return { text: rulesText(await rulesNow($), ((await i.get(rulesKey(await i.sessionId()))) as Counts | undefined) ?? {}) }
  })

  on('command.run', { command: 'vaken-memory' }, async ($, e0, next) => {
    const rest0 = subArgs(e0.args, 'reflect')
    if (rest0 === undefined) return next(e0)
    const i = io($)
    return { text: reflectText(reflect(await readLog(i, LEDGER_KEY), await i.now())) }
  })

  on('command.run', { command: 'vaken-memory' }, async ($, e0, next) => {
    const rest0 = subArgs(e0.args, 'park')
    if (rest0 === undefined) return next(e0)
    const e = { ...e0, args: rest0 }
    const i = io($)
    const key = parkKey(hashOf(await $.session.root()))
    const ideas = parseIdeas(await i.get(key))
    const now = await i.now()
    const ask = parseAsk(e.args)
    if (ask.kind === 'bad') return { text: ask.why }
    if (ask.kind === 'list') return { text: listText(ideas, now) }
    if (ask.kind === 'clear') {
      await i.set(key, [])
      return { text: 'The parking lot is empty.' } // en-only: plain answer of a slash command (text twin)
    }
    if (ask.kind === 'add') {
      await i.set(key, [{ at: now, text: ask.text }, ...ideas].slice(0, 30))
      return { text: `Parked: ${ask.text}\n${ideas.length + 1} in the lot. Claude keeps working; nothing was sent.` }
    }
    const idea = ideas[ask.n - 1]
    if (idea === undefined) return { text: `There is no idea ${ask.n}. ${listText(ideas, now)}` }
    if (ask.kind === 'drop') {
      await i.set(key, ideas.filter((_, n) => n !== ask.n - 1))
      return { text: `Removed idea ${ask.n}.` }
    }
    // Send: put it into the prompt a moment after this command ends (a call cannot run inside the command that waits for it).
    $.clock.after(1_500, () => {
      void (async () => {
        try {
          await $.prompt.fill({ text: clean(idea.text) })
          i.toast(tr('The idea is in the prompt box. Press Enter to send it.'))
        } catch {
          i.toast(fillIn(tr('Could not fill the prompt box. The idea: {idea}'), { idea: idea.text.slice(0, 120) }))
        }
      })()
  })
    return { text: `Putting idea ${ask.n} into the prompt box in a moment. It stays in the lot until you drop it.\nIdea ${ask.n}: ${idea.text}` }
    })

  on('command.run', { command: 'vaken-memory' }, async ($, e, next) => {
    if (isFolded(e.command, e.args)) return next(e)
    const i = io($)
    const home = await i.home()
    const cwd = await $.session.cwd()
    const spots = memorySpots(home, cwd)
    const arg = e.args.trim().replace(/[^\w.-]/g, '')
    try {
      if (arg !== '') {
        const file = `${arg.endsWith('.md') ? arg : `${arg}.md`}`
        for (const s of spots) {
          if (!(await $.fs.exists(under(s.dir, file)))) continue
          const note = parseNote(await i.read(under(s.dir, file)))
          return { text: `${kindWord(note.type)}${note.description === undefined ? '' : `: ${note.description}`}\n\n${note.body}` }
        }
        return { text: `No note called ${file}. Looked for: ${[...new Set(spots.map(s => s.label))].join(', ')}.` }
      }
      let index: ReturnType<typeof parseIndex> = []
      for (const s of spots) {
        if (!(await $.fs.exists(under(s.dir, 'MEMORY.md')))) continue
        index = parseIndex(await i.read(under(s.dir, 'MEMORY.md')))
        break
      }
      const files = (await instructionFiles($)).map(f => homeShown(f.path, home))
      return { text: memoryText(index, [], files, spots.map(s => s.label)) }
    } catch {
      return { text: 'Vaken could not read the memory notes for this project.' } // en-only: plain answer of a slash command (text twin)
    }
  })
}
