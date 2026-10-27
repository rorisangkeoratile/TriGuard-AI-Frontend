// TriGuard detection engine: plain functions with no DOM or React, so the same code can run in the browser,
// in tests, and on a Node backend.
export { analyze, scamType } from './analyze.js'
export { normalizeNumber, formatNumber, prepareText, hashString, cap } from './normalize.js'
export { origin } from './origin.js'
export { detectLang, langLabel, LANGUAGES, LANG_NAMES, ML } from './language.js'
export { BRANDS, linkUrls, hostOf } from './rules.js'
export { TIPS } from './tips.js'
