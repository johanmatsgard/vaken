// What a tool call does outside this computer: the kind of effect and where, never the content. Reads always pass. A guess from names and words, not a lock.
import { isWindowsShape, splitArgs, winCommandsOf } from './guardwin'
import { commandFlavorOfTool } from './tools'
import type { ShellFlavor } from './tools'
import { commandsOf, flagsOf } from './guardshell'
import type { Cmd, Tok } from './guardshell'

type Cls = 'send' | 'change' | 'delete' | 'invite' | 'merge' | 'pay'
type Kind = 'message' | 'comment' | 'reaction' | 'post' | 'release' | 'calendar' | 'ticket' | 'pull request' | 'file' | 'payment' | 'cloud' | 'web' | 'item' | 'package'
type Label = readonly [one: string, many: string]

// `routine` marks normal work (a pull request opened or merged the plain way): Warn says nothing, Hold still holds it.
export type Outward = { to: string; label: Label; guarded: boolean; write: boolean; now: string; past: string; why: string; routine?: boolean }

type Spec = {
  cls: Cls
  kind: Kind
  to: string
  noun?: string
  at?: string
  label?: Label
  why?: string
  verb?: readonly [string, string]
  guarded?: boolean
  routine?: boolean
}

const NOUN: Record<Kind, string> = { message: 'a message', comment: 'a comment', reaction: 'a reaction', post: 'a post', release: 'a release', calendar: 'a calendar event', ticket: 'a ticket', 'pull request': 'a pull request', file: 'a file', payment: 'a payment', cloud: 'cloud resources', web: 'data', item: 'something', package: 'a package' }
const LABEL: Record<Kind, Label> = {
  message: ['message', 'messages'],
  comment: ['comment', 'comments'],
  reaction: ['reaction', 'reactions'],
  post: ['post', 'posts'],
  release: ['release', 'releases'],
  calendar: ['calendar change', 'calendar changes'],
  ticket: ['ticket change', 'ticket changes'],
  'pull request': ['pull request change', 'pull request changes'],
  file: ['file change', 'file changes'],
  payment: ['payment action', 'payment actions'],
  cloud: ['cloud change', 'cloud changes'],
  web: ['web change', 'web changes'],
  item: ['change', 'changes'],
  package: ['package publish', 'package publishes'],
}
const SEND_VERB: Partial<Record<Kind, readonly [string, string]>> = { comment: ['add', 'added'], reaction: ['add', 'added'], post: ['publish', 'published'], release: ['publish', 'published'], package: ['publish', 'published'] }
const OTHERS = new Set<Kind>(['message', 'comment', 'reaction', 'post', 'release', 'calendar', 'ticket', 'pull request', 'package'])

const WHY_OTHERS = 'it changes something other people see.'
const WHY_OUTSIDE = 'it changes something outside your computer.'
const WHY_MONEY = 'it moves money.'
const WHY_GONE = 'it deletes something outside your computer, and it may not come back.'

function verbOf(s: Spec): readonly [string, string] {
  if (s.verb !== undefined) return s.verb
  if (s.cls === 'send') return SEND_VERB[s.kind] ?? ['send', 'sent']
  if (s.cls === 'delete') return ['delete', 'deleted']
  if (s.cls === 'invite') return ['share', 'shared']
  if (s.cls === 'merge') return ['merge', 'merged']
  if (s.cls === 'pay') return ['move money for', 'moved money for']
  return ['create or change', 'created or changed']
}

function make(s: Spec): Outward {
  const [v0, v1] = verbOf(s)
  const noun = s.noun ?? NOUN[s.kind]
  const tail = s.cls === 'invite' ? ' with other people' : ''
  const where = s.at ?? (s.to === '' ? '' : `in ${s.to}`)
  const spot = where === '' ? '' : ` ${where}`
  const why = s.why ?? (s.cls === 'pay' ? WHY_MONEY : s.cls === 'delete' ? WHY_GONE : s.cls === 'send' || s.cls === 'invite' || s.cls === 'merge' || OTHERS.has(s.kind) ? WHY_OTHERS : WHY_OUTSIDE)
  return { to: s.to, label: s.label ?? LABEL[s.kind], guarded: s.guarded ?? true, write: true, now: `${v0} ${noun}${tail}${spot}`, past: `${v1} ${noun}${tail}${spot}`, why, ...(s.routine === true ? { routine: true } : {}) }
}

const readOut = (label: Label, to: string): Outward => ({ to, label, guarded: false, write: false, now: '', past: '', why: '' })

export const effectWords = (o: Outward, tense: 'would' | 'did'): string => `This ${tense === 'would' ? 'would ' : ''}${tense === 'would' ? o.now : o.past}: ${o.why}`


const READ_VERBS = new Set(['get', 'list', 'search', 'read', 'fetch', 'query', 'find', 'view', 'show', 'describe', 'check', 'lookup', 'count', 'download', 'suggest', 'browse', 'preview', 'retrieve', 'scan', 'inspect', 'ls', 'status', 'ping', 'wait', 'watch', 'tail', 'stat', 'whoami', 'health'])
const VERB_CLASS: Record<string, Cls> = {}
for (const w of 'send post reply forward respond publish schedule notify email tweet dm sms broadcast announce comment react'.split(' ')) VERB_CLASS[w] = 'send'
for (const w of 'invite share grant'.split(' ')) VERB_CLASS[w] = 'invite'
VERB_CLASS.merge = 'merge'
for (const w of 'pay transfer charge refund payout withdraw deposit'.split(' ')) VERB_CLASS[w] = 'pay'
for (const w of 'delete remove trash cancel revoke destroy purge drop unshare'.split(' ')) VERB_CLASS[w] = 'delete'
for (const w of 'create update edit add set put patch write upload move copy close reopen approve submit deploy push assign rename restore replace insert append apply enable disable'.split(' ')) VERB_CLASS[w] = 'change'

const PRIVATE_WORDS = new Set(['draft', 'drafts', 'label', 'labels', 'spam', 'unread', 'star', 'starred'])
const LOCAL_SERVERS = /^(ccd_|claude_browser|claude_code_ios|computer-use|terminal$|visualize$|mcp-registry)/i

const NOUNS: [Kind, RegExp][] = [
  ['pull request', /\b(pull request|pull|pr|merge request|mr)\b/],
  ['comment', /\bcomments?\b/],
  ['reaction', /\b(reactions?|emoji|react|vote|like)\b/],
  ['release', /\b(releases?|tag)\b/],
  ['calendar', /\b(events?|meeting|calendar|invitation|rsvp)\b/],
  ['message', /\b(messages?|mail|email|thread|reply|dm|sms|chat|conversation|notification)\b/],
  ['payment', /\b(payments?|charge|refund|invoice|payout|subscription|checkout|transfer|pay)\b/],
  ['ticket', /\b(issues?|tickets?|tasks?|story|bug|card|epic|sprint|project|board)\b/],
  ['file', /\b(files?|folder|docs?|document|sheet|spreadsheet|canvas|page|blob|object|bucket|drive)\b/],
  ['post', /\b(posts?|tweet|status)\b/],
]
const DEFAULT_KIND: Record<string, Kind> = { reply: 'message', forward: 'message', send: 'message', respond: 'message', dm: 'message', email: 'message', notify: 'message', sms: 'message', broadcast: 'message', announce: 'message', schedule: 'message', comment: 'comment', react: 'reaction', tweet: 'post', publish: 'post', merge: 'pull request' }

const SERVICES: [RegExp, string][] = [
  [/slack/, 'Slack'], [/gmail|google ?mail/, 'Gmail'], [/outlook/, 'Outlook'], [/calendar|gcal/, 'Calendar'], [/github/, 'GitHub'], [/gitlab/, 'GitLab'], [/jira|atlassian|confluence/, 'Atlassian'],
  [/linear/, 'Linear'], [/asana/, 'Asana'], [/clickup/, 'ClickUp'], [/monday/, 'Monday'], [/notion/, 'Notion'], [/trello/, 'Trello'], [/google ?drive|gdrive/, 'Google Drive'], [/dropbox/, 'Dropbox'],
  [/\bbox\b/, 'Box'], [/egnyte/, 'Egnyte'], [/onedrive|sharepoint/, 'OneDrive'], [/\bs3\b/, 'cloud storage'], [/stripe/, 'Stripe'], [/paypal/, 'PayPal'], [/twitter|tweet/, 'Twitter'], [/linkedin/, 'LinkedIn'],
  [/facebook|instagram|meta ads/, 'Meta'], [/hubspot/, 'HubSpot'], [/salesforce/, 'Salesforce'], [/intercom/, 'Intercom'], [/zendesk/, 'Zendesk'], [/docusign/, 'DocuSign'], [/figma/, 'Figma'],
  [/canva/, 'Canva'], [/discord/, 'Discord'], [/telegram/, 'Telegram'], [/twilio/, 'Twilio'], [/sendgrid|mailgun|mailchimp|klaviyo/, 'a mail service'], [/posthog/, 'PostHog'], [/amplitude/, 'Amplitude'],
]

const wordsOf = (name: string): string[] => name.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase().split(/[^a-z0-9]+/).filter(w => w !== '')

function serviceOf(server: string, tool: string): string {
  const all = `${wordsOf(server).join(' ')} ${wordsOf(tool).join(' ')}`
  for (const [re, name] of SERVICES) if (re.test(all)) return name
  const readable = wordsOf(server).filter(w => !['plugin', 'claude', 'ai', 'mcp'].includes(w))
  const unique = readable.filter((w, i) => readable.indexOf(w) === i)
  if (unique.length > 0 && unique.length <= 3 && !unique.some(w => /^[0-9a-f]{6,}$/.test(w) && /\d/.test(w))) return unique.map(w => `${w.charAt(0).toUpperCase()}${w.slice(1)}`).join(' ')
  if (/thread|draft|label|spam|mail|message/.test(wordsOf(tool).join(' '))) return 'your mail'
  if (/event|calendar/.test(wordsOf(tool).join(' '))) return 'Calendar'
  return 'another app'
}

// From the name alone; undefined for a read, a draft, an app tool, or a name with no action word.
export function mcpEffect(tool: string): Outward | undefined {
  const parts = tool.split('__')
  if (parts[0] !== 'mcp' || parts.length < 3) return undefined
  const server = parts[1] ?? ''
  if (LOCAL_SERVERS.test(server)) return undefined
  const words = wordsOf(parts.slice(2).join(' '))
  if (words.some(w => PRIVATE_WORDS.has(w))) return undefined
  let verb = ''
  for (const w of words) {
    if (READ_VERBS.has(w)) return undefined
    if (VERB_CLASS[w] !== undefined) {
      verb = w
      break
    }
  }
  if (verb === '') return undefined
  const joined = words.join(' ')
  let cls = VERB_CLASS[verb] ?? 'change'
  let kind: Kind = NOUNS.find(([, re]) => re.test(joined))?.[0] ?? DEFAULT_KIND[verb] ?? 'item'
  if (cls === 'pay') kind = 'payment'
  if (cls === 'merge') kind = 'pull request'
  // Refunds, charges and payouts move money whatever word the tool starts with.
  if (cls === 'change' && kind === 'payment' && /\b(payments?|charge|refund|payout|transfer|pay|checkout)\b/.test(joined)) cls = 'pay'
  // "Send" fits only a message, comment, reaction, post or release; anything else is a change. Adding a comment or reaction is a send whatever word the tool uses.
  if (cls === 'change' && (kind === 'comment' || kind === 'reaction')) cls = 'send'
  if (cls === 'send' && !['message', 'comment', 'reaction', 'post', 'release'].includes(kind)) cls = 'change'
  return make({ cls, kind, to: serviceOf(server, words.join(' ')) })
}


const METHODS_WRITE = new Set(['POST', 'PUT', 'DELETE', 'PATCH'])
const CURL_VALUE_FLAGS = new Set(['-H', '--header', '-o', '--output', '-u', '--user', '-A', '--user-agent', '-e', '--referer', '-x', '--proxy', '-w', '--write-out', '--connect-timeout', '-m', '--max-time', '--cacert', '--cert', '--key', '-b', '--cookie', '-c', '--cookie-jar', '--retry', '-K', '--config', '--resolve', '--interface'])
const CURL_DATA_FLAGS = /^(-d|--data(-[a-z]+)?|-F|--form(-string)?|-T|--upload-file|--json)$/

const looksLikeUrl = (t: string): boolean => /^(https?|ftps?|sftp|scp):\/\/\S+/i.test(t) || /^[\w.-]+\.[a-z]{2,}(:\d+)?([/?#]|$)/i.test(t) || /^\$\{?\w+\}?/.test(t)

export function hostOf(t: string): string | undefined {
  if (t.startsWith('$')) return undefined
  return /^(?:[a-z][a-z0-9+.-]*:\/\/)?(?:[^@/?#]*@)?(\[[^\]]+\]|[^/:?#]+)/i.exec(t)?.[1]?.toLowerCase()
}
const isLocalHost = (h: string): boolean => h === 'localhost' || h === '0.0.0.0' || h === '[::1]' || /^127\./.test(h) || h.endsWith('.localhost')

function webRequest(method: string, host: string | undefined): Outward | undefined {
  if (host !== undefined && isLocalHost(host)) return undefined
  const to = host ?? 'a web address'
  if (!METHODS_WRITE.has(method)) return readOut(['web request', 'web requests'], to)
  return make({
    cls: 'change',
    kind: 'web',
    to,
    at: `at ${to}`,
    noun: `a ${method} request that changes data`,
    verb: ['send', 'sent'],
    why: 'the other server decides what it does, and it may change something other people see.',
    label: ['web change', 'web changes'],
  })
}

function curlEffect(c: Pick<Cmd, 'args'>): Outward | undefined {
  const a = c.args.filter(t => t.op !== true).map(t => t.t)
  let method = ''
  let data = false
  let get = false
  let head = false
  let url: string | undefined
  for (let i = 0; i < a.length; i += 1) {
    const t = a[i] ?? ''
    if (t === '-X' || t === '--request') {
      method = (a[i + 1] ?? '').toUpperCase()
      i += 1
    } else if (/^-X./.test(t)) method = t.slice(2).toUpperCase()
    else if (t.startsWith('--request=')) method = t.slice(10).toUpperCase()
    else if (CURL_DATA_FLAGS.test(t)) {
      data = true
      i += 1
    } else if (/^--(data[a-z-]*|form|json)=/.test(t) || /^-[dFT]./.test(t)) data = true
    else if (t === '-G' || t === '--get') get = true
    else if (t === '-I' || t === '--head') head = true
    else if (CURL_VALUE_FLAGS.has(t)) i += 1
    else if (url === undefined && looksLikeUrl(t)) url = t
  }
  if (url === undefined) return undefined
  return webRequest(method !== '' ? method : head ? 'HEAD' : data && !get ? 'POST' : 'GET', hostOf(url))
}

function wgetEffect(c: Pick<Cmd, 'args'>): Outward | undefined {
  const a = c.args.filter(t => t.op !== true).map(t => t.t)
  let method = 'GET'
  let url: string | undefined
  for (let i = 0; i < a.length; i += 1) {
    const t = a[i] ?? ''
    if (/^--(post-data|post-file|body-data|body-file)/.test(t)) method = 'POST'
    else if (t.startsWith('--method=')) method = t.slice(9).toUpperCase()
    else if (t === '--method') {
      method = (a[i + 1] ?? '').toUpperCase()
      i += 1
    } else if (url === undefined && looksLikeUrl(t)) url = t
  }
  return url === undefined ? undefined : webRequest(method, hostOf(url))
}

function httpieEffect(c: Cmd): Outward | undefined {
  const pos = flagsOf(c.args).positional.map(t => t.t)
  const method = (pos[0] ?? '').toUpperCase()
  const url = METHODS_WRITE.has(method) || method === 'GET' || method === 'HEAD' ? pos[1] : pos[0]
  return url === undefined ? undefined : webRequest(METHODS_WRITE.has(method) ? method : 'GET', hostOf(url))
}

const GH_GROUPS = new Set(['pr', 'issue', 'release', 'repo', 'workflow', 'gist', 'label', 'secret', 'variable', 'project', 'run', 'ruleset', 'api'])
const GH_READ = new Set(['view', 'list', 'status', 'diff', 'checks', 'checkout', 'download', 'watch', 'clone', 'browse', 'field-list', 'item-list', 'set-default', 'develop'])
const GH_NOUN: Record<string, string> = { repo: 'a repository', workflow: 'a workflow', gist: 'a gist', label: 'a label', secret: 'a secret', variable: 'a variable', project: 'a project', run: 'a workflow run', ruleset: 'a rule set' }

function ghApi(args: string[]): Outward | undefined {
  let method = ''
  let fields = false
  for (let i = 0; i < args.length; i += 1) {
    const t = args[i] ?? ''
    if (t === '-X' || t === '--method') {
      method = (args[i + 1] ?? '').toUpperCase()
      i += 1
    } else if (/^--method=/.test(t)) method = t.slice(9).toUpperCase()
    else if (/^(-f|-F|--field|--raw-field|--input)$/.test(t)) fields = true
  }
  const write = method !== '' ? METHODS_WRITE.has(method) : fields
  const isGraphql = args.includes('graphql')
  if (isGraphql && !args.some(t => /(^|=)\s*mutation\b/.test(t))) return undefined
  if (!write && !isGraphql) return undefined
  return make({ cls: method === 'DELETE' ? 'delete' : 'change', kind: 'item', to: 'GitHub', noun: 'something', label: ['GitHub write', 'GitHub writes'] })
}

function ghEffect(c: Cmd): Outward | undefined {
  const pos = flagsOf(c.args).positional.map(t => t.t)
  const gi = pos.findIndex(p => GH_GROUPS.has(p))
  if (gi < 0) return undefined
  const group = pos[gi] ?? ''
  if (group === 'api') return ghApi(c.args.map(t => t.t))
  const sub = pos[gi + 1]
  if (sub === undefined || GH_READ.has(sub)) return undefined
  const gone = sub === 'delete' || sub === 'remove' || sub === 'rm'
  const to = 'GitHub'
  if (group === 'pr') {
    // Opening, changing and merging a pull request is normal work: on real work all 23 warnings in a day were these. Merging past the checks (--admin) is not routine.
    const routine = !c.args.some(t => t.t === '--admin')
    if (sub === 'merge') return make({ cls: 'merge', kind: 'pull request', to, routine })
    if (sub === 'comment' || sub === 'review') return make({ cls: 'send', kind: 'comment', to, noun: 'a comment on a pull request', label: ['pull request comment', 'pull request comments'] })
    return make({ cls: 'change', kind: 'pull request', to, routine: sub !== 'close', label: sub === 'create' ? ['pull request', 'pull requests'] : ['pull request change', 'pull request changes'] })
  }
  if (group === 'issue') {
    if (sub === 'comment') return make({ cls: 'send', kind: 'comment', to, noun: 'a comment on an issue', label: ['issue comment', 'issue comments'] })
    return make({ cls: gone ? 'delete' : 'change', kind: 'ticket', to, noun: 'an issue', label: sub === 'create' ? ['issue', 'issues'] : ['issue change', 'issue changes'] })
  }
  if (group === 'release') return make({ cls: gone ? 'delete' : sub === 'create' ? 'send' : 'change', kind: 'release', to, label: sub === 'create' ? ['release', 'releases'] : ['release change', 'release changes'] })
  const label: Label = group === 'workflow' && sub === 'run' ? ['workflow run', 'workflow runs'] : [`${group} change`, `${group} changes`]
  return make({ cls: gone ? 'delete' : 'change', kind: 'item', to, noun: GH_NOUN[group] ?? 'something', label })
}

const AWS_READ = /^(describe|list|get|ls|head|wait|batch-get|lookup|search|scan|query|select|generate|simulate|verify|check|validate|estimate|tail|filter|help|view|show|export)(-|$)/
const AWS_MUT = /^(create|delete|put|update|terminate|run|start|stop|modify|attach|detach|invoke|publish|send|deploy|add|remove|reboot|release|revoke|authorize|associate|disassociate|register|deregister|tag|untag|cancel|enable|disable|import|restore|reset|set|change|upload|submit|execute|apply|schedule|rotate|swap|replace|accept|reject|grant|invalidate|admin|batch-write|rm|mv|mb|rb|sync|cp)(-|$)/
const AZ_MUT = /^(create|delete|update|set|add|remove|start|stop|restart|deploy|assign|invoke|purge|upload|import|enable|disable|scale|swap|restore|deallocate|move|cancel|regenerate|rotate)(-|$)/
const AZ_READ = /^(list|show|get|exists|check|download|query|wait)(-|$)/
const GCLOUD_MUT = /^(create|delete|update|deploy|add|remove|set|start|stop|reset|resize|patch|import|submit|enable|disable|restart|suspend|resume|move|publish|rollback|attach|detach|cp|rm|mv|rsync|tag|untag|call)(-|$)/
const GCLOUD_READ = /^(list|describe|get|read|show|print|info|version|search|tail|ssh)(-|$)/
const GONE = /^(delete|rm|rb|terminate|destroy|purge|remove|deregister|untag)(-|$)/

// =none is a real run.
const DRY_RUN = /^--dry-?run(?:=(?:client|server|true))?$/i
const isDry = (c: Cmd): boolean => c.args.some(t => !t.quoted && DRY_RUN.test(t.t))

function cloudEffect(prog: string, c: Cmd): Outward | undefined {
  if (isDry(c)) return undefined
  const pos = flagsOf(c.args).positional.map(t => t.t)
  const to = prog === 'aws' || prog === 'gsutil' ? 'AWS' : prog === 'az' ? 'Azure' : 'Google Cloud'
  let mut: RegExp = AWS_MUT
  let read: RegExp = AWS_READ
  if (prog === 'aws') {
    if (['configure', 'sso'].includes(pos[0] ?? '')) return undefined
  } else if (prog === 'az') {
    mut = AZ_MUT
    read = AZ_READ
    if (['login', 'logout', 'account', 'configure', 'config', 'version', 'upgrade', 'extension', 'cache', 'feedback', 'find', 'interactive'].includes(pos[0] ?? '')) return undefined
  } else if (prog === 'gcloud') {
    mut = GCLOUD_MUT
    read = GCLOUD_READ
    if (['auth', 'config', 'components', 'init', 'help', 'version', 'info', 'topic'].includes(pos[0] ?? '')) return undefined
  } else {
    mut = /^(cp|mv|rm|rsync|mb|rb|setmeta|acl|iam|lifecycle|label|versioning|cors|notification)$/
    read = /^(ls|cat|stat|du|hash|version|help)$/
  }
  const rest = prog === 'gsutil' ? pos : pos.slice(1)
  // A read wins a tie.
  const hit = rest.find(t => read.test(t) || mut.test(t))
  if (hit === undefined || read.test(hit)) return undefined
  const dest = pos[pos.length - 1] ?? ''
  // A download does not change the outside.
  if (/^(cp|sync|rsync)$/.test(hit) && !/^(s3|gs):\/\//.test(dest)) return undefined
  const gone = GONE.test(hit)
  return make({ cls: gone ? 'delete' : 'change', kind: 'cloud', to, noun: 'cloud resources', why: gone ? WHY_GONE : 'it changes something outside your computer, and it may cost money.' })
}

const STRIPE_MUT = /^(create|update|delete|cancel|capture|confirm|post|pay|finalize|void|resend|trigger|refund|close|reopen)$/

function stripeEffect(c: Cmd): Outward | undefined {
  const pos = flagsOf(c.args).positional.map(t => t.t)
  if (!pos.some(t => STRIPE_MUT.test(t))) return undefined
  const live = c.args.some(t => t.t === '--live')
  return make({ cls: 'pay', kind: 'payment', to: 'Stripe', why: live ? 'it moves real money.' : 'it changes payment data (in test mode unless it says live).' })
}

const MAIL_PROGS = new Set(['sendmail', 'mail', 'mailx', 'mutt', 'msmtp', 'swaks'])
const mailEffect = (c: Cmd): Outward | undefined =>
  c.prog === 'sendmail' || c.args.some(t => t.t.includes('@') || t.t === '-s') ? make({ cls: 'send', kind: 'message', to: '', noun: 'an email', label: ['email', 'emails'] }) : undefined

function otherEffect(c: Cmd): Outward | undefined {
  const pos = flagsOf(c.args).positional.map(t => t.t)
  const sub = pos[0] ?? ''
  if ((c.prog === 'npm' || c.prog === 'pnpm' || c.prog === 'yarn') && sub === 'publish') return make({ cls: 'send', kind: 'package', to: '', at: 'to a public package registry', label: ['package publish', 'package publishes'] })
  if (c.prog === 'docker' && sub === 'push') return make({ cls: 'change', kind: 'item', to: 'a container registry', at: 'to a container registry', noun: 'a container image', verb: ['upload', 'uploaded'], label: ['image push', 'image pushes'] })
  if (c.prog === 'terraform' && (sub === 'apply' || sub === 'destroy')) return make({ cls: sub === 'destroy' ? 'delete' : 'change', kind: 'cloud', to: 'your infrastructure', at: 'in your infrastructure', noun: 'live infrastructure' })
  if (c.prog === 'kubectl' && !isDry(c) && /^(apply|delete|create|patch|scale|replace|rollout|annotate|label|edit|taint|drain|cordon|set)$/.test(sub)) return make({ cls: sub === 'delete' ? 'delete' : 'change', kind: 'cloud', to: 'a Kubernetes cluster', at: 'in a Kubernetes cluster', noun: 'cluster resources' })
  return undefined
}

function travelEffect(c: Cmd): Outward | undefined {
  const pos = flagsOf(c.args).positional.map(t => t.t)
  if (c.prog === 'git' && pos[0] === 'push' && !c.args.some(t => t.t === '--dry-run' || t.t === '-n')) return { to: 'a git remote', label: ['git push', 'git pushes'], guarded: false, write: true, now: '', past: '', why: '' }
  if (c.prog === 'scp' || c.prog === 'rsync' || c.prog === 'sftp') {
    const last = pos[pos.length - 1] ?? ''
    const m = /^(?:[^@/]+@)?([\w.-]+):/.exec(last)
    if (m !== null) return { to: m[1] ?? 'another machine', label: ['file copy', 'file copies'], guarded: false, write: true, now: '', past: '', why: '' }
  }
  return undefined
}

// Read with the Windows tokenizer: parameter names are case-insensitive and may be shortened. `curl` and `wget` are aliases of Invoke-WebRequest in Windows PowerShell 5.1 and the real curl.exe elsewhere, and the line does not say which, so both readings are taken. A body without -Method is a POST; an explicit -Method Get or Head wins.
const IWR_PROGS = new Set(['invoke-webrequest', 'iwr', 'invoke-restmethod', 'irm', 'curl', 'wget'])
const IWR_VALUES = ['method', 'body', 'infile', 'form', 'uri', 'outfile', 'headers', 'contenttype', 'credential', 'useragent', 'timeoutsec', 'proxy', 'proxycredential', 'token', 'authentication', 'sessionvariable', 'websession', 'maximumredirection', 'maximumretrycount', 'retryintervalsec', 'transferencoding', 'certificate', 'certificatethumbprint', 'httpversion', 'responseheadersvariable', 'statuscodevariable', 'sslprotocol'] as const
const IWR_SWITCHES = ['skipheadervalidation', 'skipcertificatecheck', 'usebasicparsing', 'usedefaultcredentials', 'passthru', 'allowunencryptedauthentication', 'disablekeepalive', 'nobody', 'noproxy', 'preserveauthorizationonredirect', 'skiphttperrorcheck', 'proxyusedefaultcredentials', 'resume'] as const

function iwrEffect(c: { args: Tok[] }): Outward | undefined {
  const a = splitArgs(c.args, { known: [...IWR_VALUES, ...IWR_SWITCHES], values: IWR_VALUES })
  const method = (a.params.get('method') ?? '').toUpperCase()
  const body = a.params.has('body') || a.params.has('infile') || a.params.has('form')
  const url = a.params.get('uri') ?? a.positional.find(looksLikeUrl)
  if (url === undefined) return undefined
  return webRequest(method !== '' ? method : body ? 'POST' : 'GET', hostOf(url))
}

// Read as a PUT, the nearest kind.
const BITS_VALUES = ['source', 'destination', 'transfertype', 'displayname', 'description', 'priority', 'credential', 'authentication', 'proxyusage', 'proxylist', 'proxyauthentication', 'proxycredential', 'retryinterval', 'retrytimeout', 'notifyflags', 'notifycmdline', 'transferpolicy', 'usestoredcredential'] as const

function bitsEffect(c: { args: Tok[] }): Outward | undefined {
  const a = splitArgs(c.args, { known: [...BITS_VALUES, 'asynchronous', 'dynamic', 'suspended', 'cancelwhenhttpfail'], values: BITS_VALUES })
  const source = a.params.get('source') ?? a.positional[0]
  const dest = a.params.get('destination') ?? a.positional[a.params.has('source') ? 0 : 1]
  const upload = /^up/i.test(a.params.get('transfertype') ?? '') || (dest !== undefined && /^https?:\/\//i.test(dest))
  if (upload && dest !== undefined) return webRequest('PUT', hostOf(dest))
  return source !== undefined && looksLikeUrl(source) ? webRequest('GET', hostOf(source)) : undefined
}

function winEffects(command: string): Outward[] {
  const out: Outward[] = []
  for (const c of winCommandsOf(command)) {
    const list: Outward[] = []
    const take = (o: Outward | undefined): void => {
      if (o !== undefined) list.push(o)
    }
    if (c.prog === 'curl') {
      take(curlEffect(c))
      take(iwrEffect(c))
    } else if (c.prog === 'wget') {
      take(wgetEffect(c))
      take(iwrEffect(c))
    } else if (IWR_PROGS.has(c.prog)) take(iwrEffect(c))
    else if (c.prog === 'start-bitstransfer') take(bitsEffect(c))
    const best = list.find(o => o.write) ?? list[0]
    if (best !== undefined) out.push(best)
  }
  return out
}

export function bashEffects(command: string, flavor: ShellFlavor = 'posix'): Outward[] {
  const out: Outward[] = []
  const add = (o: Outward | undefined): void => {
    if (o !== undefined && !out.some(x => x.to === o.to && x.label[0] === o.label[0] && x.now === o.now)) out.push(o)
  }
  for (const c of commandsOf(command)) {
    let o: Outward | undefined
    if (c.prog === 'curl') o = curlEffect(c)
    else if (c.prog === 'wget') o = wgetEffect(c)
    else if (c.prog === 'http' || c.prog === 'https' || c.prog === 'xh') o = httpieEffect(c)
    else if (c.prog === 'gh') o = ghEffect(c)
    else if (c.prog === 'aws' || c.prog === 'gcloud' || c.prog === 'az' || c.prog === 'gsutil') o = cloudEffect(c.prog, c)
    else if (c.prog === 'stripe') o = stripeEffect(c)
    else if (MAIL_PROGS.has(c.prog)) o = mailEffect(c)
    else if (c.prog === 'slack') {
      const first = flagsOf(c.args).positional[0]?.t
      o = first === undefined || ['list', 'help', 'version', 'doctor', 'info', 'whoami'].includes(first) ? undefined : make({ cls: 'send', kind: 'message', to: 'Slack' })
    } else o = otherEffect(c) ?? travelEffect(c)
    add(o)
  }
  if (flavor === 'powershell' || isWindowsShape(command)) {
    // The POSIX reading of an aliased `curl -Method Post` sees a plain read, so it is dropped when the Windows reading finds a write.
    const wins = winEffects(command)
    for (let i = out.length - 1; i >= 0; i -= 1) if (out[i]?.write === false && wins.some(w => w.write && w.to === out[i]?.to)) out.splice(i, 1)
    for (const o of wins) add(o)
  }
  return out
}


const str = (v: unknown): string => (typeof v === 'string' ? v : '')

export function outwardOf(tool: string, args: Record<string, unknown>): Outward[] {
  const flavor = commandFlavorOfTool(tool)
  if (flavor !== undefined) return bashEffects(str(args.command), flavor)
  if (tool === 'WebFetch') {
    const host = hostOf(str(args.url))
    return host === undefined || isLocalHost(host) ? [] : [readOut(['web request', 'web requests'], host)]
  }
  if (tool === 'WebSearch') return [readOut(['web search', 'web searches'], 'a search engine')]
  if (tool.startsWith('mcp__')) {
    const o = mcpEffect(tool)
    return o === undefined ? [] : [o]
  }
  return []
}
