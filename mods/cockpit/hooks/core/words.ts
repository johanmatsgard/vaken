// Small words many blocks need, written once: counts with a noun, two-digit padding, percent.
import { tEn } from '../i18n/t'


export const timesWord = (n: number): string => tEn('words.times', { n })

export const pad2 = (n: number): string => String(n).padStart(2, '0')

export const percentOf = (share: number): number => Math.round(share * 100)

export const partPct = (part: number, whole: number): number => (whole <= 0 ? 0 : percentOf(part / whole))
