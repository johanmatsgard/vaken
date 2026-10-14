// The tests' way to run a function that is a word after a command: the line `/cockpit-usage cost` is `viaParent.
import { FOLDED, HIDDEN } from '../hooks/core/menu'

export function viaParent(command: string, args = ''): { command: string; args: string } {
  const word = command.replace(/^vaken-/, '')
  for (const [parent, words] of Object.entries(FOLDED)) {
    if (words.includes(word)) return { command: parent, args: `${word} ${args}`.trim() }
  }
  if (HIDDEN.includes(word)) return { command: 'vaken-help', args: `run ${word} ${args}`.trim() }
  return { command, args }
}
