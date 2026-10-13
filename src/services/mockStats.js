import { percent } from '../utils/numbers'

export const mockPercent = (m) => percent(m.marksObtained, m.maxMarks)
export const MIN_TESTS_FOR_TREND = 3

// Totals come from the subject rows when a breakdown exists.
export function totalsFromScores(scores) {
  return {
    marksObtained: scores.reduce((t, s) => t + s.obtained, 0),
    maxMarks: scores.reduce((t, s) => t + s.max, 0),
  }
}

export function sortedByDate(mocks) {
  return [...mocks].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt?.localeCompare(b.createdAt || '') || 0)
}

// Trend is only reported with enough real tests; otherwise returns null.
export function overallTrend(mocks) {
  if (mocks.length < MIN_TESTS_FOR_TREND) return null
  const ordered = sortedByDate(mocks)
  const latest = mockPercent(ordered[ordered.length - 1])
  const earlier = ordered.slice(0, -1)
  const earlierAvg = earlier.reduce((t, m) => t + mockPercent(m), 0) / earlier.length
  const diff = Math.round((latest - earlierAvg) * 10) / 10
  return { latest, earlierAvg: Math.round(earlierAvg * 10) / 10, diff, direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat', count: mocks.length }
}

// Average % per subject across tests that include that subject's marks.
export function subjectAverages(mocks) {
  const acc = new Map()
  for (const m of mocks) {
    for (const s of m.scores) {
      const cur = acc.get(s.subjectId) || { subjectId: s.subjectId, obtained: 0, max: 0, tests: 0 }
      cur.obtained += s.obtained
      cur.max += s.max
      cur.tests += 1
      acc.set(s.subjectId, cur)
    }
  }
  return [...acc.values()].map((a) => ({ ...a, average: percent(a.obtained, a.max) })).sort((a, b) => a.average - b.average)
}
