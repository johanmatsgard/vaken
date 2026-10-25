// Words for the card flip and the back button, with Swedish; no imports, since the settings registry reads them back.
export const SHOW_LABEL = 'Show this card'
export const DETAIL_LABEL = 'Detail of this card'
export const BACK_LABEL = '‹ Back'
// The flip side's link, one form on every card: "More in Settings", or "{n} more in Settings" when this card's settings did not all fit
export const MORE_IN_SETTINGS = 'More in Settings ›'
export const N_MORE_IN_SETTINGS = '{n} more in Settings ›'
// The Autopilot face's one row for the working habits, which live in Settings
export const HABITS_LINK = 'Working habits in Prompts and memory ›'
export const SETTINGS_WORD = 'Settings'
// Arranging: the header's word, then ONE dim line under it (with Auto hidden cards, its longer form), the Problems first line, and the way to Settings > Cards
export const ARRANGING_WORD = 'Arranging'
export const ARRANGING_LINE = 'Drag a card to move it. This width only.'
export const ARRANGING_LINE_AUTO = 'Drag a card to move it. This width only. Cards Auto hides are not here.'
export const ARRANGING_PROBLEMS = 'Cards with a problem move to the top of their column.'
export const ARRANGING_SHOW_HIDE = 'Show or hide cards ›'
// The drop place of an empty column while arranging
export const ARRANGE_DROP = 'Drop a card here'
export const ARRANGING_TO_CUSTOM = 'Switched to Custom so you can arrange. Your cards stay the same.'
// Arrange from Standard or All when a Custom set already exists: that set is kept and shown
export const ARRANGING_OWN_CUSTOM = 'Switched to your Custom cards so you can arrange them.'

export const SPENDING_TITLE = 'Spending limits (estimates)'
export const CARDSETTINGS_VIEW_STRINGS: string[] = [SPENDING_TITLE, SHOW_LABEL, DETAIL_LABEL, BACK_LABEL, MORE_IN_SETTINGS, N_MORE_IN_SETTINGS, HABITS_LINK, SETTINGS_WORD, ARRANGING_WORD, ARRANGING_LINE, ARRANGING_LINE_AUTO, ARRANGING_PROBLEMS, ARRANGING_SHOW_HIDE, ARRANGE_DROP, ARRANGING_TO_CUSTOM, ARRANGING_OWN_CUSTOM]
