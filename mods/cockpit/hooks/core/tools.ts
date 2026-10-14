// The tools that change a file, named once so every block reads one list.
export const EDIT_TOOLS: ReadonlySet<string> = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit'])

export const isEditTool = (tool: string): boolean => EDIT_TOOLS.has(tool)

// On Windows Claude Code has two shell tools: Bash (Git Bash) and PowerShell (5.1). Every safety block reads this list.
export type ShellFlavor = 'posix' | 'powershell'
const SHELL_TOOLS: Readonly<Record<string, ShellFlavor>> = { Bash: 'posix', PowerShell: 'powershell' }

export const shellFlavorOfTool = (tool: string): ShellFlavor | undefined => (Object.prototype.hasOwnProperty.call(SHELL_TOOLS, tool) ? SHELL_TOOLS[tool] : undefined)
export const isShellTool = (tool: string): boolean => shellFlavorOfTool(tool) !== undefined

// Monitor runs its command as a watch; the safety checks treat it like a shell command.
const WATCH_TOOLS: Readonly<Record<string, ShellFlavor>> = { Monitor: 'posix' }

export const commandFlavorOfTool = (tool: string): ShellFlavor | undefined =>
  shellFlavorOfTool(tool) ?? (Object.prototype.hasOwnProperty.call(WATCH_TOOLS, tool) ? WATCH_TOOLS[tool] : undefined)
export const runsCommand = (tool: string): boolean => commandFlavorOfTool(tool) !== undefined
