// Pure data functions: (data, input) => new data. Nothing here touches the screen or localStorage.
import { newId, nowIso } from '../utils/ids'
import { addDays } from '../utils/dates'

const patch = (list, id, fn) => list.map((x) => (x.id === id ? fn(x) : x))
const nextOrder = (list) => list.reduce((m, x) => Math.max(m, x.order || 0), 0) + 1

// Moves one item up (-1) or down (+1) among its visible siblings and renumbers them 1..n.
function move(list, id, dir, inGroup) {
  const group = list.filter(inGroup).sort((a, b) => a.order - b.order)
  const i = group.findIndex((x) => x.id === id)
  const j = i + dir
  if (i < 0 || j < 0 || j >= group.length) return list
  ;[group[i], group[j]] = [group[j], group[i]]
  const order = new Map(group.map((x, k) => [x.id, k + 1]))
  return list.map((x) => (order.has(x.id) ? { ...x, order: order.get(x.id) } : x))
}

// ---------- subjects ----------
export function addSubject(d, { name }) {
  const s = { id: newId('sub'), name: name.trim(), order: nextOrder(d.subjects), archived: false, createdAt: nowIso() }
  return { ...d, subjects: [...d.subjects, s] }
}
export const updateSubject = (d, id, { name }) => ({ ...d, subjects: patch(d.subjects, id, (s) => ({ ...s, name: name.trim() })) })
// Archiving only hides a subject. Its chapters, lectures, tasks and history stay untouched.
export const setSubjectArchived = (d, id, archived) => ({ ...d, subjects: patch(d.subjects, id, (s) => ({ ...s, archived })) })
export const moveSubject = (d, id, dir) => ({ ...d, subjects: move(d.subjects, id, dir, (s) => !s.archived) })

// ---------- chapters ----------
export function addChapter(d, input) {
  const siblings = d.chapters.filter((c) => c.subjectId === input.subjectId)
  const c = { ...input, name: input.name.trim(), id: newId('chap'), order: nextOrder(siblings), archived: false, createdAt: nowIso() }
  return { ...d, chapters: [...d.chapters, c] }
}
export const updateChapter = (d, id, input) => ({
  ...d,
  chapters: patch(d.chapters, id, (c) => ({ ...c, ...input, name: input.name.trim() })),
})
export const setChapterStatus = (d, id, status) => ({ ...d, chapters: patch(d.chapters, id, (c) => ({ ...c, status })) })
export const setChapterArchived = (d, id, archived) => ({ ...d, chapters: patch(d.chapters, id, (c) => ({ ...c, archived })) })
export const moveChapter = (d, id, dir) => {
  const chapter = d.chapters.find((c) => c.id === id)
  if (!chapter) return d
  return { ...d, chapters: move(d.chapters, id, dir, (c) => c.subjectId === chapter.subjectId && !c.archived) }
}

// ---------- tasks ----------
const cleanTask = (t) => ({ ...t, title: t.title.trim(), subjectId: t.subjectId || null, chapterId: t.chapterId || null })
export function addTask(d, input) {
  const t = { done: false, doneOn: null, ...cleanTask(input), id: newId('task'), createdAt: nowIso() }
  return { ...d, tasks: [...d.tasks, t] }
}
export const updateTask = (d, id, input) => ({ ...d, tasks: patch(d.tasks, id, (t) => ({ ...t, ...cleanTask(input) })) })
export const deleteTask = (d, id) => ({ ...d, tasks: d.tasks.filter((t) => t.id !== id) })
export const completeTask = (d, id, actualMin, onDate) => ({
  ...d,
  tasks: patch(d.tasks, id, (t) => ({ ...t, done: true, doneOn: onDate, actualMin: actualMin ?? t.actualMin ?? null })),
})
export const reopenTask = (d, id) => ({ ...d, tasks: patch(d.tasks, id, (t) => ({ ...t, done: false, doneOn: null })) })
export const rescheduleTask = (d, id, date) => ({ ...d, tasks: patch(d.tasks, id, (t) => ({ ...t, date })) })

// ---------- lectures ----------
export function addLecture(d, input) {
  const l = { ...input, title: input.title.trim(), id: newId('lec'), createdAt: nowIso() }
  return { ...d, lectures: [...d.lectures, l] }
}
export const updateLecture = (d, id, input) => ({
  ...d,
  lectures: patch(d.lectures, id, (l) => ({ ...l, ...input, title: input.title.trim() })),
})
export const deleteLecture = (d, id) => ({ ...d, lectures: d.lectures.filter((l) => l.id !== id) })

// ---------- revisions ----------
export function addRevision(d, { topic, subjectId, chapterId, nextDate }) {
  const r = {
    id: newId('rev'),
    topic: topic.trim(),
    subjectId: subjectId || null,
    chapterId: chapterId || null,
    nextDate,
    history: [],
    archived: false,
    createdAt: nowIso(),
  }
  return { ...d, revisions: [...d.revisions, r] }
}
export const updateRevision = (d, id, { topic, subjectId, chapterId }) => ({
  ...d,
  revisions: patch(d.revisions, id, (r) => ({ ...r, topic: topic.trim(), subjectId: subjectId || null, chapterId: chapterId || null })),
})
// History is only ever appended to, never overwritten.
export const recordRevision = (d, id, entry, nextDate) => ({
  ...d,
  revisions: patch(d.revisions, id, (r) => ({
    ...r,
    nextDate,
    history: [...r.history, { id: newId('rh'), ...entry, notes: entry.notes.trim(), nextDate }],
  })),
})
export const rescheduleRevision = (d, id, nextDate) => ({ ...d, revisions: patch(d.revisions, id, (r) => ({ ...r, nextDate })) })
export const setRevisionArchived = (d, id, archived) => ({ ...d, revisions: patch(d.revisions, id, (r) => ({ ...r, archived })) })

// ---------- mistakes ----------
const cleanMistake = (m) => ({
  ...m,
  subjectId: m.subjectId || null,
  chapterId: m.chapterId || null,
  reference: m.reference.trim(),
  whatWentWrong: m.whatWentWrong.trim(),
  correctApproach: m.correctApproach.trim(),
  nextPracticeDate: m.nextPracticeDate || null,
})
export function addMistake(d, input) {
  const m = { resolved: false, resolvedOn: null, attempts: [], ...cleanMistake(input), id: newId('mis'), createdAt: nowIso() }
  return { ...d, mistakes: [...d.mistakes, m] }
}
export const updateMistake = (d, id, input) => ({ ...d, mistakes: patch(d.mistakes, id, (m) => ({ ...m, ...cleanMistake(input) })) })
export const deleteMistake = (d, id) => ({ ...d, mistakes: d.mistakes.filter((m) => m.id !== id) })
export const recordAttempt = (d, id, attempt, nextPracticeDate) => ({
  ...d,
  mistakes: patch(d.mistakes, id, (m) => ({
    ...m,
    nextPracticeDate: nextPracticeDate || null,
    attempts: [...m.attempts, { id: newId('att'), ...attempt, note: attempt.note.trim() }],
  })),
})
export const setMistakeResolved = (d, id, resolved, onDate) => ({
  ...d,
  mistakes: patch(d.mistakes, id, (m) => ({
    ...m,
    resolved,
    resolvedOn: resolved ? onDate : null,
    nextPracticeDate: resolved ? null : m.nextPracticeDate || addDays(onDate, 1),
  })),
})

// ---------- mock tests ----------
const cleanMock = (m) => ({ ...m, name: m.name.trim(), notes: m.notes.trim(), improveTopics: m.improveTopics.trim() })
export function addMock(d, input) {
  return { ...d, mockTests: [...d.mockTests, { ...cleanMock(input), id: newId('mock'), createdAt: nowIso() }] }
}
export const updateMock = (d, id, input) => ({ ...d, mockTests: patch(d.mockTests, id, (m) => ({ ...m, ...cleanMock(input) })) })
export const deleteMock = (d, id) => ({ ...d, mockTests: d.mockTests.filter((m) => m.id !== id) })

// ---------- settings ----------
export const updateSettings = (d, changes) => ({ ...d, settings: { ...d.settings, ...changes } })
