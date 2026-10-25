// The Skills card's engine: counts the skills used, keeps the list of skills Claude has in memory, and prints both as text.
import type { EngineInterface, On } from 'claude-code'
import { noteWrite } from '../core/selfcost'

import { withToastGate } from '../core/io'
import { homeFrom } from '../core/platform'
import type { Io } from '../core/io'
import { serialUpdate } from '../core/serial'
import { LISTING_TRIES, SKILLS_COUNTS_KEY, SKILLS_FLUSH_MS, SKILLS_LISTING_KEY, addSkillCounts, holdsCounts, listingFrom, noteSkill, parseListing, pendingSize, skillsText } from '../core/skills'
import type { SkillCounts } from '../core/skills'
import { subArgs } from '../core/menu'
import { tr } from '../core/lang'
import { sayIn } from './saylang'

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

let pending: SkillCounts = {}
let lastFlush = 0
let listed = false
let tries = 0

// Never throws.
async function flush(i: Io): Promise<void> {
  if (pendingSize(pending) === 0) return
  const delta = pending
  pending = {}
  try {
    const now = await i.now()
    lastFlush = now
    await serialUpdate(
      i,
      SKILLS_COUNTS_KEY,
      old => addSkillCounts(old, delta, now),
      stored => holdsCounts(stored, delta),
    )
    i.invalidate()
  } catch {
    for (const [day, names] of Object.entries(delta)) {
      const row = pending[day] ?? (pending[day] = {})
      for (const [name, n] of Object.entries(names)) row[name] = (row[name] ?? 0) + n
    }
  }
}

// Reads the skill list the engine gave this session (a local estimate, no network) and keeps it for the card.
async function readListing($: EngineInterface): Promise<boolean> {
  tries += 1
  try {
    const usage = await $.session.usage({ breakdown: 'summary' })
    const nowMs = await $.clock.now()
    const listing = listingFrom(usage.context.breakdown?.skills, nowMs)
    if (listing === undefined) return false
    noteWrite()
    await $.store.set(SKILLS_LISTING_KEY, listing)
    listed = true
    return true
  } catch {
    return false
  }
}

export function registerSkills(on: On): void {
  on('session.start', { cwd: /(?<skills>)/ }, async ($, e, next) => {
    try {
    } catch {
      // the command is optional: a failure shows less, never breaks the session
    }
    const result = await next(e)
    // After next: the engine has finished starting, so its skill list is there.
    await readListing($)
    return result
  }).catch(($, e, next) => next(e))

  on('skill.prompt', { skill: /(?<skills>)/ }, async ($, e, next) => {
    try {
      const now = await $.clock.now()
      if (noteSkill(pending, e.skill, now) && (now - lastFlush >= SKILLS_FLUSH_MS || now < lastFlush)) await flush(io($))
    } catch {
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('turn.complete', { turnId: /(?<skills>)/ }, async ($, e, next) => {
    try {
      if (pendingSize(pending) > 0) await flush(io($))
      if (!listed && tries < LISTING_TRIES && e.agentId === undefined) await readListing($)
    } catch {
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('session.end', { sessionId: /(?<skills>)/ }, async ($, e, next) => {
    try {
      await flush(io($))
    } catch {
      // the last counts are lost, nothing else
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'vaken-help' }, async ($, e, next) => {
    const rest0 = subArgs(e.args, 'run', 'skills')
    if (rest0 === undefined) return next(e)
    try {
      const i = io($)
      await sayIn(i)
      await flush(i)
      await readListing($)
      const now = await i.now()
      return { text: skillsText({ counts: await i.get(SKILLS_COUNTS_KEY), listing: parseListing(await i.get(SKILLS_LISTING_KEY)), now }, tr).join('\n') }
    } catch {
      return { text: tr('The skills could not be read. Try again in a moment.') }
    }
  })
}
