// The engine calls the pane's files need, as closures.
import type { CommandRunArgs, CommandRunResult, McpToolResult, SessionMessage, SessionSendResult, Timer } from 'claude-code'

import type { Io } from '../../core/io'
import type { RunnerOps } from '../orchestra'
import type { TitleSource } from '../../core/transcripttitle'
import type { Probe } from '../../core/undo'

export type HomeEngine = {
  io: () => Io
  now: () => Promise<number>
  every: (ms: number, f: () => void) => Timer
  mcpCall: (server: string, tool: string, args?: Record<string, unknown>) => Promise<McpToolResult>
  command: (args: CommandRunArgs) => Promise<CommandRunResult>
  cwd: () => Promise<string>
  submit: (text: string) => Promise<unknown>
  fill?: (text: string, mode?: 'replace' | 'append') => Promise<{ isFilled: boolean }>
  boxText?: () => Promise<string>
  commandList: () => Promise<unknown>  // `$.command.list()`: the engine's commands and skills (read by core/skills.ts commandEntries)
  after: (ms: number, f: () => void) => unknown
  toast: (text: string) => void
  messages: () => Promise<SessionMessage[]>
  runnerOps: () => RunnerOps  // the task runner's engine calls
  send: (sessionId: string, text: string) => Promise<SessionSendResult>
  titleSource?: () => TitleSource
  pluginName: () => string
  probe?: Probe
  agentsRunning?: () => Promise<number>
}
