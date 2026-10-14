// The shapes of the one text table

// The languages come from the registry (i18n/langs.ts): a language is a code there ("en", "sv", "de")
export { LANGS } from './langs'
export type Lang = string

// A text: plain, or plural forms chosen by the fill-in `n`
export type Plural = { one: string; other: string }
export type Text = string | Plural
// A translation: a text, or only the plural forms its language's rule needs
export type Said = string | Partial<Plural>

// One row: its English, its translations by language code
export type Row = { en: Text; note?: string } & { [lang: string]: Said | undefined }

// The rows of one area, keyed by name ("area.short_slug")
export type Rows = Record<string, Row>

// The fill-ins of a text, by name: "{n}" takes vars.n
export type Vars = Record<string, string | number>
