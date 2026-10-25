// The stability layer: remembers the engine version, runs small self-tests on every load and says plainly when the version changed or a test fails.
import { tr } from './lang'
import { fillIn } from './fillin'
import type { Setting } from './settings'
import type { HelpEntry } from './registry'

export type TestResult = { name: string; ok: boolean; why?: string }
export type Health = { at: number; version: string; previous?: string; results: TestResult[] }

export const HEALTH_KEY = 'cockpit:health'
export const CHECKED_WHAT = 'Checked itself after an update'
export const BROKEN_WHAT = 'Found something broken'

export const STABILITY_SETTINGS: Setting[] = [
  {
    key: 'stability.check',
    group: 'Health',
    label: 'Self-test',
    note: 'Checks vaken itself after an update.',
    options: [
      { value: 'on', label: 'On' },
      { value: 'off', label: 'Off' },
    ],
    default: 'on',
  },
]

export const STABILITY_HELP: HelpEntry[] = [{ title: 'Does vaken still work after an update?', text: 'After the app updates, vaken tests its own parts. If one part broke, it tells you which, and the rest keeps working. Run /vaken-help run health any time.' }]

export const changed = (previous: string | undefined, version: string): boolean => previous !== undefined && previous !== version

export const failures = (results: TestResult[]): TestResult[] => results.filter(r => !r.ok)

export function summary(h: Health): string {
  const bad = failures(h.results)
  if (bad.length > 0) return tr('{bad} of {all} self-tests failed: {names}.').replace('{bad}', String(bad.length)).replace('{all}', String(h.results.length)).replace('{names}', bad.map(b => b.name).join(', '))
  return changed(h.previous, h.version) ? tr('Updated from {prev} to {ver}. All {all} self-tests passed.').replace('{prev}', String(h.previous)).replace('{ver}', String(h.version)).replace('{all}', String(h.results.length)) : tr('All {all} self-tests passed.').replace('{all}', String(h.results.length))
}

// After an update that passed its self-tests the toast names only the new version; calm is quiet, so no count.
export const updatedText = (h: Pick<Health, 'version'>): string => tr('Updated to {ver}.').replace('{ver}', String(h.version))

export function healthText(h: Health | undefined): string {
  if (h === undefined) return tr('Vaken has not checked itself yet. It does this when a session starts.')
  return [
    fillIn(tr('Engine version: {version}{was}.'), { version: h.version, was: changed(h.previous, h.version) ? ` ${fillIn(tr('(was {prev})'), { prev: String(h.previous) })}` : '' }),
    summary(h),
    '',
    ...h.results.map(r => `${r.ok ? '✓' : '✗'} ${tr(r.name)}${r.ok || r.why === undefined ? '' : `: ${tr(r.why)}`}`),
  ].join('\n')
}
