// Chat answers are read as markdown: lines in a row run together into one paragraph, and a word in angle brackets vanishes as a tag.
// Two or more lines are real list lines, so they never run together; one line stays as it is.
export const mdList = (lines: readonly string[]): string => (lines.length < 2 ? (lines[0] ?? '') : lines.map(l => `- ${l}`).join('\n'))

// A command with a word in angle brackets is code, so the brackets show: `/vaken show <file>`
export const code = (s: string): string => `\`${s}\``
