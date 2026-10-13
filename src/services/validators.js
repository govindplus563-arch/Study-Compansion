// Form validators. Each returns an object of { fieldName: 'message' }; empty object = valid.
import { CHAPTER_STATUSES, LECTURE_STATUSES, MISTAKE_CATEGORIES, PRIORITIES, RECALL_LEVELS, TASK_TYPES } from '../data/constants'
import { isValidDateStr } from '../utils/dates'
import { isNonNegInt, toNum } from '../utils/numbers'

const required = (v) => typeof v !== 'string' || v.trim() === ''

function optionalMinutes(errors, key, raw, label) {
  const n = toNum(raw)
  if (n !== null && !(isNonNegInt(n) && n <= 1440)) errors[key] = `${label} must be a whole number of minutes (0–1440).`
}

function optionalCount(errors, key, raw, label) {
  const n = toNum(raw)
  if (n !== null && !(isNonNegInt(n) && n <= 100000)) errors[key] = `${label} must be a whole number (0 or more).`
}

export function validateSubject(v, data, editingId = null) {
  const e = {}
  if (required(v.name)) e.name = 'Enter a subject name.'
  else if (data.subjects.some((s) => s.id !== editingId && !s.archived && s.name.trim().toLowerCase() === v.name.trim().toLowerCase())) {
    e.name = 'A subject with this name already exists.'
  }
  return e
}

export function validateChapter(v, data, editingId = null) {
  const e = {}
  if (required(v.name)) e.name = 'Enter a chapter name.'
  else if (data.chapters.some((c) => c.id !== editingId && c.subjectId === v.subjectId && !c.archived && c.name.trim().toLowerCase() === v.name.trim().toLowerCase())) {
    e.name = 'This subject already has a chapter with this name.'
  }
  if (!CHAPTER_STATUSES.includes(v.status)) e.status = 'Choose a status.'
  if (!PRIORITIES.includes(v.priority)) e.priority = 'Choose a priority.'
  optionalCount(e, 'lecturesPlanned', v.lecturesPlanned, 'Lectures planned')
  optionalCount(e, 'questionsTarget', v.questionsTarget, 'Question target')
  optionalCount(e, 'questionsPracticed', v.questionsPracticed, 'Questions practised')
  return e
}

export function validateTask(v) {
  const e = {}
  if (required(v.title)) e.title = 'Enter a task title.'
  if (!TASK_TYPES.includes(v.type)) e.type = 'Choose a task type.'
  if (!isValidDateStr(v.date)) e.date = 'Choose a valid date.'
  optionalMinutes(e, 'plannedMin', v.plannedMin, 'Planned time')
  optionalMinutes(e, 'actualMin', v.actualMin, 'Actual time')
  return e
}

export function validateLecture(v) {
  const e = {}
  if (required(v.title)) e.title = 'Enter a lecture title or number.'
  if (!v.chapterId) e.chapterId = 'Choose a chapter.'
  if (!isValidDateStr(v.date)) e.date = 'Choose a valid date.'
  if (!LECTURE_STATUSES.includes(v.status)) e.status = 'Choose a status.'
  optionalMinutes(e, 'plannedMin', v.plannedMin, 'Planned duration')
  optionalMinutes(e, 'watchedMin', v.watchedMin, 'Watched duration')
  optionalCount(e, 'questionsPracticed', v.questionsPracticed, 'Questions practised')
  return e
}

export function validateRevision(v) {
  const e = {}
  if (required(v.topic) && !v.chapterId) e.topic = 'Enter a topic or choose a chapter.'
  if (!isValidDateStr(v.nextDate)) e.nextDate = 'Choose a valid date.'
  return e
}

export function validateRevisionRecord(v) {
  const e = {}
  if (!isValidDateStr(v.date)) e.date = 'Choose a valid date.'
  if (!RECALL_LEVELS.includes(v.recall)) e.recall = 'Choose how well you recalled it.'
  const c = Number(v.confidence)
  if (!(Number.isInteger(c) && c >= 1 && c <= 5)) e.confidence = 'Confidence must be 1 to 5.'
  if (!isValidDateStr(v.nextDate)) e.nextDate = 'Choose a valid next review date.'
  else if (isValidDateStr(v.date) && v.nextDate < v.date) e.nextDate = 'The next review cannot be before this review.'
  return e
}

export function validateMistake(v) {
  const e = {}
  if (!MISTAKE_CATEGORIES.includes(v.category)) e.category = 'Choose a category.'
  if (required(v.reference)) e.reference = 'Add a question reference or a short description.'
  if (required(v.whatWentWrong)) e.whatWentWrong = 'Describe what went wrong.'
  if (required(v.correctApproach)) e.correctApproach = 'Write the correct approach.'
  if (!isValidDateStr(v.recordedOn)) e.recordedOn = 'Choose a valid date.'
  if (v.nextPracticeDate && !isValidDateStr(v.nextPracticeDate)) e.nextPracticeDate = 'Choose a valid date.'
  else if (v.nextPracticeDate && isValidDateStr(v.recordedOn) && v.nextPracticeDate < v.recordedOn) {
    e.nextPracticeDate = 'The next practice date cannot be before the date recorded.'
  }
  return e
}

export function validateAttempt(v) {
  const e = {}
  if (!isValidDateStr(v.date)) e.date = 'Choose a valid date.'
  if (v.nextPracticeDate && !isValidDateStr(v.nextPracticeDate)) e.nextPracticeDate = 'Choose a valid date.'
  return e
}

// Marks are validated as numbers: 0 <= obtained <= max, max > 0.
export function checkMarks(obtained, max) {
  if (obtained === null || max === null) return 'Enter both marks obtained and maximum marks.'
  if (!Number.isFinite(obtained) || !Number.isFinite(max)) return 'Marks must be numbers.'
  if (max <= 0) return 'Maximum marks must be more than 0.'
  if (obtained < 0) return 'Marks obtained cannot be negative.'
  if (obtained > max) return 'Marks obtained cannot be more than the maximum marks.'
  return null
}

export function validateMock(v) {
  const e = {}
  if (required(v.name)) e.name = 'Enter a test name.'
  if (!isValidDateStr(v.date)) e.date = 'Choose a valid date.'
  optionalMinutes(e, 'durationMin', v.durationMin, 'Duration')
  if (v.breakdown) {
    const seen = new Set()
    if (v.rows.length === 0) e.rows = 'Add at least one subject row, or switch off the subject-wise breakdown.'
    const rowErrors = v.rows.map((r) => {
      if (!r.subjectId) return 'Choose a subject.'
      if (seen.has(r.subjectId)) return 'Each subject can be listed only once.'
      seen.add(r.subjectId)
      return checkMarks(toNum(r.obtained), toNum(r.max))
    })
    if (rowErrors.some(Boolean)) e.rowErrors = rowErrors
  } else {
    const msg = checkMarks(toNum(v.marksObtained), toNum(v.maxMarks))
    if (msg) e.marks = msg
  }
  return e
}

export function validateSettings(v) {
  const e = {}
  const target = toNum(v.dailyTargetMinutes)
  if (target === null || !(Number.isInteger(target) && target >= 1 && target <= 1440)) {
    e.dailyTargetMinutes = 'Enter minutes per day (1–1440).'
  }
  if (v.examDate && !isValidDateStr(v.examDate)) e.examDate = 'Choose a valid date.'
  for (const level of RECALL_LEVELS) {
    const n = toNum(v.intervals[level])
    if (n === null || !(Number.isInteger(n) && n >= 1 && n <= 365)) e[`interval_${level}`] = 'Whole days, 1–365.'
  }
  return e
}
