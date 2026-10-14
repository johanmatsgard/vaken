// The arrange board, drawn by a `Client` on the desktop
import type { ClientModule } from 'claude-code'
import { boardLayout } from './features/home/board'
import type { Columns } from './features/home/board'
import { NEEDS_SLOT } from './features/home/viewset'
import { ACTIVE_LINE, ARRANGE_FALLBACK_COLS, ARRANGE_GAP, ARRANGE_LIFT_FILL, ARRANGE_LIFT_TEXT, ARRANGE_PAD, ARRANGE_TILE_MIN_COLS, ARRANGE_TOP, CARD_FILL, CARD_PAD_Y_PT, ROUND_LINE, vstep } from './ui/tokens'

type Tile = { id: string; title: string; figure: string; zone?: string }
type Props = { order: string[]; bucket: number; tiles: Tile[]; heights: Record<string, number>; columns: Columns; rows: number }
type State = { n: number }

// The drag lives in the module, not in the instance's state
const live: { order: string[]; id?: string; x: number; y: number; grabX: number; grabY: number } = { order: [], x: 0, y: 0, grabX: 0, grabY: 0 }

const Arrange: ClientModule<Props, State> = (props, s) => {
  const { Box, Text } = s.elements
  // The board is as wide as its region, never wider
  const width = (): number => (s.columns > 0 ? s.columns : Math.max(props.tiles.length * ARRANGE_TILE_MIN_COLS, ARRANGE_FALLBACK_COLS))
  const slots = (order: string[]) => boardLayout(order, props.heights, props.columns, width(), ARRANGE_GAP)
  const redraw = (): void => s.setState({ n: (s.state?.n ?? 0) + 1 })
  s.onPointer(e => {
    if (e.type === 'down') {
      live.order = [...props.order]
      const rects = slots(live.order)
      const i = rects.findIndex(r => e.x >= r.x && e.x < r.x + r.w && e.y >= r.y && e.y < r.y + r.tall)
      if (i < 0) return
      // Needs you is always first and stays there (the card formula): it is not lifted
      if (live.order[i] === NEEDS_SLOT) return
      live.id = live.order[i]
      live.grabX = e.x - rects[i].x
      live.grabY = e.y - rects[i].y
      live.x = rects[i].x
      live.y = rects[i].y
      redraw()
    } else if (e.type === 'move' && live.id !== undefined) {
      const rects = slots(live.order)
      live.x = e.x - live.grabX
      live.y = e.y - live.grabY
      // The tile goes to the slot its centre is over (the nearest slot when it is over none)
      const from = live.order.indexOf(live.id)
      const lifted = rects[from]
      const cx = live.x + lifted.w / 2
      const cy = live.y + lifted.tall / 2
      let target = from
      let best = Infinity
      for (const [i, r] of rects.entries()) {
        const d = Math.abs(cx - (r.x + r.w / 2)) + Math.abs(cy - (r.y + r.tall / 2))
        if (d < best) {
          best = d
          target = i
        }
      }
      if (live.order[0] === NEEDS_SLOT && target === 0) target = 1
      if (target !== from) {
        live.order.splice(from, 1)
        live.order.splice(target, 0, live.id)
      }
      redraw()
    } else if (e.type === 'up' && live.id !== undefined) {
      live.id = undefined
      s.post({ order: live.order.join(','), bucket: props.bucket })
      redraw()
    }
  })
  // While nothing is dragged the plugin's order is the truth
  if (live.id === undefined) live.order = [...props.order]
  const rects = slots(live.order)
  const byId = new Map(props.tiles.map(t => [t.id, t]))
  const tile = (id: string, x: number, y: number, w: number, rows: number, isLifted: boolean) => {
    const t = byId.get(id)
    return (
      <Box
        key={id}
        position="absolute"
        top={y + ARRANGE_TOP}
        left={x}
        width={w}
        height={rows}
        backgroundColor={isLifted ? ARRANGE_LIFT_FILL : CARD_FILL}
        borderStyle="round"
        borderColor={isLifted ? ACTIVE_LINE : ROUND_LINE}
        flexDirection="column"
        // The card style of every card: half a row inside the outline above and below
        paddingTop={vstep(CARD_PAD_Y_PT)}
        paddingBottom={vstep(CARD_PAD_Y_PT)}
      >
        <Box flexDirection="row" justifyContent="space-between" columnGap={ARRANGE_PAD}>
          <Text bold color={isLifted ? ARRANGE_LIFT_TEXT : undefined} wrap="truncate-end">
            {t?.title ?? id}
          </Text>
          {/* The zone tag never shrinks: a long title gives way with an ellipsis */}
          {t?.zone === undefined ? null : (
            <Box flexShrink={0}>
              <Text dimColor={!isLifted} color={isLifted ? ARRANGE_LIFT_TEXT : undefined}>
                {t.zone}
              </Text>
            </Box>
          )}
        </Box>
        <Text dimColor={!isLifted} color={isLifted ? ARRANGE_LIFT_TEXT : undefined} wrap="truncate-end">
          {t?.figure ?? ''}
        </Text>
      </Box>
    )
  }
  return (
    <Box position="relative" width="100%" height={props.rows}>
      {live.order.filter(id => id !== live.id).map(id => tile(id, rects[live.order.indexOf(id)].x, rects[live.order.indexOf(id)].y, rects[live.order.indexOf(id)].w, rects[live.order.indexOf(id)].tall, false))}
      {live.id === undefined ? null : tile(live.id, live.x, live.y, rects[live.order.indexOf(live.id)].w, rects[live.order.indexOf(live.id)].tall, true)}
    </Box>
  )
}

export default Arrange
