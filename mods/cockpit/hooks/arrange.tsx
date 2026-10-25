// The arrange board, drawn by a `Client` on the desktop: each column keeps its own list, and a card dropped in a column stays there
import type { ClientModule } from 'claude-code'
import { dropAt, listsLayout } from './features/home/board'
import type { ListsBoard } from './features/home/board'
import { NEEDS_SLOT } from './features/home/viewset'
import { ACTIVE_LINE, ARRANGE_FALLBACK_COLS, ARRANGE_GAP, ARRANGE_LIFT_FILL, ARRANGE_CLOSED_ROWS, ARRANGE_LIFT_TEXT, ARRANGE_PAD, ARRANGE_TILE_MIN_COLS, ARRANGE_TOP, CARD_FILL, CARD_LINE, ROUND_LINE, CARD_PAD_X_PT, cols } from './ui/tokens'

type Tile = { id: string; title: string; figure: string; zone?: string }
type Props = { lists: string[][]; bucket: number; tiles: Tile[]; heights: Record<string, number>; rows: number; dropWord: string }
type State = { n: number }

// The drag lives in the module, not in the instance's state
const live: { lists: string[][]; id?: string; x: number; y: number; grabX: number; grabY: number } = { lists: [], x: 0, y: 0, grabX: 0, grabY: 0 }
const copy = (lists: readonly (readonly string[])[]): string[][] => lists.map(l => [...l])
const textOf = (lists: readonly (readonly string[])[]): string => lists.map(l => l.join(',')).join('|')

const Arrange: ClientModule<Props, State> = (props, s) => {
  const { Box, Text } = s.elements
  const count = props.lists.reduce((n, l) => n + l.length, 0)
  // The board is as wide as its region, never wider
  const width = (): number => (s.columns > 0 ? s.columns : Math.max(count * ARRANGE_TILE_MIN_COLS, ARRANGE_FALLBACK_COLS))
  const layout = (lists: readonly (readonly string[])[]): ListsBoard => listsLayout(lists, props.heights, width(), ARRANGE_GAP)
  const redraw = (): void => s.setState({ n: (s.state?.n ?? 0) + 1 })
  s.onPointer(e => {
    if (e.type === 'down') {
      live.lists = copy(props.lists)
      const hit = [...layout(live.lists).tiles.entries()].find(([, r]) => e.x >= r.x && e.x < r.x + r.w && e.y >= r.y && e.y < r.y + r.tall)
      // Needs you is always first and stays there (the card formula): it is not lifted
      if (hit === undefined || hit[0] === NEEDS_SLOT) return
      const [id, r] = hit
      live.id = id
      live.grabX = e.x - r.x
      live.grabY = e.y - r.y
      live.x = r.x
      live.y = r.y
      redraw()
    } else if (e.type === 'move' && live.id !== undefined) {
      const board = layout(live.lists)
      const lifted = board.tiles.get(live.id)
      live.x = e.x - live.grabX
      live.y = e.y - live.grabY
      if (lifted !== undefined) {
        const next = dropAt(live.lists, live.id, live.x + lifted.w / 2, e.y, board)
        if (textOf(next) !== textOf(live.lists)) live.lists = next
      }
      redraw()
    } else if (e.type === 'up' && live.id !== undefined) {
      live.id = undefined
      s.post({ lists: textOf(live.lists), bucket: props.bucket })
      redraw()
    }
  })
  // While nothing is dragged the plugin's lists are the truth
  if (live.id === undefined) live.lists = copy(props.lists)
  const board = layout(live.lists)
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
        paddingLeft={cols(CARD_PAD_X_PT)}
        paddingRight={cols(CARD_PAD_X_PT)}
        flexDirection="column"
      >
        {/* A Client is laid on whole cells: no fraction of a row as padding. The title and the figure sit in the tile's first
            ARRANGE_CLOSED_ROWS rows on every tile, so the titles of a row of tiles line up and both lines always show */}
        <Box flexDirection="column" justifyContent="center" height={Math.min(rows, ARRANGE_CLOSED_ROWS)} flexShrink={1}>
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
      </Box>
    )
  }
  const liftedAt = live.id === undefined ? undefined : board.tiles.get(live.id)
  return (
    <Box position="relative" width="100%" height={props.rows}>
      {board.empty.map(r => (
        // An empty column's drop place: a dim outline that exists only while arranging
        <Box key={`drop-${r.col}`} position="absolute" top={r.y + ARRANGE_TOP} left={r.x} width={r.w} height={r.tall} borderStyle="round" borderColor={CARD_LINE} justifyContent="center" alignItems="center">
          <Text dimColor wrap="truncate-end">
            {props.dropWord}
          </Text>
        </Box>
      ))}
      {[...board.tiles.entries()].filter(([id]) => id !== live.id).map(([id, r]) => tile(id, r.x, r.y, r.w, r.tall, false))}
      {live.id === undefined || liftedAt === undefined ? null : tile(live.id, live.x, live.y, liftedAt.w, liftedAt.tall, true)}
    </Box>
  )
}

export default Arrange
