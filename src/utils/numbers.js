// Form inputs give strings. "" means "not entered" (null); anything else becomes a number (maybe NaN).
export function toNum(value) {
  if (value === '' || value === null || value === undefined) return null
  return Number(value)
}

export const isNonNegInt = (n) => Number.isInteger(n) && n >= 0
export const sum = (list, pick) => list.reduce((total, item) => total + (Number(pick(item)) || 0), 0)
export const percent = (obtained, max) => (max > 0 ? Math.round((obtained / max) * 1000) / 10 : 0)
