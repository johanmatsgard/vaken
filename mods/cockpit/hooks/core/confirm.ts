// A yes or no question. The engine's ask returns the pressed label, so a yes counts only when the two labels differ; a language giving both buttons one word never turns No into a yes.
export type Buttons = { yes: string; no: string }

export const saidYes = (answer: string, b: Buttons): boolean => b.yes !== '' && b.yes.trim().toLowerCase() !== b.no.trim().toLowerCase() && answer === b.yes
