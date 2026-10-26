// The Skills card's engine: counts the skills used, keeps the list of skills Claude has in memory, and prints both as text.
// Its hooks are written in register.tsx, where the plugin directory reads them; nothing here is handed $ or on.
import type { SessionUsage } from 'claude-code'

import type { Io } from '../core/io'
import { serialUpdate } from '../core/serial'
import { LISTING_TRIES, SKILLS_COUNTS_KEY, SKILLS_FLUSH_MS, SKILLS_LISTING_KEY, addSkillCounts, holdsCounts, listingFrom, noteSkill, parseListing, pendingSize, skillsText } from '../core/skills'
import type { SkillCounts } from '../core/skills'
import { subArgs } from '../core/menu'
import { tr } from '../core/lang'
import { sayIn } from './saylang'

let pending: SkillCounts = {}
let lastFlush = 0
let listed = false
let tries = 0

// Never throws.
export async function flushSkills(i: Io): Promise<void> {
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

// Counts one use of a skill, and writes the counts when the last write is old enough. Never throws.
export async function noteSkillUse(i: Io, skill: string): Promise<void> {
  try {
    const now = await i.now()
    if (noteSkill(pending, skill, now) && (now - lastFlush >= SKILLS_FLUSH_MS || now < lastFlush)) await flushSkills(i)
  } catch {
  }
}

// True while counts wait to be written.
export const skillsPending = (): boolean => pendingSize(pending) > 0

// True while the skill list is not kept yet and tries are left; a helper agent's turn never reads it.
export const wantsListing = (agentId: string | undefined): boolean => !listed && tries < LISTING_TRIES && agentId === undefined

// Keeps the skill list from the session's usage (a local estimate, no network) for the card. Undefined usage is a failed read. Never throws.
export async function keepListing(i: Io, usage: SessionUsage | undefined): Promise<boolean> {
  tries += 1
  try {
    if (usage === undefined) return false
    const listing = listingFrom(usage.context.breakdown?.skills, await i.now())
    if (listing === undefined) return false
    // The Io's set counts the write for the self-cost figure
    await i.set(SKILLS_LISTING_KEY, listing)
    listed = true
    return true
  } catch {
    return false
  }
}

// True when /vaken-help run skills is asked.
export const isSkillsRun = (args: string): boolean => subArgs(args, 'run', 'skills') !== undefined

// The answer when the skills cannot be read.
export const skillsFailed = (): { text: string } => ({ text: tr('The skills could not be read. Try again in a moment.') })

// Before /vaken-help run skills reads the skill list: the person's language, and the waiting counts written. False on a failure.
export async function skillsReady(i: Io): Promise<boolean> {
  try {
    await sayIn(i)
    await flushSkills(i)
    return true
  } catch {
    return false
  }
}

// The answer to /vaken-help run skills: the counts and the list, in the person's language. skillsReady runs first.
export async function skillsAnswer(i: Io, usage: SessionUsage | undefined): Promise<{ text: string }> {
  try {
    await keepListing(i, usage)
    const now = await i.now()
    return { text: skillsText({ counts: await i.get(SKILLS_COUNTS_KEY), listing: parseListing(await i.get(SKILLS_LISTING_KEY)), now }, tr).join('\n') }
  } catch {
    return skillsFailed()
  }
}
