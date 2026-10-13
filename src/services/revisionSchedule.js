import { DEFAULT_INTERVALS } from '../data/constants'
import { addDays } from '../utils/dates'

// Transparent rule: the next review is "interval for this recall level" days after the review.
// Poor recall -> short gap, strong recall -> longer gap. It is a planning aid, not a guarantee of retention.
export function nextRevisionDate(fromDate, recall, intervals) {
  const days = intervals?.[recall] ?? DEFAULT_INTERVALS[recall]
  return addDays(fromDate, days)
}

export function revisionBucket(rev, todayStr) {
  if (rev.archived) return 'archived'
  if (rev.nextDate < todayStr) return 'overdue'
  if (rev.nextDate === todayStr) return 'today'
  return 'upcoming'
}

export function groupRevisions(revisions, todayStr) {
  const groups = { overdue: [], today: [], upcoming: [] }
  for (const r of revisions) {
    const b = revisionBucket(r, todayStr)
    if (groups[b]) groups[b].push(r)
  }
  for (const k of Object.keys(groups)) groups[k].sort((a, b) => a.nextDate.localeCompare(b.nextDate))
  return groups
}

export const lastReview = (rev) => rev.history[rev.history.length - 1] || null

// When a mistake is re-attempted: correct -> "good" gap, wrong -> "okay" gap (both editable in Settings).
export function nextMistakeDate(fromDate, result, intervals) {
  return nextRevisionDate(fromDate, result === 'correct' ? 'good' : 'okay', intervals)
}
