// The secret tripwire against random keys and names in code.
import { expect } from 'claude-code/testing'

import { looksRandom, maskSecrets, scanSecrets, wordName } from '../hooks/core/guardsecrets'
import { test } from './slow'

// Text that looks like a key, or like NAME=value, is built in pieces.
const fake = (...p: string[]): string => p.join('')
const VAR = 'a secret value in a variable'

test('a password of words and a year under a credential name is caught; names in code are not', () => {
  const caught = [
    fake('DB_PASS', 'WORD=Summer-Sunset-Garden-2024'),
    fake('API_SEC', 'RET=MyCompanySecret2024'),
    fake('API_K', 'EY=LHYB7KDLOA7PKMGA'),
    fake('ADMIN_P', 'WD=Winter_Lake_Cabin_1987'),
    fake('export GITHUB_TOK', 'EN="kT9vLmQxRpZwNaBcDeFg"'),
    fake('SIGNINGK', 'EY=CorrectHorseBattery42'),
  ]
  for (const t of caught) {
    expect([t, scanSecrets(t).map(h => h.kind)]).toEqual([t, [VAR]])
    expect([t, maskSecrets(t).includes('[hidden]')]).toEqual([t, true])
  }
  const names = [
    fake('const SETTINGS', "_KEY = 'cockpit:settings:v1'"),
    fake('const STORAGE', "_KEY = 'sessionStorage_v2'"),
    fake('STORAGE', '_KEY=my_app_settings_v1'),
    fake('const API', "_KEY_HEADER = 'apiKeyHeaderV2'"),
    fake('CACHE', '_KEY=cockpit/cache/v1/items'),
    fake('KEY', '_FILE=/home/user/app/config/keys'),
    fake('TOKEN', '_STORE=userAuthToken_v2_cache'),
    fake('PASSWORD', '_FIELD=passwordConfirmationInput'),
    fake('API_TOKEN', '=your-token-here-1234567'),
    fake('MONKEY', '_NAME=X-Api-Secret-Token2'),
    'PWD=/Users/someone/projects/app2',
  ]
  for (const t of names) expect([t, scanSecrets(t)]).toEqual([t, []])
})

test('wordName: names of words in mixed styles; never a base32 run, a lower-case blob or random scraps', () => {
  for (const v of ['sessionStorage_v2', 'X-Api-Secret-Token2', 'MyAppSigningKey2026', 'userAuthToken_v2_cache', 'Bearer_Token_Store_v3']) expect([v, wordName(v)]).toEqual([v, true])
  for (const v of ['LHYB7KDLOA7PKMGA', 'kxusopqrmwjrjwb0s3ab', 'tkpkvgmu54YuVpge', 'abcd1234efgh5678ijkl', 'v61cwbfurstbpkji']) expect([v, wordName(v)]).toEqual([v, false])
  for (const v of ['Summer-Sunset-Garden-2024', 'MyCompanySecret2024', 'HTTPAuthHeaderV2']) expect([v, looksRandom(v, true)]).toEqual([v, true])
  for (const v of ['my_app_settings_v1', 'apiKeyHeaderV2', 'cockpit/cache/v1/items']) expect([v, looksRandom(v, true)]).toEqual([v, false])
})

function seeded(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const ALPHABETS: Record<string, string> = {
  'lower case and digits': 'abcdefghijklmnopqrstuvwxyz0123456789',
  base32: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567',
  base64: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',
  hex: '0123456789abcdef',
}

test('10,000 random keys of each shape and length: every one with a digit is caught under a credential name, and none is a name', () => {
  const missed: string[] = []
  for (const [shape, abc] of Object.entries(ALPHABETS)) {
    for (const len of [16, 20, 24, 32]) {
      const next = seeded(1234 + len)
      let miss = 0
      let named = 0
      let example = ''
      for (let n = 0; n < 10_000; n++) {
        let key = ''
        for (let i = 0; i < len; i++) key += abc[Math.floor(next() * abc.length)]
        if (!/\d/.test(key)) continue
        if (scanSecrets(fake('API_SEC', 'RET=', key)).length === 0) {
          miss++
          example ||= key
        }
        if (wordName(key)) named++
      }
      if (miss > 0 || named > 0) missed.push(`${shape} ${len}: ${miss} missed, ${named} taken for a name (${example})`)
    }
  }
  expect(missed).toEqual([])
})
