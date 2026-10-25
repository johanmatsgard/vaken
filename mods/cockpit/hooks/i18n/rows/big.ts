// Area "big": the words of core/bigfile.ts
import type { Rows } from '../types'

export const ROWS: Rows = {
  "big.ask": {"en":"{name} is big: {lines} lines, {size}. Send Claude only the last {tail} lines?","sv":"{name} är stor: {lines} rader, {size}. Skicka bara de sista {tail} raderna till Claude?"},
  "big.big_file": {"en":"Big file","sv":"Stor fil"},
  "big.failed": {"en":"Could not send part of {name}. Type @{mention}#L{from}-{to} to send its last {tail} lines.","sv":"Kunde inte skicka en del av {name}. Skriv @{mention}#L{from}-{to} för att skicka de sista {tail} raderna."},
  "big.help_text": {"en":"When you name a file after @ that has more than 2000 lines or 200 KB, such as a lock file or a log, vaken asks once: Send the last 200 lines instead, or Send the whole file. Only your press changes what Claude reads; with no answer the file goes whole, and you can type the lines yourself (@app.log#L800-1000). Lean session Off turns the question off.","sv":"När du nämner en fil efter @ som har fler än 2000 rader eller 200 KB, till exempel en låsfil eller en logg, frågar vaken en gång: Skicka de sista 200 raderna i stället, eller Skicka hela filen. Bara ditt tryck ändrar vad Claude läser; utan svar går hela filen, och du kan skriva raderna själv (@app.log#L800-1000). Smal session Av stänger av frågan."},
  "big.help_title": {"en":"Why vaken asks about a big file","sv":"Varför vaken frågar om en stor fil"},
  "big.send_the_last_lines_instead": {"en":"Send the last {tail} lines instead","sv":"Skicka de sista {tail} raderna i stället"},
  "big.send_the_whole_file": {"en":"Send the whole file","sv":"Skicka hela filen"},
}
