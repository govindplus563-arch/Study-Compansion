// All calendar days are stored as local "YYYY-MM-DD" strings (no time zone shifts).
const pad = (n) => String(n).padStart(2, '0')

export function toDateStr(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function today() {
  return toDateStr(new Date())
}

export function parseDate(str) {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function isValidDateStr(str) {
  if (typeof str !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return false
  return toDateStr(parseDate(str)) === str
}

export function addDays(str, n) {
  const d = parseDate(str)
  d.setDate(d.getDate() + n)
  return toDateStr(d)
}

export function diffDays(a, b) {
  return Math.round((parseDate(a) - parseDate(b)) / 86400000)
}

// Weeks start on Monday.
export function startOfWeek(str) {
  const d = parseDate(str)
  return addDays(str, -((d.getDay() + 6) % 7))
}

export function formatDate(str) {
  if (!isValidDateStr(str)) return '—'
  return parseDate(str).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatShortDate(str) {
  if (!isValidDateStr(str)) return '—'
  return parseDate(str).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
}

export function formatMinutes(min) {
  const m = Math.round(Number(min) || 0)
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const r = m % 60
  return r ? `${h} h ${r} min` : `${h} h`
}
