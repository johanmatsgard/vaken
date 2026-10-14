// The surface module of the first-click press (hooks/ui/firstclick.ts)
import type { ClientModule } from 'claude-code'
import { drawnRows, isInside } from './ui/firstclick'
import { PRESSLOG_RECENT } from './core/presslog'
import type { PostedEvent } from './core/presslog'

// Look and tall describe the part (tests read them)
type Props = { look: 'row' | 'button' | 'lit'; tall?: number; scope?: string; log?: boolean; r?: number }


// Which instance the pointer went down
let heldBy: unknown

// The host draws "flooded the page with messages" over a Client that sends too much
const listening = new WeakSet<object>()
const latest = new WeakMap<object, Props>()
let strayUpSent = false

// The instances told to log (their last events, numbered)
const logging = new WeakMap<object, PostedEvent[]>()
const downOf = new WeakMap<object, PostedEvent>()
let anyLogged = false
let logCount = 0
// Notes one pointer event of a logging instance
function note(s: { columns: number; rows: number }, e: { type: string; x: number; y: number }): PostedEvent[] | undefined {
  const recent = logging.get(s)
  if (recent === undefined || e.type === 'move') return undefined
  logCount += 1
  const ev = { n: logCount, type: e.type, x: e.x, y: e.y, columns: s.columns, rows: s.rows }
  if (e.type === 'down') downOf.set(s, ev)
  const next = [...recent, ev].slice(-PRESSLOG_RECENT)
  logging.set(s, next)
  return next
}
// What a press's post carries
function withDown(s: object, recent: PostedEvent[]): PostedEvent[] {
  const down = downOf.get(s)
  if (down === undefined || recent.some(e => e.n === down.n)) return recent
  return [down, ...recent.slice(-(PRESSLOG_RECENT - 1))]
}

const rowsOf = (r: unknown): number => (typeof r === 'number' ? r : 0)

const Press: ClientModule<Props> = (props, s) => {
  const { Box } = s.elements
  latest.set(s, props)
  if (props.log === true) {
    if (!logging.has(s)) logging.set(s, [])
    anyLogged = true
  } else if (anyLogged) logging.delete(s)
  if (!listening.has(s)) {
    listening.add(s)
    s.onPointer(e => {
      const log = anyLogged ? note(s, e) : undefined
      if (e.type === 'down') {
        strayUpSent = false
        if (e.button === undefined || e.button === 'left') heldBy = s
      } else if (e.type === 'up' && heldBy === s) {
        heldBy = undefined
        // The pointer is held until the up, so an up outside the region (dragged away) is a cancelled press
        const press = isInside(e.x, e.y, s.columns, s.rows === 0 ? 0 : Math.max(s.rows, rowsOf(latest.get(s)?.r)))
        if (log !== undefined) s.post(press ? { press: true, log: withDown(s, log) } : { log: withDown(s, log) })
        else if (press) s.post({ press: true })
      } else if (e.type === 'up' && log !== undefined && !strayUpSent) {
        // An up whose down was not here (the down landed elsewhere): logged, never a press
        strayUpSent = true
        s.post({ log })
      }
    })
  }
  // An empty box over the whole region
  return <Box width="100%" height={drawnRows(props.r)} {...(props.scope === undefined ? {} : { hover: { scope: props.scope } })} />
}

export default Press
