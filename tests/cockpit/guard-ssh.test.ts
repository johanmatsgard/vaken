// The Guard and ssh: the remote command (its argument string, or a heredoc fed to ssh or to a remote shell) is read as a script, with the
// remote computer as its place: a finding names the host, and ~ there is the remote home, not this computer's.
import { expect } from 'claude-code/testing'
import { test } from './slow'

import { checkCommand } from '../hooks/core/guarddestroy'
import { remoteScripts } from '../hooks/core/guardshell'

const P = { home: '/Users/me', cwd: '/Users/me/repo' }
const found = (cmd: string): string[] => checkCommand(cmd, P).map(f => `${f.id} ${f.where ?? ''}`)

test('a destructive remote command in the argument string is found, on the remote host', () => {
  expect(found("ssh host 'rm -rf ~'")).toEqual(['rm ~ on host'])
  expect(found('ssh host rm -rf /')).toEqual(['rm / on host'])
  expect(found("ssh -p 22 -i ~/.ssh/key -o StrictHostKeyChecking=no user@box 'rm -rf /var/www'")).toEqual(['rm /var/www and everything inside on user@box'])
  expect(found("ssh -p22 host 'git reset --hard'")).toEqual(['git-reset-hard ~ on host'])
  expect(found("cd repo && ssh host \"sudo rm -rf /\"")).toEqual(['rm / on host'])
  expect(found("bash -c \"ssh host 'rm -rf ~'\"")).toEqual(['rm ~ on host'])
})

test('a heredoc fed to ssh, or to a shell on the remote host, is a remote script', () => {
  expect(found("ssh host <<'EOF'\nrm -rf ~\nEOF")).toEqual(['rm ~ on host'])
  expect(found('ssh host <<EOF\nrm -rf ~\nEOF')).toEqual(['rm ~ on host'])
  expect(found("ssh -T host bash -s <<'EOF'\nrm -rf /srv/data\nEOF")).toContain('rm /srv/data and everything inside on host')
  expect(found("cat <<'EOF' | ssh host\ngit push --force origin main\nEOF")).toEqual(['git-push-force the remote branch main on host'])
})

test('the remote reading never uses this computer\'s home: ~ on the host is not /Users/me', () => {
  for (const cmd of ["ssh host 'rm -rf ~'", "ssh host <<'EOF'\nrm -rf ~\nEOF"]) {
    const where = checkCommand(cmd, P).map(f => f.where ?? '')
    expect(where.some(w => w.includes('/Users/me'))).toBe(false)
  }
})

test('a harmless remote command, a tunnel and a plain login give no finding', () => {
  expect(found("ssh host 'ls -la'")).toEqual([])
  expect(found("ssh host <<'EOF'\nuptime\nEOF")).toEqual([])
  expect(found('ssh -N -L 8080:localhost:80 host')).toEqual([])
  expect(found('ssh host')).toEqual([])
  expect(found("ssh host 'rm -rf /tmp/build-cache'")).toEqual([])
  expect(found("echo 'ssh host rm -rf ~'")).toEqual([])
})

test('nested ssh is read, and the options that take a value are skipped before the host', () => {
  expect(found("ssh jump \"ssh inner 'rm -rf /'\"")).toEqual(['rm / on inner on jump'])
  expect(remoteScripts("ssh -J bastion -l admin -c aes128-ctr host 'rm -rf ~'")).toEqual([{ host: 'host', script: 'rm -rf ~' }])
  expect(remoteScripts('ssh -vtt host uptime')).toEqual([{ host: 'host', script: 'uptime' }])
  expect(remoteScripts('git status')).toEqual([])
})

test('ssh ProxyCommand, LocalCommand and rsync -e run on this computer and are read as local commands', () => {
  const local = (cmd: string): boolean => checkCommand(cmd, P).some(f => !(f.where ?? '').includes(' on '))
  for (const cmd of [
    "ssh -o ProxyCommand='rm -rf ~' host",
    'ssh -o "ProxyCommand=rm -rf ~" host',
    "ssh '-oProxyCommand=rm -rf ~' host",
    'ssh -o "LocalCommand rm -rf ~" -o PermitLocalCommand=yes host',
    "scp -o 'ProxyCommand=rm -rf ~' a.txt host:",
    "rsync -e 'ssh -o ProxyCommand=\"rm -rf ~\"' src/ host:app/",
  ]) expect([cmd, local(cmd)]).toEqual([cmd, true])
  expect(found("ssh -o 'ProxyCommand=ssh -W %h:%p bastion' host")).toEqual([])
  expect(found('ssh -o StrictHostKeyChecking=no host uptime')).toEqual([])
})
