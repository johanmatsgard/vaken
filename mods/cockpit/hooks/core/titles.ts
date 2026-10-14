// Clear session names: the key words of the first message that is not a slash command, never its first words.

export const TITLE_WORDS = 4
export const TITLE_CHARS = 500

const FILLER_PHRASES: string[][] = [
  ['i', 'want', 'you', 'to'],
  ['i', 'would', 'like', 'you', 'to'],
  ['i', 'need', 'you', 'to'],
  ['go', 'ahead', 'and'],
  ['thank', 'you'],
  ['how', 'about'],
  ['what', 'about'],
  ['in', 'order'],
  ['kan', 'du'],
  ['jag', 'vill', 'att', 'du'],
]

const DROP = new Set(
  [
    'hi', 'hello', 'hey', 'yo', 'ok', 'okay', 'okey', 'great', 'thanks', 'thank', 'thx', 'cool', 'nice', 'perfect', 'awesome', 'alright', 'sure', 'yes', 'yeah', 'no', 'good', 'fine', 'well', 'wow',
    'please', 'pls', 'plz', 'just', 'now', 'next', 'then', 'also', 'again', 'still', 'first', 'finally', 'maybe', 'really', 'quite', 'very', 'actually', 'basically', 'kindly', 'quick', 'quickly',
    'do', 'does', 'did', 'doing', 'done', 'can', 'could', 'would', 'will', 'shall', 'should', 'may', 'might', 'must', 'want', 'wants', 'need', 'needs', 'like', 'let', "let's", 'lets', 'try', 'help', 'go', 'get', 'see', 'look', 'please',
    'is', 'are', 'was', 'were', 'be', 'been', 'being', 'am', 'have', 'has', 'had', 'there', "there's", 'here', "here's",
    'i', 'me', 'my', 'mine', 'we', 'us', 'our', 'you', 'your', 'yours', 'it', 'its', "it's", 'this', 'that', "that's", 'these', 'those', 'he', 'she', 'they', 'them', 'their', 'something', 'anything', 'everything',
    "i'd", "i'm", "i've", "i'll", "you're", "we're", "we'll", "you'll",
    'what', 'why', 'how', 'when', 'where', 'which', 'who',
    'a', 'an', 'the', 'to', 'of', 'in', 'on', 'at', 'for', 'with', 'by', 'from', 'into', 'onto', 'about', 'as', 'and', 'or', 'but', 'so', 'if', 'some', 'any', 'all', 'more', 'too', 'up', 'out',
    'hej', 'tjena', 'okej', 'bra', 'tack', 'snälla', 'gärna', 'nu', 'sen', 'sedan', 'också', 'bara', 'och', 'eller', 'att', 'det', 'den', 'de', 'detta', 'denna', 'dessa', 'jag', 'du', 'vi', 'ni', 'mig', 'dig', 'oss',
    'en', 'ett', 'på', 'för', 'med', 'till', 'av', 'om', 'är', 'var', 'vill', 'kan', 'ska', 'gör', 'göra', 'kolla', 'titta', 'hur', 'vad', 'varför', 'här', 'där',
  ],
)

// Once two key words are kept, the name stops before a clause-ending word.
const CLAUSE = new Set(['and', 'then', 'but', 'so', 'also', 'och', 'sen', 'sedan', 'men'])
// Once three key words are kept, the name stops before a word that starts a new part.
const PREPOSITIONS = new Set(['in', 'on', 'at', 'for', 'with', 'by', 'from', 'into', 'to', 'of', 'about', 'i', 'på', 'för', 'med', 'till', 'av', 'om'])

type Token = { word: string; low: string; ends: boolean }

// The engine adds blocks such as <system-reminder> to the text; they are not what the person typed.
function tokens(text: string): Token[] {
  const typed = text
    .replace(/<([a-z][a-z0-9-]*)(?:\s[^>]*)?>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\bhttps?:\/\/\S+/gi, ' ')
  const flat = typed.replace(/[`*_#>\]){}"“”]/g, ' ').replace(/\s+/g, ' ').trim()
  const out: Token[] = []
  for (const raw of flat.split(' ')) {
    if (raw === '') continue
    if (/^[(\[]/.test(raw) && out.length > 0) out[out.length - 1].ends = true
    const last = raw.includes('/') && !raw.startsWith('/') ? (raw.split('/').filter(Boolean).pop() ?? raw) : raw
    const ends = /[.,;:!?]$/.test(last) || /[—–]/.test(last)
    const word = last.replace(/^[^\p{L}\p{N}']+|[^\p{L}\p{N}]+$/gu, '')
    if (word === '') {
      if (ends && out.length > 0) out[out.length - 1].ends = true
      continue
    }
    out.push({ word, low: word.toLowerCase().replace(/’/g, "'"), ends })
  }
  return out
}

const capital = (w: string): string => w.charAt(0).toUpperCase() + w.slice(1)

export function keyTitle(text: string): string | undefined {
  const trimmed = text.replace(/<([a-z][a-z0-9-]*)(?:\s[^>]*)?>[\s\S]*?<\/\1>/gi, ' ').trim()
  if (trimmed === '' || trimmed.startsWith('/') || trimmed.startsWith('<')) return undefined
  const list = tokens(trimmed)
  const kept: string[] = []
  let n = 0
  while (n < list.length && kept.length < TITLE_WORDS) {
    const t = list[n]
    const phrase = FILLER_PHRASES.find(p => p.every((w, k) => list[n + k]?.low === w && (k === p.length - 1 || !list[n + k].ends)))
    if (phrase !== undefined) {
      n += phrase.length
      continue
    }
    if (kept.length >= 2 && CLAUSE.has(t.low)) break
    if (kept.length >= 3 && PREPOSITIONS.has(t.low)) break
    const isNumber = /^\p{N}+$/u.test(t.word)
    const keep = !DROP.has(t.low) && !(isNumber && (kept.length === 0 || t.ends))
    if (keep) kept.push(t.word)
    n += 1
    if (t.ends && kept.length >= 2) break
  }
  if (kept.length === 0) return undefined
  let out = ''
  for (const word of kept) {
    const next = out === '' ? capital(word) : `${out} ${word}`
    if (next.length > TITLE_CHARS) break
    out = next
  }
  return out === '' ? `${capital(kept[0]).slice(0, TITLE_CHARS - 1)}…` : out
}
