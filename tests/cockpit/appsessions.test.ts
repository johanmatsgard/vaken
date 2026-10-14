import { expect } from 'claude-code/testing'
import { test } from './slow'

import { matchSession, ownedById, parseSessions, parseStoredSessions } from '../hooks/core/appsessions'
import { buildView, pinnedFirst } from '../hooks/features/home/logic'
import { pinSvg } from '../hooks/ui/kit'

const NOW = Date.parse('2026-10-10T12:00:00Z')
const answer = JSON.stringify([
  { sessionId: 'local_aaa', title: 'Computer access setup', cwd: '/w/one', branch: 'b1', isRunning: true, lastActivityAt: '2026-10-10T11:59:00Z', group: { id: 'g', name: 'Work' }, pinned: true, link: 'claude://claude.ai/epitaxy/local_aaa' },
  { sessionId: 'local_bbb', title: 'Shop', cwd: '/w/shop-0c768c', isRunning: false, link: 'https://evil.example/x' },
  { sessionId: 'local_ccc', title: 'Shop', cwd: '/w/shop-1a7f23', isRunning: false },
  { nope: true },
])

const rec = (id: string, cwd: string) => ({ sessionId: id, cwd, model: 'm', state: 'idle' as const, startedAt: NOW - 1000, updatedAt: NOW - 1000, lastEventAt: NOW - 1000, stateSince: NOW - 1000 })

test('the app session list is read into titles, groups, pins and links; a link that is not the app\'s own is dropped', () => {
  const l = parseSessions(answer, NOW)!
  expect(l.sessions.length).toBe(3)
  expect(l.sessions[0]).toMatchObject({ id: 'local_aaa', title: 'Computer access setup', isRunning: true, pinned: true, group: 'Work', link: 'claude://claude.ai/epitaxy/local_aaa' })
  expect(l.sessions[1].link).toBeUndefined()
  expect(parseSessions('nope', NOW)).toBeUndefined()
  expect(parseSessions('{}', NOW)).toBeUndefined()
  expect(parseStoredSessions(JSON.parse(JSON.stringify(l)))).toEqual(l)
  expect(parseStoredSessions({ at: 1 })).toBeUndefined()
})

test('one of ours is matched to the app\'s session by id or by folder', () => {
  const l = parseSessions(answer, NOW)
  expect(matchSession(l, { sessionId: 'aaa', cwd: '/x' })?.id).toBe('local_aaa')
  expect(matchSession(l, { sessionId: 'zzz', cwd: '/w/shop-1a7f23' })?.id).toBe('local_ccc')
  expect(matchSession(l, { sessionId: 'zzz', cwd: '/nowhere' })).toBeUndefined()
  expect(matchSession(undefined, { sessionId: 'aaa', cwd: '/x' })).toBeUndefined()
})

test('rows take the sidebar title and link, and sessions with the same title are told apart', () => {
  const l = parseSessions(answer, NOW)!
  const view = buildView([rec('s1', '/w/one'), rec('s2', '/w/shop-0c768c'), rec('s3', '/w/shop-1a7f23')], NOW, 'x', undefined, undefined, undefined, l)
  const names = view.idle.map(r => r.name).sort()
  expect(names).toEqual(['Computer access setup', 'Shop · shop-0c768c', 'Shop · shop-1a7f23'])
  expect(view.idle.find(r => r.name === 'Computer access setup')).toMatchObject({ link: 'claude://claude.ai/epitaxy/local_aaa', pinned: true, group: 'Work' })
})

test('an old list is not trusted: names are our own', () => {
  const old = { ...parseSessions(answer, NOW)!, at: NOW - 11 * 60_000 }
  const view = buildView([rec('s1', '/w/one')], NOW, 'x', undefined, undefined, undefined, old)
  expect(view.idle[0].name).toBe('one')
})

test('a session pinned in the app sits first, unless the person marked it themselves', () => {
  const l = parseSessions(answer, NOW)!
  const view = buildView([rec('s2', '/w/shop-0c768c'), rec('s1', '/w/one')], NOW, 'x', undefined, undefined, undefined, l)
  expect(pinnedFirst(view.idle, {}).map(r => r.rec.sessionId)[0]).toBe('s1')
  expect(pinnedFirst(view.idle, { s2: 'pin' }).map(r => r.rec.sessionId).sort()).toEqual(['s1', 's2'])
  expect(pinnedFirst(view.idle, { s1: 'hide', s2: 'pin' }).map(r => r.rec.sessionId)[0]).toBe('s2')
})

test('the pin is a small picture in the dim icon grey', () => {
  expect(pinSvg()).toContain('width="8"')
  expect(pinSvg()).toContain('stroke="#878580"')
})

// A brand-new session in a folder that already holds older app sessions must not take one of their titles.
test('a new session in a folder with several app sessions takes none of their titles, and one an older session owns by id is never taken by folder', () => {
  const l = parseSessions(JSON.stringify([
    { sessionId: 'local_old1', title: 'Vaken Presslab', cwd: '/w/repo', isRunning: false },
    { sessionId: 'local_old2', title: 'Other work', cwd: '/w/repo', isRunning: false },
  ]), NOW)
  expect(matchSession(l, { sessionId: 'fresh', cwd: '/w/repo' })).toBeUndefined()
  const one = parseSessions(JSON.stringify([{ sessionId: 'local_old1', title: 'Vaken Presslab', cwd: '/w/repo', isRunning: false }]), NOW)
  const owned = ownedById(one, [{ sessionId: 'old1' }, { sessionId: 'fresh' }])
  expect([...owned]).toEqual(['local_old1'])
  expect(matchSession(one, { sessionId: 'fresh', cwd: '/w/repo' }, owned)).toBeUndefined()
  expect(matchSession(one, { sessionId: 'old1', cwd: '/w/repo' }, owned)?.id).toBe('local_old1')
  expect(matchSession(one, { sessionId: 'fresh', cwd: '/w/repo' })?.id).toBe('local_old1')
})
