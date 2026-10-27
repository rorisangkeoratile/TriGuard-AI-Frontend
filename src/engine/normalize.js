// Number and text normalisation shared by the detection engine and the UI. No DOM access.

/** Turns any South African or international format into E.164 (+27821234567), or null if it isn't a phone number. */
export function normalizeNumber(raw) {
  if (!raw) return null
  let s = String(raw).trim().replace(/[\s\-().]/g, '')
  if (s.startsWith('00')) s = '+' + s.slice(2)
  if (/^0\d{9}$/.test(s)) s = '+27' + s.slice(1)
  else if (/^27\d{9}$/.test(s)) s = '+' + s
  return /^\+\d{8,15}$/.test(s) ? s : null
}

/** Formats an E.164 number for display: +27 82 123 4567. */
export function formatNumber(n) {
  if (!n) return ''
  if (/^\+27\d{9}$/.test(n)) return `+27 ${n.slice(3, 5)} ${n.slice(5, 8)} ${n.slice(8)}`
  return n.replace(/^(\+\d{2})(\d{2})(\d{4})(\d+)$/, '$1 $2 $3 $4')
}

export const cap = s => s.replace(/\b\w/g, c => c.toUpperCase())

/** Small stable hash (FNV-1a), used for repeatable simulated numbers. */
export function hashString(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}

const ZERO_WIDTH = /[​-‍⁠﻿­]/g
// Cyrillic and Greek letters that look like Latin ones ("оtp" with a Cyrillic о)
const HOMOGLYPHS = {
  'а': 'a', 'е': 'e', 'о': 'o', 'р': 'p', 'с': 'c', 'у': 'y', 'х': 'x', 'і': 'i', 'ј': 'j', 'ѕ': 's', 'ԁ': 'd', 'ɡ': 'g',
  'А': 'A', 'В': 'B', 'Е': 'E', 'К': 'K', 'М': 'M', 'Н': 'H', 'О': 'O', 'Р': 'P', 'С': 'C', 'Т': 'T', 'Х': 'X',
  'ο': 'o', 'α': 'a', 'ε': 'e', 'ι': 'i', 'κ': 'k', 'ν': 'v', 'ρ': 'p', 'τ': 't', 'υ': 'u',
  'Α': 'A', 'Β': 'B', 'Ε': 'E', 'Ζ': 'Z', 'Η': 'H', 'Ι': 'I', 'Κ': 'K', 'Μ': 'M', 'Ν': 'N', 'Ο': 'O', 'Ρ': 'P', 'Τ': 'T', 'Υ': 'Y', 'Χ': 'X',
}
const HOMOGLYPH_RE = new RegExp('[' + Object.keys(HOMOGLYPHS).join('') + ']', 'g')
const LEET = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's' }

/**
 * Prepares message text for the rules.
 * - text:  Unicode-normalised, with zero-width characters removed and look-alike letters replaced. Used for display-level
 *          checks such as amounts and links.
 * - loose: a lower-case copy that also undoes common disguises: spaced-out letters ("O T P", "o.t.p") and digits or
 *          symbols inside words ("0TP", "P1N", "urg3nt", "p@y"). Only used for keyword matching.
 */
export function prepareText(raw) {
  const text = String(raw || '').normalize('NFKC').replace(ZERO_WIDTH, '').replace(HOMOGLYPH_RE, c => HOMOGLYPHS[c])
  const loose = text.toLowerCase()
    .replace(/(?<![\p{L}\d])(?:[\p{L}\d][\s.\-_*]){2,}[\p{L}\d](?![\p{L}\d])/gu, m => m.replace(/[\s.\-_*]/g, ''))
    .replace(/[\p{L}\d@$]+/gu, w => (/\p{L}/u.test(w) && /[\d@$]/.test(w) ? w.replace(/[013457@$]/g, c => LEET[c]) : w))
  return { text, loose }
}
