import { describe, expect, it, beforeEach } from 'vitest'
import { addDays, diffDays, isValidDateStr, startOfWeek, toDateStr } from '../src/utils/dates'
import { createEmptyData, createStarterData } from '../src/data/defaults'
import { validateData } from '../src/data/validateData'
import { buildBackup, parseBackup } from '../src/data/backup'
import * as repo from '../src/data/repositories'
import { groupRevisions, nextMistakeDate, nextRevisionDate } from '../src/services/revisionSchedule'
import { validateMock, validateTask, validateSubject, checkMarks } from '../src/services/validators'
import { buildWeeklyReview } from '../src/services/weeklyReview'
import { overallTrend, subjectAverages } from '../src/services/mockStats'
import { DEFAULT_INTERVALS } from '../src/data/constants'

function memoryStorage() {
  const store = new Map()
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => void store.set(k, String(v)),
    removeItem: (k) => void store.delete(k),
  }
}

describe('dates', () => {
  it('validates real calendar days only', () => {
    expect(isValidDateStr('2026-02-28')).toBe(true)
    expect(isValidDateStr('2026-02-30')).toBe(false)
    expect(isValidDateStr('26-1-1')).toBe(false)
  })
  it('adds days across month ends and DST', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
    expect(addDays('2026-03-28', 3)).toBe('2026-03-31')
    expect(diffDays('2026-11-02', '2026-10-30')).toBe(3)
  })
  it('starts weeks on Monday', () => {
    expect(startOfWeek('2026-10-12')).toBe('2026-10-12') // Monday
    expect(startOfWeek('2026-10-18')).toBe('2026-10-12') // Sunday
    expect(toDateStr(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})

describe('revision schedule', () => {
  it('gives poor recall an earlier review than strong recall', () => {
    expect(nextRevisionDate('2026-10-12', 'poor', DEFAULT_INTERVALS)).toBe('2026-10-13')
    expect(nextRevisionDate('2026-10-12', 'strong', DEFAULT_INTERVALS)).toBe('2026-10-26')
  })
  it('uses custom intervals', () => {
    expect(nextRevisionDate('2026-10-12', 'good', { good: 10 })).toBe('2026-10-22')
  })
  it('puts revisions on the correct date bucket', () => {
    let d = createEmptyData()
    d = repo.addRevision(d, { topic: 'A', nextDate: '2026-10-10' })
    d = repo.addRevision(d, { topic: 'B', nextDate: '2026-10-12' })
    d = repo.addRevision(d, { topic: 'C', nextDate: '2026-10-13' })
    const g = groupRevisions(d.revisions, '2026-10-12')
    expect(g.overdue.map((r) => r.topic)).toEqual(['A'])
    expect(g.today.map((r) => r.topic)).toEqual(['B'])
    expect(g.upcoming.map((r) => r.topic)).toEqual(['C'])
  })
  it('keeps history when recording revisions', () => {
    let d = repo.addRevision(createEmptyData(), { topic: 'A', nextDate: '2026-10-12' })
    const id = d.revisions[0].id
    d = repo.recordRevision(d, id, { date: '2026-10-12', confidence: 2, recall: 'poor', notes: 'x' }, '2026-10-13')
    d = repo.recordRevision(d, id, { date: '2026-10-13', confidence: 4, recall: 'good', notes: '' }, '2026-10-20')
    expect(d.revisions[0].history).toHaveLength(2)
    expect(d.revisions[0].nextDate).toBe('2026-10-20')
  })
  it('schedules mistake retries by result', () => {
    expect(nextMistakeDate('2026-10-12', 'wrong', DEFAULT_INTERVALS)).toBe('2026-10-15')
    expect(nextMistakeDate('2026-10-12', 'correct', DEFAULT_INTERVALS)).toBe('2026-10-19')
  })
})

describe('validators', () => {
  it('rejects invalid mock scores', () => {
    expect(checkMarks(120, 100)).toMatch(/cannot be more/)
    expect(checkMarks(-1, 100)).toMatch(/negative/)
    expect(checkMarks(10, 0)).toMatch(/more than 0/)
    expect(checkMarks(NaN, 100)).toMatch(/numbers/)
    expect(checkMarks(null, 100)).toBeTruthy()
    expect(checkMarks(55.5, 100)).toBeNull()
  })
  it('validates a mock form incl. subject rows', () => {
    const base = { name: 'T1', date: '2026-10-10', durationMin: '180', breakdown: false, marksObtained: '50', maxMarks: '100', rows: [] }
    expect(validateMock(base)).toEqual({})
    expect(validateMock({ ...base, marksObtained: '101' }).marks).toBeTruthy()
    expect(validateMock({ ...base, name: ' ' }).name).toBeTruthy()
    expect(validateMock({ ...base, date: '2026-13-01' }).date).toBeTruthy()
    const rows = [{ subjectId: 's1', obtained: '30', max: '50' }, { subjectId: 's1', obtained: '10', max: '50' }]
    expect(validateMock({ ...base, breakdown: true, rows }).rowErrors[1]).toMatch(/only once/)
    expect(validateMock({ ...base, breakdown: true, rows: [] }).rows).toBeTruthy()
  })
  it('validates tasks and subjects', () => {
    expect(validateTask({ title: '', type: 'Lecture', date: '2026-10-12', plannedMin: '', actualMin: '' }).title).toBeTruthy()
    expect(validateTask({ title: 'x', type: 'Lecture', date: '2026-10-12', plannedMin: '-5', actualMin: '' }).plannedMin).toBeTruthy()
    expect(validateTask({ title: 'x', type: 'Nope', date: '2026-10-12', plannedMin: '', actualMin: '' }).type).toBeTruthy()
    const d = createStarterData()
    expect(validateSubject({ name: 'taxation' }, d).name).toMatch(/already exists/)
    expect(validateSubject({ name: 'New' }, d)).toEqual({})
  })
})

describe('data integrity', () => {
  it('archiving a subject keeps its records', () => {
    let d = createStarterData()
    const sid = d.subjects[0].id
    d = repo.addChapter(d, { subjectId: sid, name: 'Ch1', status: 'Learning', priority: 'High', lecturesPlanned: 2, questionsTarget: 0, questionsPracticed: 0 })
    const cid = d.chapters[0].id
    d = repo.addLecture(d, { subjectId: sid, chapterId: cid, title: 'L1', date: '2026-10-12', plannedMin: 60, watchedMin: 60, status: 'Watched', notesDone: true, questionsPracticed: 5, nextAction: '' })
    d = repo.addTask(d, { title: 'T', type: 'Lecture', subjectId: sid, chapterId: cid, date: '2026-10-12', plannedMin: 30, actualMin: null })
    const archived = repo.setSubjectArchived(d, sid, true)
    expect(archived.subjects.find((s) => s.id === sid).archived).toBe(true)
    expect(archived.chapters).toHaveLength(1)
    expect(archived.lectures).toHaveLength(1)
    expect(archived.tasks).toHaveLength(1)
    expect(validateData(archived)).toEqual([])
  })
  it('watching all lectures does not complete a chapter', () => {
    let d = createStarterData()
    const sid = d.subjects[0].id
    d = repo.addChapter(d, { subjectId: sid, name: 'Ch1', status: 'Learning', priority: 'High', lecturesPlanned: 1, questionsTarget: 0, questionsPracticed: 0 })
    d = repo.addLecture(d, { subjectId: sid, chapterId: d.chapters[0].id, title: 'L1', date: '2026-10-12', plannedMin: 60, watchedMin: 60, status: 'Watched', notesDone: true, questionsPracticed: 0, nextAction: '' })
    expect(d.chapters[0].status).toBe('Learning')
  })
  it('reorders and renumbers subjects', () => {
    let d = createStarterData()
    const [a, b] = d.subjects
    d = repo.moveSubject(d, b.id, -1)
    const ordered = [...d.subjects].sort((x, y) => x.order - y.order)
    expect(ordered[0].id).toBe(b.id)
    expect(ordered[1].id).toBe(a.id)
  })
  it('completing and reopening tasks', () => {
    let d = repo.addTask(createEmptyData(), { title: 'T', type: 'Review', subjectId: '', chapterId: '', date: '2026-10-12', plannedMin: 30, actualMin: null })
    const id = d.tasks[0].id
    d = repo.completeTask(d, id, 45, '2026-10-12')
    expect(d.tasks[0]).toMatchObject({ done: true, actualMin: 45, doneOn: '2026-10-12', subjectId: null })
    d = repo.reopenTask(d, id)
    expect(d.tasks[0].done).toBe(false)
  })
})

describe('backup import', () => {
  const sample = () => {
    let d = createStarterData()
    d = repo.addMock(d, { name: 'M1', date: '2026-10-10', durationMin: 180, scores: [], marksObtained: 40, maxMarks: 100, notes: '', improveTopics: '' })
    return d
  }
  it('round-trips an export', () => {
    const d = sample()
    const parsed = parseBackup(JSON.stringify(buildBackup(d)))
    expect(parsed.errors).toBeUndefined()
    expect(parsed.data.mockTests).toHaveLength(1)
    expect(parsed.data.subjects).toHaveLength(6)
  })
  it('rejects malformed input without throwing', () => {
    expect(parseBackup('not json').errors).toBeTruthy()
    expect(parseBackup('{}').errors).toBeTruthy()
    expect(parseBackup(JSON.stringify({ app: 'ca-companion', data: { schemaVersion: 1 } })).errors).toBeTruthy()
    expect(parseBackup(JSON.stringify({ app: 'other', data: {} })).errors).toBeTruthy()
    const future = buildBackup(sample())
    future.data.schemaVersion = 99
    expect(parseBackup(JSON.stringify(future)).errors[0]).toMatch(/newer version/)
  })
  it('rejects broken references and invalid marks', () => {
    const broken = sample()
    broken.chapters.push({ id: 'c1', subjectId: 'ghost', name: 'X', status: 'Learning', priority: 'High' })
    expect(validateData(broken).join(' ')).toMatch(/subject that does not exist/)
    const badMarks = sample()
    badMarks.mockTests[0].marksObtained = 500
    expect(validateData(badMarks).join(' ')).toMatch(/invalid marks/)
    const dup = sample()
    dup.subjects.push({ ...dup.subjects[0] })
    expect(validateData(dup).join(' ')).toMatch(/duplicate id/)
  })
})

describe('storage', () => {
  beforeEach(() => {
    globalThis.localStorage = memoryStorage()
  })
  it('starts with starter data when nothing is saved', async () => {
    const { loadInitial } = await import('../src/data/storage')
    const r = loadInitial()
    expect(r.warning).toBeNull()
    expect(r.data.subjects).toHaveLength(6)
  })
  it('saves and reloads data (refresh persistence)', async () => {
    const { loadInitial, saveData } = await import('../src/data/storage')
    const d = repo.addTask(createStarterData(), { title: 'Persist me', type: 'Review', subjectId: '', chapterId: '', date: '2026-10-12', plannedMin: null, actualMin: null })
    expect(saveData(d).ok).toBe(true)
    expect(loadInitial().data.tasks[0].title).toBe('Persist me')
  })
  it('keeps a copy of unreadable data instead of silently losing it', async () => {
    const { loadInitial } = await import('../src/data/storage')
    const { CORRUPT_KEY, STORAGE_KEY } = await import('../src/data/constants')
    localStorage.setItem(STORAGE_KEY, '{broken')
    const r = loadInitial()
    expect(r.warning).toMatch(/could not be read/)
    expect(localStorage.getItem(CORRUPT_KEY)).toBe('{broken')
  })
  it('reports a clear error when storage is full', async () => {
    const { saveData } = await import('../src/data/storage')
    globalThis.localStorage = { getItem: () => null, setItem: () => { throw new Error('quota') } }
    const r = saveData(createEmptyData())
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/Export a backup/)
  })
})

describe('weekly review', () => {
  it('derives numbers and priorities only from records', () => {
    let d = createStarterData()
    const sid = d.subjects[0].id
    d = repo.addChapter(d, { subjectId: sid, name: 'Ch1', status: 'Not Started', priority: 'High', lecturesPlanned: 0, questionsTarget: 0, questionsPracticed: 0 })
    const cid = d.chapters[0].id
    d = repo.addTask(d, { title: 'Done task', type: 'Lecture', subjectId: sid, chapterId: cid, date: '2026-10-13', plannedMin: 60, actualMin: null })
    d = repo.completeTask(d, d.tasks[0].id, 50, '2026-10-13')
    d = repo.addTask(d, { title: 'Pending', type: 'Review', subjectId: '', chapterId: '', date: '2026-10-14', plannedMin: 30, actualMin: null })
    d = repo.addRevision(d, { topic: 'Late one', chapterId: cid, subjectId: sid, nextDate: '2026-10-10' })
    d = repo.addMistake(d, { subjectId: sid, chapterId: cid, reference: 'Q1', category: 'Concept gap', whatWentWrong: 'a', correctApproach: 'b', recordedOn: '2026-10-11', nextPracticeDate: '2026-10-12' })
    d = repo.addMistake(d, { subjectId: sid, chapterId: cid, reference: 'Q2', category: 'Concept gap', whatWentWrong: 'a', correctApproach: 'b', recordedOn: '2026-10-11', nextPracticeDate: '2026-10-20' })
    const r = buildWeeklyReview(d, '2026-10-12', '2026-10-15')
    expect(r.tasksPlanned).toBe(2)
    expect(r.tasksDone).toBe(1)
    expect(r.taskMinutes).toBe(50)
    expect(r.overdueRevisions).toHaveLength(1)
    expect(r.recurringChapters[0]).toEqual({ chapterId: cid, count: 2 })
    expect(r.recurringCategories[0]).toEqual({ category: 'Concept gap', count: 2 })
    expect(r.priorities).toHaveLength(3)
    expect(r.priorities[0].key).toBe('overdue-revisions')
    expect(r.priorities.every((p) => p.because.length > 0)).toBe(true)
  })
  it('does not fabricate priorities for empty data', () => {
    const r = buildWeeklyReview(createEmptyData(), '2026-10-12', '2026-10-15')
    expect(r.tasksPlanned).toBe(0)
    expect(r.priorities.map((p) => p.key)).toEqual(['plan-next-week'])
    expect(r.trend).toBeNull()
  })
})

describe('mock stats', () => {
  const mk = (date, o, m, scores = []) => ({ id: date, date, marksObtained: o, maxMarks: m, scores, name: date, createdAt: date })
  it('needs 3 tests for a trend', () => {
    expect(overallTrend([mk('2026-01-01', 50, 100), mk('2026-02-01', 60, 100)])).toBeNull()
    const t = overallTrend([mk('2026-01-01', 50, 100), mk('2026-02-01', 60, 100), mk('2026-03-01', 70, 100)])
    expect(t).toMatchObject({ latest: 70, earlierAvg: 55, direction: 'up' })
  })
  it('averages per subject', () => {
    const a = subjectAverages([mk('1', 80, 100, [{ subjectId: 'x', obtained: 30, max: 50 }, { subjectId: 'y', obtained: 20, max: 50 }])])
    expect(a[0]).toMatchObject({ subjectId: 'y', average: 40 })
  })
})
