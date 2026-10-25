// Words per system: Mac lines say "PC" and "Chrome or Edge" on Windows. Imports only the text table.
export type WordSystem = 'posix' | 'win32'

let shown: WordSystem = 'posix'
export const setWordSystem = (sys: unknown): void => {
  shown = sys === 'win32' ? 'win32' : 'posix'
}
export const wordSystemNow = (): WordSystem => shown

export const WIN_SHOWN: Record<string, string> = {
  'Keep Mac awake': 'Keep PC awake',
  'While agents work, it keeps the Mac awake.': 'While agents work, it keeps the PC awake.',
  'When you are away, it keeps the Mac awake for a phone or a waiting question.': 'When you are away, it keeps the PC awake for a phone or a waiting question.',
  'Keep the Mac awake while agents work.': 'Keep the PC awake while agents work.',
  'Keep the Mac awake for a phone or a waiting question.': 'Keep the PC awake for a phone or a waiting question.',
  'Like the Mac': 'Like the PC',
  'Kept the Mac awake': 'Kept the PC awake',
  'Stopped keeping the Mac awake: limit reached': 'Stopped keeping the PC awake: limit reached',
  'The Mac was kept awake for 8 hours, which is the most vaken allows. It lets the Mac sleep now.': 'The PC was kept awake for 8 hours, which is the most vaken allows. It lets the PC sleep now.',
  'Keep the Mac awake while you are away? Reply /vaken-help run awake on': 'Keep the PC awake while you are away? Reply /vaken-help run awake on',
  'Mac awake': 'PC awake',
  'Runs this command in the session folder after you press. The result shows under the row.': 'Runs this command in the session folder after you press. The result shows under the row. It runs in PowerShell.',
  'This one looks risky. Press once to see it, then Yes, run it.': 'This one looks risky. Press once to see it, then Yes, run it. It runs in PowerShell.',
  'To run block {n}, type: /vaken-help run do {n} yes': 'To run block {n}, type: /vaken-help run do {n} yes. It runs in PowerShell.',
  'It looks risky. To run block {n} anyway, type: /vaken-help run do {n} yes yes': 'It looks risky. To run block {n} anyway, type: /vaken-help run do {n} yes yes. It runs in PowerShell.',
  'Could not run it': 'This needs a shell I could not find.',
  'Block {n} could not be started.': 'Block {n}: This needs a shell I could not find.',
  'Could not run block {n}. Try again in the session: /vaken-help run do {n} yes': 'Block {n}: This needs a shell I could not find.',
  // Windows has no lsof or ps: the folder is read from the program itself, with its command line as the fallback.
  'The ports could not be read: the lsof program did not answer.': 'The ports could not be read: the netstat program did not answer.',
  'Leftover programs: the ps program did not answer, so nothing could be checked.': 'Leftover programs: the process list did not answer, so nothing could be checked.',
  "The lsof program did not answer, so no program's folder could be read.": "No program's folder could be read, and none names a session folder in its command.",
  'Look at each line before you run it: a program you started by hand in that folder looks the same. Vaken never stops a program.':
    "Look at each line before you run it: a program you started by hand in that folder looks the same. The folder is read from the program, or from its command when Windows does not tell it. Vaken never stops a program.",
  // Plan room, the night run and notices on Windows.
  'This Mac is short of memory.': 'This PC is short of memory.',
  'Night run paused: the Mac is on battery': 'Night run paused: the PC is on battery',
  'Night run goes on: the Mac is on power again': 'Night run goes on: the PC is on power again',
  'Starts as many as this Mac has room for.': 'Starts as many as this PC has room for.',
  'Starts {n} at a time until this Mac is read: turn on the computer reading in Settings > Agents': 'Starts {n} at a time until this PC is read: turn on the computer reading in Settings > Agents',
  'Starts up to {n} at once: room for {n} on this Mac': 'Starts up to {n} at once: room for {n} on this PC',
  'After 2 minutes with no press or prompt, vaken sends one Mac notification when another session needs you or a plan limit is near; with This session too, also when a step here waits for your yes or a long answer is done. At most one comes every 30 seconds and several become one, while Hours without notices and Quiet hold them. /vaken-settings notify.how sound adds a sound, speak says it.': 'After 2 minutes with no press or prompt, vaken sends one Windows notification when another session needs you or a plan limit is near; with This session too, also when a step here waits for your yes or a long answer is done. At most one comes every 30 seconds and several become one, while Hours without notices and Quiet hold them. /vaken-settings notify.how sound adds a sound, speak says it.',
  'Turn it on with /vaken-settings night.mode on, then type /vaken-tasks night. The run goes only on mains power, inside the plan limit and its cost limit, with away mode\'s strict checks on and the Mac kept awake if keep-awake is on. In the morning, Where was I shows what is done.': 'Turn it on with /vaken-settings night.mode on, then type /vaken-tasks night. The run goes only on mains power, inside the plan limit and its cost limit, with away mode\'s strict checks on and the PC kept awake if keep-awake is on. In the morning, Where was I shows what is done.',
}

export const WIN_ENGLISH: Record<string, string> = {
  'Show why the Mac is kept awake; "on" or "off" turns it on or off': 'Show why the PC is kept awake; "on" or "off" turns it on or off',
  'Keep Mac awake is on. The Mac stays awake while a session works and while a phone is connected, up to 8 hours in a row. Closing the lid still sleeps the Mac. Type /vaken-help run awake off to turn it off.':
    'Keep PC awake is on. The PC stays awake while a session works and while a phone is connected, up to 8 hours in a row. Closing the lid may still sleep the PC (that follows your Windows power settings). Type /vaken-help run awake off to turn it off.',
  'Keep Mac awake is off. The hold ends within a minute.': 'Keep PC awake is off. The hold ends within a minute.',
  'An agent was working, a phone was connected, or a question waited, so vaken kept your Mac awake.': 'An agent was working, a phone was connected, or a question waited, so vaken kept your PC awake.',
  'A sleeping Mac stops the work.': 'A sleeping PC stops the work.',
  '/vaken-help run awake shows the state. Settings > Agents > Keep Mac awake turns it off.': '/vaken-help run awake shows the state. Settings > Agents > Keep PC awake turns it off.',
  'Vaken had kept your Mac awake for 8 hours in a row, which is the most it allows. It let the Mac sleep.': 'Vaken had kept your PC awake for 8 hours in a row, which is the most it allows. It let the PC sleep.',
  'A Mac that never sleeps wears the battery and the screen.': 'A PC that never sleeps wears the battery and the screen.',
  'The Preview card needs Google Chrome. It was not found at /Applications/Google Chrome.app. Install it from google.com/chrome, then try again. Nothing else is needed.':
    'The Preview card needs Chrome or Edge. Neither was found in its usual folder. Install Chrome from google.com/chrome, then try again. Nothing else is needed.',
  'Whether the dev server of your front-end work is up and answers, and pictures of the page at phone, iPad and desktop size, taken by the Chrome on this Mac in the background. Vaken looks at the usual dev ports and never starts a server.':
    'Whether the dev server of your front-end work is up and answers, and pictures of the page at phone, iPad and desktop size, taken by Chrome (or Edge) on this PC in the background. Vaken looks at the usual dev ports and never starts a server.',
  'taken by the Chrome on this Mac in the background.': 'taken by Chrome (or Edge) on this PC in the background.',
  // Windows has no memory-pressure level.
  'Computer load: on, but none of the programs gave an answer. It works on a Mac only.': 'Computer load: on, but the PowerShell program gave no answer. Check that PowerShell can start on this PC.',
  '(An estimate from vm_stat: the system level could not be read.)': '(An estimate from the share of memory that is free: Windows has no pressure level.)',
  'the Mac reports memory pressure': 'the PC reports memory pressure',
  'macOS itself reports memory pressure ({p}), even if the share used looks fine, so no new agent should start.': 'Windows itself reports memory pressure ({p}), even if the share used looks fine, so no new agent should start.',
  // Plain slash answers about plan room.
  'As many at a time as this Mac has room for.': 'As many at a time as this PC has room for.',
  'as many at a time as this Mac has room for': 'as many at a time as this PC has room for',
  // The /vaken-tasks slash menu hint (English only).
  'Run a task list with agents, as many at a time as this Mac has room for (or your own limit), and steer it. A word after it runs a part: agents, agents-board, route, goal.':
    'Run a task list with agents, as many at a time as this PC has room for (or your own limit), and steer it. A word after it runs a part: agents, agents-board, route, goal.',
}

export const sysWord = (s: string, sys: WordSystem = shown): string => (sys !== 'win32' ? s : Object.hasOwn(WIN_SHOWN, s) ? WIN_SHOWN[s] : Object.hasOwn(WIN_ENGLISH, s) ? WIN_ENGLISH[s] : s)

