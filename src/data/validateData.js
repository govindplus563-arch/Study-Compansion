import {
  ATTEMPT_RESULTS,
  CHAPTER_STATUSES,
  COLLECTIONS,
  LECTURE_STATUSES,
  MISTAKE_CATEGORIES,
  PRIORITIES,
  RECALL_LEVELS,
  TASK_TYPES,
} from './constants'
import { isValidDateStr } from '../utils/dates'

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)
const isStr = (v) => typeof v === 'string'
const isNum = (v) => typeof v === 'number' && Number.isFinite(v)
const optNum = (v) => v === null || v === undefined || (isNum(v) && v >= 0)

// Strictly checks a whole data set (used for imports and for reading storage).
// Returns a list of plain-English problems; an empty list means the data is usable.
export function validateData(d) {
  const errors = []
  const add = (m) => {
    if (errors.length < 25) errors.push(m)
  }

  if (!isObj(d)) return ['The data is not a valid object.']
  for (const k of COLLECTIONS) if (!Array.isArray(d[k])) add(`"${k}" is missing or is not a list.`)
  if (!isObj(d.settings)) add('"settings" is missing.')
  if (errors.length) return errors

  const ids = {}
  for (const k of COLLECTIONS) {
    const seen = new Set()
    d[k].forEach((r, i) => {
      if (!isObj(r) || !isStr(r.id) || !r.id) return add(`${k} item ${i + 1} has no valid id.`)
      if (seen.has(r.id)) add(`${k} contains a duplicate id (${r.id}).`)
      seen.add(r.id)
    })
    ids[k] = seen
  }
  if (errors.length) return errors

  const has = (k, id) => ids[k].has(id)
  const optRef = (k, id) => id === null || id === undefined || id === '' || has(k, id)
  const named = (r) => (isStr(r.name) && r.name.trim() ? r.name : r.id)

  d.subjects.forEach((s) => {
    if (!isStr(s.name) || !s.name.trim()) add(`Subject ${s.id} has no name.`)
  })

  d.chapters.forEach((c) => {
    if (!isStr(c.name) || !c.name.trim()) add(`Chapter ${c.id} has no name.`)
    if (!has('subjects', c.subjectId)) add(`Chapter "${named(c)}" points to a subject that does not exist.`)
    if (!CHAPTER_STATUSES.includes(c.status)) add(`Chapter "${named(c)}" has an unknown status.`)
    if (!PRIORITIES.includes(c.priority)) add(`Chapter "${named(c)}" has an unknown priority.`)
    for (const f of ['lecturesPlanned', 'questionsTarget', 'questionsPracticed']) {
      if (!optNum(c[f])) add(`Chapter "${named(c)}" has an invalid ${f}.`)
    }
  })

  d.tasks.forEach((t) => {
    if (!isStr(t.title) || !t.title.trim()) add(`Task ${t.id} has no title.`)
    if (!TASK_TYPES.includes(t.type)) add(`Task "${t.title}" has an unknown type.`)
    if (!isValidDateStr(t.date)) add(`Task "${t.title}" has an invalid date.`)
    if (!optRef('subjects', t.subjectId)) add(`Task "${t.title}" points to a missing subject.`)
    if (!optRef('chapters', t.chapterId)) add(`Task "${t.title}" points to a missing chapter.`)
    if (!optNum(t.plannedMin) || !optNum(t.actualMin)) add(`Task "${t.title}" has invalid minutes.`)
    if (typeof t.done !== 'boolean') add(`Task "${t.title}" has an invalid done flag.`)
  })

  d.lectures.forEach((l) => {
    if (!isStr(l.title) || !l.title.trim()) add(`Lecture ${l.id} has no title.`)
    if (!has('subjects', l.subjectId)) add(`Lecture "${l.title}" points to a missing subject.`)
    if (!has('chapters', l.chapterId)) add(`Lecture "${l.title}" points to a missing chapter.`)
    if (!LECTURE_STATUSES.includes(l.status)) add(`Lecture "${l.title}" has an unknown status.`)
    if (!isValidDateStr(l.date)) add(`Lecture "${l.title}" has an invalid date.`)
    if (!optNum(l.plannedMin) || !optNum(l.watchedMin) || !optNum(l.questionsPracticed)) {
      add(`Lecture "${l.title}" has invalid numbers.`)
    }
  })

  d.revisions.forEach((r) => {
    if (!isStr(r.topic)) add(`Revision ${r.id} has an invalid topic.`)
    if (!optRef('chapters', r.chapterId)) add(`Revision "${r.topic}" points to a missing chapter.`)
    if (!optRef('subjects', r.subjectId)) add(`Revision "${r.topic}" points to a missing subject.`)
    if (!isValidDateStr(r.nextDate)) add(`Revision "${r.topic}" has an invalid next date.`)
    if (!Array.isArray(r.history)) return add(`Revision "${r.topic}" has no history list.`)
    r.history.forEach((h) => {
      if (!isObj(h) || !isValidDateStr(h.date) || !RECALL_LEVELS.includes(h.recall)) {
        add(`Revision "${r.topic}" has a broken history entry.`)
      }
    })
  })

  d.mistakes.forEach((m) => {
    if (!MISTAKE_CATEGORIES.includes(m.category)) add(`Mistake ${m.id} has an unknown category.`)
    if (!optRef('subjects', m.subjectId)) add(`Mistake ${m.id} points to a missing subject.`)
    if (!optRef('chapters', m.chapterId)) add(`Mistake ${m.id} points to a missing chapter.`)
    if (!isValidDateStr(m.recordedOn)) add(`Mistake ${m.id} has an invalid recorded date.`)
    if (m.nextPracticeDate && !isValidDateStr(m.nextPracticeDate)) add(`Mistake ${m.id} has an invalid next practice date.`)
    if (typeof m.resolved !== 'boolean') add(`Mistake ${m.id} has an invalid resolved flag.`)
    if (!Array.isArray(m.attempts)) return add(`Mistake ${m.id} has no attempts list.`)
    m.attempts.forEach((a) => {
      if (!isObj(a) || !isValidDateStr(a.date) || !ATTEMPT_RESULTS.includes(a.result)) {
        add(`Mistake ${m.id} has a broken attempt entry.`)
      }
    })
  })

  d.mockTests.forEach((t) => {
    if (!isStr(t.name) || !t.name.trim()) add(`Mock test ${t.id} has no name.`)
    if (!isValidDateStr(t.date)) add(`Mock test "${t.name}" has an invalid date.`)
    if (!isNum(t.marksObtained) || !isNum(t.maxMarks) || t.maxMarks <= 0 || t.marksObtained < 0 || t.marksObtained > t.maxMarks) {
      add(`Mock test "${t.name}" has invalid marks.`)
    }
    if (!Array.isArray(t.scores)) return add(`Mock test "${t.name}" has no subject scores list.`)
    t.scores.forEach((s) => {
      const ok = isObj(s) && has('subjects', s.subjectId) && isNum(s.obtained) && isNum(s.max) && s.max > 0 && s.obtained >= 0 && s.obtained <= s.max
      if (!ok) add(`Mock test "${t.name}" has an invalid subject score.`)
    })
  })

  const s = d.settings
  if (s.dailyTargetMinutes !== undefined && !(isNum(s.dailyTargetMinutes) && s.dailyTargetMinutes > 0)) {
    add('Settings: the daily study target is invalid.')
  }
  if (s.revisionIntervals !== undefined) {
    if (!isObj(s.revisionIntervals)) add('Settings: revision intervals are invalid.')
    else {
      for (const level of RECALL_LEVELS) {
        const v = s.revisionIntervals[level]
        if (v !== undefined && !(Number.isInteger(v) && v >= 1 && v <= 365)) add(`Settings: the "${level}" interval is invalid.`)
      }
    }
  }
  return errors
}
