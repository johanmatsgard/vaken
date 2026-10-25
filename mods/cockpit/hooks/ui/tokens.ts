// Every size and colour vaken draws, in points

// One text column differs per system with the same app: the Windows pane's font is narrower than the Mac's
export const COL_PT_MAC = 8.8  // One text column on a Mac (and every system but Windows), in points
export const COL_PT_WIN = 7.9  // One text column on Windows, in points
let columnSystem: 'posix' | 'win32' = 'posix'
// The system is handed in once at session start (features/home.tsx, from the OS variable), before anything is drawn; never process.platform
export const setColumnSystem = (sys: unknown): void => {
  columnSystem = sys === 'win32' ? 'win32' : 'posix'
}
// One text column on this system, in points: every width in cells goes through it, so nothing freezes the Mac value at import
export const columnPt = (): number => (columnSystem === 'win32' ? COL_PT_WIN : COL_PT_MAC)
export const ROW_PT = 20  // One text row, in points: the line pitch of every card
export const VSTEP_PT = ROW_PT / 2  // Half a row: vertical padding and margins come in steps of it
export const BORDER_Y_PT = 0.5  // What the round border adds above and below a card, in points
export const BORDER_X_PT = 13.5  // What the round border and the card's own side padding add on each side of a card (the app's 13.5 pt text inset)
export const CARD_LINE_X_PT = 1  // The round border's own line on each side, before the side padding (measured: text sits 1 pt inside it with no padding)
export const CARD_PAD_X_PT = BORDER_X_PT - CARD_LINE_X_PT  // A card's own side padding: set on every card, so the host's default (about 16 pt) never applies
export const CARD_MIN_INNER_PT = 60  // The least inner width of a card, in points

const two = (n: number): number => Math.round(n * 100) / 100
// Points to cells, for the three kinds of vertical and horizontal measure a Box takes
export const cols = (pt: number): number => two(pt / columnPt())
export const rows = (pt: number): number => two(pt / ROW_PT)  // Points to rows (vertical, whole text rows)
export const vstep = (pt: number): number => two(pt / VSTEP_PT)  // Points to half-rows: the unit of vertical padding and margin

// Sizes: every vertical gap, padding
export const CARD_GAP = VSTEP_PT  // Space between two cards, and between the blocks of a view, vertically
export const cardGapX = (): number => columnPt()  // Space between two cards side by side (the board's columns) and between two buttons in a row
export const CARD_PAD_Y_PT = VSTEP_PT - BORDER_Y_PT  // A card's own padding above and below
export const CARD_INSET_Y_PT = BORDER_Y_PT + CARD_PAD_Y_PT  // Every card's top (and bottom) inset, outline to first text row
export const CLOSED_CARD_H = 2 * CARD_INSET_Y_PT + ROW_PT  // A closed card's whole height, in points
export const LIST_ROW_H = ROW_PT  // Height of a one-line list row: one text row
// One rule for every card body
export const BODY_GAP = VSTEP_PT  // From a card's header (its Glance row, or the subtitle or controls line under it)
export const BODY_ROW_GAP = VSTEP_PT  // Between two rows or blocks of a card body
export const BLOCK_RULE_PT = 2 * VSTEP_PT  // The box of a hairline between two groups of a card body
export const LIST_ROW_GAP = VSTEP_PT  // Space between two list rows
export const LIST_ROW_PAD_PT = LIST_ROW_H - ROW_PT  // A list row's room above and below its text together
export const TRY_ROW_PT = 2 * ROW_PT + LIST_ROW_PAD_PT  // Help > Try these: a command row, the command over its plain line, one press
// The least space between the left part of a row (mark, word, name) and its right part (a chip or an age)
export const LIST_COL_GAP = 8
// The Glance row: a card's closed form, one list row high
export const GLANCE_ROW_H = LIST_ROW_H  // Glance row: its height, a list row's (19 pt)
export const GLANCE_VALUE_GAP = LIST_COL_GAP  // Glance row: the least space between the title and the headline value
export const GLANCE_DOT_GAP = LIST_COL_GAP  // Glance row: space between the headline value and the status dot
// The right column of a list (an age or a chip) has one fixed width, right-aligned
export const LIST_RIGHT_COL = 76
// The columns of every list, left to right: mark (6 pt dot plus 13 pt), word (this wide)
export const LIST_WORD_COL = 71
// The word column grows to the widest state word of the language in use (kit wordColPt), never past this, so the name keeps its room
export const LIST_WORD_COL_MAX = 112
// A pane narrower than this (inner width, points) stacks each row: dot and name on the first line
export const STACK_BELOW_PT = 300

// A wide pane (a big screen) puts the cards side by side, so rows do not stretch over a whole screen
export const COLUMN_MIN_PT = 348  // The least pane body width per card column: whole 8.8 pt cells keep every card at least STACK_BELOW_PT inside at every column count
export const COLUMNS_2_FROM_PT = 2 * COLUMN_MIN_PT  // Pane body width from which the cards sit in two columns (696 pt)
export const COLUMNS_3_FROM_PT = 3 * COLUMN_MIN_PT  // Pane body width from which the cards sit in three columns (1044 pt)
export const COLUMNS_4_FROM_PT = 4 * COLUMN_MIN_PT  // Pane body width from which the cards sit in four columns (1392 pt, a large screen)
export const COLUMNS_5_FROM_PT = 5 * COLUMN_MIN_PT  // Pane body width from which the cards sit in five columns (1740 pt)
export const COLUMNS_6_FROM_PT = 6 * COLUMN_MIN_PT  // Pane body width from which the cards sit in six columns (2088 pt, a very wide screen)
export const MAX_COLUMNS = 6  // The most columns the cards ever use, however wide the pane
export const ONE_COLUMN_MAX_PT = 2 * COLUMN_MIN_PT  // One column (Columns 1) on a wide pane: its reading width at most, two card widths (696 pt), at the left
// The arrange board (a `Client`, drawn in whole text cells): tiles one column apart
export const ARRANGE_GAP = 1  // Arrange board: columns between tiles
export const ARRANGE_PAD = 1  // Arrange board: columns between a tile's title and its zone tag
export const ARRANGE_MIN_ROWS = 3  // Arrange board: the least rows a tile is high
export const ARRANGE_TOP = 0  // Arrange board: rows above the first tile
export const ARRANGE_ROW_GAP = Math.ceil(rows(CARD_GAP))  // Arrange board: rows between two tiles of a column: the pane's gap between cards, rounded up to the whole row a Client is laid on
export const ARRANGE_CLOSED_ROWS = Math.ceil(rows(CLOSED_CARD_H))  // Arrange board: a closed card's tile (Glance), as high as the closed card
export const ARRANGE_TILE_MIN_COLS = 6  // Arrange board: the least columns per tile when the board measures its own width
export const ARRANGE_FALLBACK_COLS = 90  // Arrange board: the width in columns it assumes before its region reports one
// How many columns fit a pane body this wide (Auto): the most N whose threshold the width reaches
export const COLUMN_THRESHOLDS_PT = [COLUMNS_2_FROM_PT, COLUMNS_3_FROM_PT, COLUMNS_4_FROM_PT, COLUMNS_5_FROM_PT, COLUMNS_6_FROM_PT]
export const columnsFor = (bodyPt: number): 1 | 2 | 3 | 4 | 5 | 6 => (1 + COLUMN_THRESHOLDS_PT.filter(t => bodyPt >= t).length) as 1 | 2 | 3 | 4 | 5 | 6  // Columns that fit a pane width

// A list longer than this shows this many rows and a "show more" row (like the sidebar's "Mer")
export const LIST_SHOW = 5
// Big screens show more rows before "Show N more" (W, the rule is `listShowFor` in home/grid.ts)
export const LIST_TALL_ROWS = 34  // Rows of pane body per LIST_SHOW rows of a list (one laptop screen, 680 pt)
export const LIST_SHOW_MAX = 25  // The most rows a list shows before "Show N more"
export const PAST_RUNS_SHOW = 3  // Agents view: the past runs shown before "Show N more" (the newest; the rest fold)
export const AGENTS_DONE_SHOW = 5  // Agents card: the most finished helpers shown before "Show N older"
export const AGENT_STEPS_SHOW = 5  // Agents card: an opened agent row lists its last this many steps
export const SETTINGS_CHANGED_SHOW = 4  // Settings > Mode: the most "Changed by you" rows shown before "Show N more"
export const HELP_TOPIC_SHOW = 5  // Help: the questions a topic card shows before "Show N more" (and the Try these rows)
// The sidebar's fold control (measured on its project groups): a thin chevron after the label
export const CHEVRON_LONG = 8  // Fold chevron: long side
export const CHEVRON_SHORT = 4.5  // Fold chevron: short side
export const CHEVRON_STROKE = 1.2  // Fold chevron: line width
export const CHEVRON_SLOT = 8  // Fold chevron: slot width
export const CHEVRON_GAP = 6.5  // Fold chevron: space after the label
// The sidebar's "Mer" row (an expander in the icon column): a larger chevron, 5.5 x 10 pt
export const MORE_CHEVRON_LONG = 10  // Show-more chevron: long side
export const MORE_CHEVRON_SHORT = 5.5  // Show-more chevron: short side
// Icon buttons (measured on the sidebar and the status card), in points: plus 10 x 10 (1 pt line)
export const ICON_PLUS = 10  // Plus icon size
export const ICON_CLOSE = 8  // Close icon size
export const ICON_MORE_W = 2  // More icon width (three dots)
export const ICON_MORE_H = 8  // More icon height
export const ICON_STROKE = 1  // Icon line width
// The gear that flips a card to its settings (drawn by eye; a ring of eight thin spokes reads as a sun)
export const ICON_GEAR = 12  // Gear icon size (a square)
export const ICON_GEAR_TEETH = 6  // Gear icon: how many teeth
export const ICON_GEAR_TIP = 5.4  // Gear icon: radius of a tooth's tip
export const ICON_GEAR_ROOT = 4  // Gear icon: radius of the body between the teeth
export const ICON_GEAR_HOLE = 1.7  // Gear icon: radius of the hole in the middle
export const ICON_GEAR_TIP_SHARE = 0.32  // Gear icon: a tooth's tip, as a share of the angle from one tooth to the next
export const ICON_GEAR_FOOT_SHARE = 0.52  // Gear icon: a tooth's foot
export const ICON_COLOR = '#52514f'  // Icon grey, light mode
export const ICON_COLOR_DARK = '#c3c2b8'  // Icon grey, dark mode
export const ICON_DIM = '#878580'  // Dim icon grey: the pin and the mark on a bar
// Every icon sits in a slot this wide (the plain button over it is about this wide)
export const ICON_SLOT = 16
export const ICON_GAP = 8.5  // Space between two icon slots
export const DOT = 6  // State dot diameter
// The pin on a pinned row, drawn after the name: a small outline pin in the dim icon grey
export const PIN_W = 8
export const PIN_H = 12  // Pin height
export const PIN_GAP = 6  // Space between the name and the pin
// The working dot's pulse, measured in the app by a burst: full to 30% and back every 1.21 s, eased
export const PULSE_SECONDS = 1.2  // Working dot pulse: seconds per cycle
export const PULSE_LOW = 0.3  // Working dot pulse: lowest opacity
export const DOT_TEXT_GAP = 13  // Space from the dot to the text after it
// The dot shapes (state is never colour alone): needs you a diamond
export const DOT_RING_W = 1.2  // Dot: line width of the calm ring
// The usage bar (Settings, Usage, measured in the app)
export const BAR_H = 4  // Usage bar thickness
export const BAR_R = 2  // Usage bar corner radius
// A busy bar (work is running: the in-progress bars only, never a plan limit, memory or processor bar)
export const BAR_BUSY_BAND_PT = 36  // Busy bar: width of the sweeping band (an estimate, tune live)
export const BAR_BUSY_SECONDS = 1.5  // Busy bar: seconds per pass of the band (an estimate, tune live against the app's own bar)
export const BAR_BUSY_COLOR = '#ffffff'  // Busy bar: colour of the overlay band (white, so it lightens any fill)
export const BAR_BUSY_OPACITY = 0.3  // Busy bar: opacity of the white band over the fill
// A bar sits in a slot one text row tall (BAR_SLOT), centred
export const BUTTON_PAD = 6  // Padding of a plain Button on its left
export const BAR_SLOT = ROW_PT  // Height of the slot a bar sits in: one text row
// A bar's picture is at least this wide, in points
export const BAR_CANVAS_PT = 1600
// A mark on a bar (where auto-compact starts on the context bar): a thin upright line
export const MARK_H = 8  // Height of the canvas of a bar with a mark
export const MARK_W = 1.5  // Width of the mark
// The air between the groups of lines inside a card, and between a card's title and its first group
export const GROUP_GAP = VSTEP_PT
// The air between the limits of the plan card, and before its Plan group: one whole row
export const LIMIT_GAP = ROW_PT
// The air between the advice lines of the session card and the "Compact now" button under them
export const ADVICE_BUTTON_GAP = VSTEP_PT  // Gap above a row of buttons under text (the Compact now button)
export const BAR_PCT_COL = 32  // Width of the percentage column beside a one-row bar
export const BAR_PCT_GAP = 10  // Space between a one-row bar and its percentage
// The band's own padding inside the app's card
export const BAND_PAD_X = 4.4  // Band: own padding inside the app card
export const BAND_GAP = 16  // Band: space between its parts
export const BAND_MARK_PT = 14  // Band: the mark and the space before the posted line
export const BAND_CHIP_W = 48  // Band: width of the small plan bar in the chip on the right
export const CHIP_H = 18  // Chip height
export const CHIP_PAD = 7  // Chip side padding
export const CHIP_CHAR_PT = 6.1  // Chip: width of one letter of its text, in points
export const CHIP_TEXT = 11.5  // Chip text size


// Colours are written here AS THE APP SHOWS THEM in a screenshot (that is how they were measured)
const INVERSE = [
  [1.22188, -0.22329, 0.00111],
  [-0.04149, 1.04159, -0.00019],
  [-0.01975, -0.07945, 1.09531],
]
const toLinear = (v: number): number => {
  const c = v / 255
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}
const toByte = (l: number): number => {
  const c = Math.max(0, Math.min(1, l))
  return Math.round(255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055))
}
const hex2 = (n: number): string => (n < 16 ? '0' : '') + n.toString(16)
export function seen(shown: string): string {
  const rgb = [1, 3, 5].map(i => toLinear(parseInt(shown.slice(i, i + 2), 16)))
  return '#' + INVERSE.map(row => hex2(toByte(row[0] * rgb[0] + row[1] * rgb[1] + row[2] * rgb[2]))).join('')
}

// Colours: see-through greys (one value suits light and dark)
export const CARD_FILL = 'rgba(128,128,128,0.10)'  // Card background: see-through grey
export const CARD_FILL_SHARE = 0.1  // CARD_FILL's share of the grey, for a picture that repaints the card
export const HOVER_FILL = '#80808029'  // Hover wash
export const CARD_HOVER_FILL = '#8080803e'  // A closed card's own fill while the pointer is over it (it presses as a whole)
export const HOVER_CLEAR = '#00000000'  // A pressable row's cover buttons draw no light of their own
// A whole row presses: a see-through plain Button of blanks lies over each text line
export const BLANK_PT = 3.875  // The width of one no-break blank in pane text (20 blanks measure 77.5 pt)
export const PRESS_INSET = BUTTON_PAD  // The plain Button's own left inset before its label
export const PRESS_FILL = 0.97  // The share of the row the blanks fill
// The hover wash of a pressable row (rounded, with room around the words)
export const PRESS_WASH_OUT = 1  // Columns the wash reaches past the words on each side
export const PRESS_WASH_R = 5  // The wash's corner radius, in points (the sidebar's selected row, measured about 5 pt)
export const PRESS_WASH_GREY = '#808080'  // The wash's grey, as HOVER_FILL, drawn in a picture
export const PRESS_WASH_OPACITY = 0.16  // The wash's share of that grey, as HOVER_FILL (#808080 at 16%)
// The switch of an on/off setting: off left, on right, always
export const SWITCH_W = 26  // Switch width
export const SWITCH_H = 15  // Switch height
export const SWITCH_KNOB = 11  // The knob's diameter
export const SWITCH_INSET = 2  // The knob's inset from the pill's edge
export const SWITCH_OFF_OPACITY = 0.35  // The off track: the wash grey at this share
export const SWITCH_KNOB_FILL = '#ffffff'  // The knob
export const SWITCH_SLOT = 34  // The slot the switch sits in at a row's right end (the switch and a little room to press)
export const SWITCH_BLANKS = 11  // The see-through press over the switch
// Small pressable pictures and words: a chevron or icon slot is 8 to 16 pt
export const HIT_ICON_W = 44  // The least width of the part that holds an icon, a chevron or the gear
export const switchHitW = (): number => SWITCH_SLOT + PRESS_WASH_OUT * columnPt()  // The switch's own press, in points
export const PRESS_END_PT = 56  // A second press laid at the right edge of every pressable row
// Press sizes: every press is at least a sidebar row high, so it is easy to hit
export const HIT_MIN_H = ROW_PT  // The least height of any press, in points: one text row (19)
export const PRESS_ROW_H = ROW_PT  // The height of a press laid INSIDE a text row
export const PRESS_FRAME_H = ROW_PT + VSTEP_PT  // The height of a press that shows its own frame or wash
export const GEAR_SLOT = 44  // The slot of the gear that flips a card, in points
export const WORD_FOOT_W = 44  // The least width a lone word takes in the layout, in points
export const HEADER_SLACK_PT = 14  // Room kept free when a card header decides if its controls fit one row
export const FRAMED_TITLE_GAP_PT = CHEVRON_GAP  // The least space from a card title to a framed control beside it: the frame's own side air adds the rest
export const HIT_PAD_BLANKS = 2  // No-break blanks added each side of a small choice's or a More word's label
// A lone word at a card's right edge (More, Less, a jump word)
export const EDGE_WORD_OUT_PT = BUTTON_PAD + HIT_PAD_BLANKS * BLANK_PT
export const PRESS_LINE_CELLS = 1  // One cover Button's box: one cell row high (a cell row is one text row, 19 pt)
// WHAT PRESSES AND HOW IT LOOKS
export const FRAME_PAD_X_PT = 10  // Air each side of a framed word's letters inside its rounded frame
export const SEG_INSET_PT = 2  // A segmented choice: the chosen option's pill and an option's hover pill sit this
export const CHOSEN_FILL_SHARE = 0.32  // The chosen option's fill: the accent at this share
// The chosen fill as a Box colour
export const chosenFill = (accent: string): string => `${accent.slice(0, 7)}${Math.round(CHOSEN_FILL_SHARE * 255).toString(16).padStart(2, '0')}`
// A press that is shown in full only under the pointer
export const REST_MARK_OPACITY = 0.4  // The resting mark's opacity (decoration: the full mark and the row's words carry the meaning)
export const ACTIVE_LINE = '#80808080'  // Outline of a focused card
export const CARD_LINE = '#80808038'  // Outline of every card: the wash grey at 22%, soft in light and dark
export const RULE_H = 1  // Height of a hairline between the groups of rows inside a card
// The chosen option of a choice (Pick in ui/kit.tsx) is told to a screen reader by a picture this many points
export const SAID_MARK_PT = 1  // The side of that unseen picture, in points
// THE RADIO LIST: one choice of a few, one whole-row press per option with a round mark in front
export const RADIO_PT = 14  // The radio mark's diameter, in points (macOS regular radio button)
export const RADIO_RING_W = 1  // The ring of an option not chosen: its line width
export const RADIO_DOT_PT = 6  // The dot inside the chosen mark (the accent disc), in points
export const RADIO_TEXT_GAP = 6  // From the mark to the option's letters
export const RULE_BOX_H = 3  // Height of the picture that holds the hairline, in points
export const RULE_OPACITY = 0.22  // Its share of the wash grey
export const ROUND_LINE = '#00000000'  // The see-through border colour that gives rounded corners
export const GREY = seen('#878580')  // Working and idle dot grey
// Small text in grey (for contrast): GREY is 4.48 on the dark card and 3.20 on the light one
export const GREY_TEXT_LIGHT = '#625f5b'  // Small grey text, light mode: 5.51 on the light card
export const GREY_TEXT_DARK = '#9a988f'  // Small grey text, dark mode: 5.70 on the dark card
// An off switch in light mode: the pale track and white knob are 1.45 and 1.66 on the card
export const SWITCH_OFF_KNOB_LIGHT = GREY_TEXT_LIGHT  // Off switch knob, light mode
export const SWITCH_OFF_OUTLINE_LIGHT = GREY_TEXT_LIGHT  // Off switch outline, light mode
export const SWITCH_OUTLINE_W = 1  // Off switch outline width, light mode
// The two grounds the app shows behind a card: the contrast reference, and the colour a press's corner masks repaint
export const GROUND_LIGHT = '#fbfbf9'  // The app's light ground (reference for the contrast test)
export const GROUND_DARK = '#141413'  // The app's dark ground (reference for the contrast test)
// The tile being dragged is solid, not see-through, so what it passes over does not show through
export const ARRANGE_LIFT_FILL = seen('#3a3a38')  // Dragged tile: fill
export const ARRANGE_LIFT_TEXT = seen('#f2f1ec')  // Dragged tile: text
export const BLUE = seen('#4177d0')  // Finished dot, and bars below 80% (LEVEL_AMBER_PCT)
export const AMBER = seen('#f0b544')  // Needs-you dot, and bars from 80%
export const RED = seen('#d9534f')  // Bars from 90%
// Text in the state colour uses the theme's own key, which adapts to light and dark
export const WARNING = 'warning'
export const DANGER = 'error'  // Text in the red state colour (a figure from LEVEL_RED_PCT), the theme's own key
// The amber chip's word (light value measured on the app's own chip)
export const CHIP_TEXT_LIGHT = seen('#6d4714')  // Amber chip text, light mode
export const CHIP_TEXT_DARK = seen('#e8ad45')  // Amber chip text, dark mode
// The On and Off chips (for contrast): the word is 11.5 pt text straight on the card
export const CHIP_TEXT_OFF_LIGHT = '#5c5b57'  // Off chip text, light mode (about 6 on the light card)
export const CHIP_TEXT_OFF_DARK = '#a3a19a'  // Off chip text, dark mode (about 6.6 on the dark card)
export const CHIP_TEXT_ON_LIGHT: Record<string, string> = { native: '#1a56a8', violet: '#5a43ad', teal: '#00685e', rose: '#a8305a', green: '#2a6b35', ocean: '#1a5f86', slate: '#4a5666', plum: '#86377d' }  // On chip text by theme id, light mode (4.7 to 6.5)
export const CHIP_TEXT_ON_DARK: Record<string, string> = { native: '#8ab4f0', violet: '#b3a2f0', teal: '#3cc8b8', rose: '#f08aab', green: '#7cc98a', ocean: '#7cc0e6', slate: '#a9b6c8', plum: '#e09ad6' }  // On chip text by theme id, dark mode (5.9 to 8.3)

// Themes: a theme changes only the accent, the colour of the finished dot and of bars below 80% (LEVEL_AMBER_PCT)
export const THEME_VIOLET = seen('#7a62c9')  // Accent of the Violet theme
export const THEME_TEAL = seen('#2f9e92')  // Accent of the Teal theme
export const THEME_ROSE = seen('#c9577a')  // Accent of the Rose theme
// Four more: each reads 3.3 or more as a mark on the light and the dark card, so none needs a light twin. No amber or red: those mean attention
export const THEME_GREEN = '#3a8f49'  // Accent of the Green theme: 3.50 light, 4.09 dark
export const THEME_OCEAN = '#2a83b2'  // Accent of the Ocean theme: 3.66 light, 3.92 dark
export const THEME_SLATE = '#6b7a8f'  // Accent of the Slate theme: 3.80 light, 3.78 dark
export const THEME_PLUM = '#a5509b'  // Accent of the Plum theme: 4.32 light, 3.32 dark
export const THEME_ACCENTS: Record<string, string> = { native: BLUE, violet: THEME_VIOLET, teal: THEME_TEAL, rose: THEME_ROSE, green: THEME_GREEN, ocean: THEME_OCEAN, slate: THEME_SLATE, plum: THEME_PLUM }  // Accent by theme id
// Marks in light mode: the Teal accent is 2.80 on the light card, so Teal has a darker twin for light
export const THEME_TEAL_LIGHT = '#00867a'  // Teal accent as a mark in light mode: 3.89 on the light card
export const AMBER_LIGHT = '#a86f00'  // Amber as a mark (dot, bar) in light mode: 3.69 on the light card
export const RED_LIGHT = RED  // Red as a mark in light mode: 3.32 on the light card, passes 3 as it
export const THEME_ACCENTS_LIGHT: Record<string, string> = { native: BLUE, violet: THEME_VIOLET, teal: THEME_TEAL_LIGHT, rose: THEME_ROSE, green: THEME_GREEN, ocean: THEME_OCEAN, slate: THEME_SLATE, plum: THEME_PLUM }  // Accent by theme id, as a mark in light mode
// The theme id of an accent colour (what `look.accent` holds), 'native' when it is none of them
export const themeOfAccent = (accent: string): string => Object.keys(THEME_ACCENTS).find(k => THEME_ACCENTS[k] === accent) ?? 'native'
// The accent as a mark in light mode: the same accent, darker where the theme needs it
export const accentLight = (accent: string): string => THEME_ACCENTS_LIGHT[themeOfAccent(accent)] ?? accent
export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'  // The media query for the Mac's Reduce Motion
// The working dot's opacity when motion is reduced: it holds still instead of pulsing
export const REDUCED_DOT_OPACITY = 0.75  // Dark: the mark grey at this opacity is 3.14 on the dark card
// In light mode the working dot is the darker grey at this opacity: 3.22 on the light card
export const REDUCED_DOT_OPACITY_LIGHT = 0.8
export const SWITCH_SLIDE_MS = 150  // The switch knob's slide from the old to the new place
export const STATE_PULSE_MS = 180  // A state chip's single pulse when its setting has just changed (opacity 1, STATE_PULSE_LOW, 1)
export const STATE_PULSE_LOW = 0.6  // The lowest opacity of that pulse
export const SWITCH_ANIM_WINDOW_MS = 600  // How long after a press a redraw still draws the animation
// What the person chose in Settings > Cards and look
export const look: { accent: string; motion: boolean } = { accent: BLUE, motion: true }

export const LEVEL_AMBER_PCT = 80  // A bar (and the band's figure beside it) turns amber from this much used: the same point as LIMIT_HOT_PCT, so the colour always has its word ("Near the limit")
export const LEVEL_RED_PCT = 90  // A bar (and the band's figure beside it) turns red from this much used
// Bars change colour with the level: accent, amber from 80%, red from 90%
export const levelColor = (pct: number): string => (pct >= LEVEL_RED_PCT ? RED : pct >= LEVEL_AMBER_PCT ? AMBER : look.accent)
// The same, as a mark in light mode: red as it is, the darker amber, the accent's light twin
export const levelColorLight = (pct: number): string => (pct >= LEVEL_RED_PCT ? RED_LIGHT : pct >= LEVEL_AMBER_PCT ? AMBER_LIGHT : accentLight(look.accent))

// The back face of a flipped card: compact
export const FACE_ROW_PT = LIST_ROW_H + VSTEP_PT  // Flipped card: the pitch of one settings row on the face, in points
export const FACE_MIN_ROWS = 3  // Flipped card: the fewest settings rows the face shows
// `‹ Back`
export const BACK_GAP = CHEVRON_GAP  // `‹ Back`: space from its chevron to its word (the fold chevron's 6.5 pt gap)

// The five text roles
export const SECTION_TEXT = 11.5  // Section label: text size in the picture
export const SECTION_CHAR_PT = 6.3  // Section label: width of one letter in the picture's box
export const SECTION_PAD = 3  // Section label: slack added to the picture's width, in points
export const SECTION_WIDE_EM = 0.86  // Section label: width of M, W, m and w, in em (a share of SECTION_TEXT)
export const SECTION_CAP_EM = 0.68  // Section label: width of other capitals, in em
export const SECTION_NARROW_EM = 0.32  // Section label: width of i, l, j, t, f, r, marks and a blank, in em
export const SECTION_LETTER_EM = 0.55  // Section label: width of every other letter and digit, in em
export const SECTION_H = ROW_PT  // Section label: height of the picture, in points: one text row
export const SECTION_GAP = VSTEP_PT  // Section label: air above it, in points (half a row)
export const SECTION_COLOR_LIGHT = GREY_TEXT_LIGHT  // Section label: the dim text grey, light mode (5.51 on the card)
export const SECTION_COLOR_DARK = GREY_TEXT_DARK  // Section label: the dim text grey, dark mode (5.70 on the card)
// How wide a line of pane text really
export const TEXT_CHAR_PT = 7.8  // Average width of one letter of normal pane text, in points
// For example, "Detail level, accent colour and which cards show." is one line in a 344 pt card
export const TEXT_SPACE_PT = 4.05  // A space
export const TEXT_NARROW_PT = 3.5  // I j l
export const TEXT_THIN_PT = 5.2  // T f r I and ( ) - / (thin letters)
export const TEXT_ROUND_PT = 8  // Every other lowercase letter and digit
export const TEXT_CAP_PT = 9.4  // A capital letter
export const TEXT_WIDE_PT = 11.5  // M w M W (wide letters)
export const NOTE_MIN_LETTERS = 12  // A header note that would keep fewer letters than this is dropped
export const BAND_FIT_SLACK_PT = 4  // Band: room kept free when parts are fitted to the width, for the error of the letter estimate (measured within 4 pt per part)
export const BAND_LINE_MIN_PT = NOTE_MIN_LETTERS * TEXT_CHAR_PT  // Band: a posted line keeps at least this much room, so a mark never stands without its words
export const NOTE_MAX_LINES = 2  // A note line in a card
export const CHOICE_NOTE_MIN_PT = 210  // A settings row's note beside its choices keeps at least this many points
export const BOLD_CHAR_PT = 8  // Average width of one letter of bold pane text (card titles), in points
export const SETTING_ROW_GAP = VSTEP_PT  // The gap between two setting rows on a flipped card's face
// Air in the Settings view
export const SETTINGS_ROW_GAP = VSTEP_PT  // The gap between two settings in the Settings view: half a row
export const CHOICE_NOTE_GAP = VSTEP_PT  // From a setting's words (label and note) to its choices when they sit under the words
export const settingsSpanGap = (): number => 2 * columnPt()  // The gap between the inner columns of an opened Settings section that spans several columns
export const SETTINGS_OPEN_ROWS_PER_COLUMN = 6  // An opened Settings section on a wide pane spans one column for each 6 rows it holds
