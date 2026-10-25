// Each card's zone and owned settings as plain data with no imports, so the board, the flip and Settings read the same tables.

export const ZONES = ['needs', 'now', 'helpers', 'trust', 'ship', 'setup', 'phone'] as const
export type Zone = (typeof ZONES)[number]
export const ZONE_WORD: Record<Zone, string> = { needs: 'Needs you', now: 'Now', helpers: 'Agents', trust: 'Safety', ship: 'Ship', setup: 'Setup', phone: 'Phone' }
export const CARD_ZONE = {
  limit: 'now',
  here: 'now',
  context: 'now',
  agents: 'helpers',
  computer: 'helpers',
  others: 'helpers',
  guard: 'trust',
  safety: 'trust',
  proof: 'trust',
  prs: 'ship',
  ship: 'ship',
  preview: 'ship',
  back: 'ship',
  setup: 'setup',
  skills: 'setup',
  autopilot: 'setup',
  do: 'phone',
} as const satisfies Record<string, Zone>

// Placement groups: a card stays in its column while the person reads; the key order is the default order inside a group.
export const GROUPS = ['work', 'helpers', 'protection'] as const
export type Group = (typeof GROUPS)[number]
export const CARD_GROUP = {
  limit: 'work',
  here: 'work',
  others: 'work',
  back: 'work',
  context: 'work',
  ship: 'work',
  prs: 'work',
  preview: 'work',
  agents: 'helpers',
  setup: 'helpers',
  computer: 'helpers',
  skills: 'helpers',
  do: 'helpers',
  guard: 'protection',
  safety: 'protection',
  autopilot: 'protection',
  proof: 'protection',
} as const satisfies Record<keyof typeof CARD_ZONE, Group>
export const groupIndexOf = (id: string): number => Math.max(0, GROUPS.indexOf((CARD_GROUP as Record<string, Group>)[id] as Group))
export const isGroupOrder = (ids: readonly string[]): boolean => ids.every((id, n) => n === 0 || groupIndexOf(ids[n - 1]) <= groupIndexOf(id))

// Expert keys are listed too: they stay off the card face but the text twin lists them.
export const CARD_SETTINGS: Record<string, readonly string[]> = {
  limit: ['limits.warn', 'cost.budget', 'cost.session', 'cost.day', 'resume.mode', 'cost.why'],
  here: ['compact.mode', 'compact.from', 'compact.min', 'compact.lead', 'compact.card', 'cache.keeper', 'lean.mode', 'happened.mode', 'next.mode', 'plain.mode', 'errors.mode', 'answer.shape', 'hints.model', 'recap.mode', 'heartbeat.mode', 'steer.mode'],
  others: ['neighbors.warn', 'crew.collide', 'crew.ports'],
  autopilot: ['fresh.nudge', 'plan.first', 'prompt.check', 'assume.check', 'tasks.visible', 'habit.summary', 'habit.ask', 'habit.chapters', 'rules.mode', 'decisions.mode', 'teach.mode', 'value.weekly', 'today.brief', 'brief.mode'],
  proof: ['proof.claims', 'proof.done', 'proof.receipts', 'proof.drift', 'proof.anomaly', 'proof.confidence'],
  guard: ['guard.destructive', 'guard.scope', 'guard.packages', 'guard.tests', 'guard.world', 'guard.secrets', 'guard.migrations', 'away.policy', 'guard.outbox', 'guard.env', 'guard.commands', 'guard.fence', 'allow.rules'],
  agents: ['cap.mode', 'route.mode', 'runner.researcher', 'runner.builder', 'runner.reviewer', 'runner.fixer', 'cap.max', 'agents.offer', 'agents.board', 'crew.worktrees'],
  computer: ['laptop.mode', 'awake.mode', 'awake.away'],
  skills: ['coach.mode'],
  prs: ['crew.pr'],
  ship: [],
  back: ['away.digest'],
  safety: ['loop.breaker', 'undo.mode', 'claude.notes'],
  context: ['diet.mode'],
  preview: ['preview.auto'],
  setup: ['setup.apply', 'setup.scope'],
  do: ['do.mode'],
}

export const GLOBAL_SETTINGS: readonly string[] = [
  'detail', 'view.problems', 'look.open', 'look.view', 'look.needs', 'look.columns', 'look.theme', 'look.language', 'look.motion', 'notify.mode', 'notify.quiet', 'phone.mode', 'phone.note', 'phone.hello', 'inbox.mode', 'stability.check', 'modhealth.mode',
]

const LISTED = new Map<string, string>(Object.entries(CARD_SETTINGS).flatMap(([id, keys]) => keys.map((k): [string, string] => [k, id])))
export const listedCardOf = (key: string): string | undefined => LISTED.get(key)
export const zoneOfCard = (id: string): Zone | undefined => (CARD_ZONE as Record<string, Zone>)[id]
