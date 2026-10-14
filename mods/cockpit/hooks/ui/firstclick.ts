// The first-click press

// A second press on the same part inside this many milliseconds is ignored
export const FIRST_CLICK_REPEAT_MS = 400

// The switch: false puts every part back to its Button alone
export const FIRST_CLICK_ON = true

// After the host says a press Client failed (ui.fault), its part is drawn without it this long, so the host's error label never shows; the Button still presses
export const FAULT_REST_MS = 5000

// The prefix of a first-click Client's key
export const FIRST_CLICK_PREFIX = 'fc-'

// The key a part's Client is drawn under
const KEYS_KEPT = 4000
const keyMemo = new Map<string, string>()
export function clientKey(key: string): string {
  const kept = keyMemo.get(key)
  if (kept !== undefined) return kept
  const id = `${FIRST_CLICK_PREFIX}${key.replace(/[^A-Za-z0-9-]/g, c => `_${c.charCodeAt(0).toString(16)}_`)}`
  if (keyMemo.size >= KEYS_KEPT) keyMemo.clear()
  keyMemo.set(key, id)
  return id
}

// Whether a pointer up at (x, y), in the region's cells, ends a press that began inside it
export function isInside(x: number, y: number, columns: number, rows: number): boolean {
  return x >= 0 && y >= 0 && (columns === 0 || x <= columns) && (rows === 0 || y <= rows)
}

// The height the press module (hooks/press.tsx) draws
export const drawnRows = (r: unknown): number | string => (typeof r === 'number' && Number.isInteger(r) && r > 0 ? r : '100%')

// The hover group of a press
const scopeMemo = new Map<string, string>()
export function hoverScope(key: string): string {
  const kept = scopeMemo.get(key)
  if (kept !== undefined) return kept
  const scope = `hv-${clientKey(key).slice(FIRST_CLICK_PREFIX.length)}`.slice(0, 64)
  if (scopeMemo.size >= KEYS_KEPT) scopeMemo.clear()
  scopeMemo.set(key, scope)
  return scope
}

const faultedAt = new Map<string, number>()
// Called with the failed Client's key (no hook calls it while the ui.fault hook is out)
export function noteFault(id: string, now: number): void {
  if (faultedAt.size >= KEYS_KEPT) faultedAt.clear()
  faultedAt.set(id, now)
}
// Whether the Client of `id` is left out of this drawing
export function faulted(id: string, now: number): boolean {
  const at = faultedAt.get(id)
  if (at === undefined) return false
  if (now >= at && now - at < FAULT_REST_MS) return true
  faultedAt.delete(id)
  return false
}

const table = new Map<string, () => void>()
const lastAt = new Map<string, number>()

// Called while the pane is drawn: what the Client of `key` runs
export function registerPress(key: string, run: () => void): void {
  table.set(key, run)
}

// What a post from the Client of `key` does: 'ran' (the action ran)
export function runPress(key: string, now: number): 'ran' | 'repeat' | 'none' {
  const run = table.get(key)
  if (run === undefined) return 'none'
  const before = lastAt.get(key)
  if (before !== undefined && now >= before && now - before < FIRST_CLICK_REPEAT_MS) return 'repeat'
  lastAt.set(key, now)
  run()
  return 'ran'
}

// While on, every Client is drawn with `log` and posts its pointer events with its region's size
let logOn = false
export const pressLogOn = (): boolean => logOn
export function setPressLog(on: boolean): void {
  logOn = on
}
