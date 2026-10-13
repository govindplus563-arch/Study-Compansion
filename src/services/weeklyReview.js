import { addDays } from '../utils/dates'
import { sum } from '../utils/numbers'
import { groupRevisions } from './revisionSchedule'
import { chapterName, findById, subjectName } from './lookup'
import { overallTrend, subjectAverages } from './mockStats'

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

// Everything here is derived from saved records. Each priority says which records it came from.
export function buildWeeklyReview(data, weekStart, todayStr) {
  const weekEnd = addDays(weekStart, 6)
  const inWeek = (d) => d >= weekStart && d <= weekEnd

  const weekTasks = data.tasks.filter((t) => inWeek(t.date))
  const doneTasks = weekTasks.filter((t) => t.done)
  const lectures = data.lectures.filter((l) => inWeek(l.date))
  const revisionsDone = data.revisions.flatMap((r) => r.history.filter((h) => inWeek(h.date)).map((h) => ({ ...h, revision: r })))

  const activeRevisions = data.revisions.filter((r) => !r.archived)
  const groups = groupRevisions(activeRevisions, todayStr)
  const outstanding = [...groups.overdue, ...groups.today]

  const unresolved = data.mistakes.filter((m) => !m.resolved)
  const mistakesDue = unresolved.filter((m) => m.nextPracticeDate && m.nextPracticeDate <= todayStr)

  const byChapter = new Map()
  const byCategory = new Map()
  for (const m of unresolved) {
    if (m.chapterId) byChapter.set(m.chapterId, (byChapter.get(m.chapterId) || 0) + 1)
    byCategory.set(m.category, (byCategory.get(m.category) || 0) + 1)
  }
  const recurringChapters = [...byChapter.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).map(([chapterId, count]) => ({ chapterId, count }))
  const recurringCategories = [...byCategory.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).map(([category, count]) => ({ category, count }))

  const trend = overallTrend(data.mockTests)
  const averages = subjectAverages(data.mockTests)

  const metrics = {
    weekStart,
    weekEnd,
    tasksPlanned: weekTasks.length,
    tasksDone: doneTasks.length,
    plannedMinutes: sum(weekTasks, (t) => t.plannedMin),
    taskMinutes: sum(doneTasks, (t) => t.actualMin),
    lectureCount: lectures.length,
    lecturesWatched: lectures.filter((l) => l.status === 'Watched').length,
    lectureMinutes: sum(lectures, (l) => l.watchedMin),
    questionsPracticed: sum(lectures, (l) => l.questionsPracticed),
    revisionsDone: revisionsDone.length,
    outstandingRevisions: outstanding,
    overdueRevisions: groups.overdue,
    recurringChapters,
    recurringCategories,
    mistakesDue,
    trend,
    subjectAverages: averages,
  }

  return { ...metrics, priorities: buildPriorities(data, metrics, todayStr) }
}

function buildPriorities(data, m, todayStr) {
  const out = []
  const names = (items, pick, limit = 3) => {
    const list = items.slice(0, limit).map(pick)
    return list.join(', ') + (items.length > limit ? ` and ${items.length - limit} more` : '')
  }
  const revLabel = (r) => r.topic || chapterName(data, r.chapterId)

  if (m.overdueRevisions.length) {
    out.push({
      key: 'overdue-revisions',
      title: `Clear ${plural(m.overdueRevisions.length, 'overdue revision')}`,
      because: `These are past their next review date: ${names(m.overdueRevisions, revLabel)}.`,
      to: '/revisions',
    })
  }
  if (m.mistakesDue.length) {
    out.push({
      key: 'mistakes-due',
      title: `Re-attempt ${plural(m.mistakesDue.length, 'mistake')} that ${m.mistakesDue.length === 1 ? 'is' : 'are'} due`,
      because: `Their next practice date has arrived: ${names(m.mistakesDue, (x) => x.reference)}.`,
      to: '/mistakes',
    })
  }
  if (m.recurringChapters.length) {
    const top = m.recurringChapters[0]
    out.push({
      key: 'recurring-mistakes',
      title: `Fix recurring mistakes in ${chapterName(data, top.chapterId)}`,
      because: `${plural(top.count, 'unresolved mistake')} are logged for this chapter.`,
      to: '/mistakes',
    })
  }
  const lateTasks = data.tasks.filter((t) => !t.done && t.date < todayStr)
  if (lateTasks.length) {
    out.push({
      key: 'late-tasks',
      title: `Finish or reschedule ${plural(lateTasks.length, 'overdue task')}`,
      because: `These tasks are past their date and not completed: ${names(lateTasks, (t) => t.title)}.`,
      to: '/tasks',
    })
  }
  if (m.subjectAverages.length >= 2) {
    const weakest = m.subjectAverages[0]
    out.push({
      key: 'weak-subject',
      title: `Strengthen ${subjectName(data, weakest.subjectId)}`,
      because: `It has the lowest average (${weakest.average}%) across ${plural(weakest.tests, 'mock test')} that include subject-wise marks.`,
      to: '/mock-tests',
    })
  }
  const notStarted = data.chapters.filter((c) => !c.archived && c.priority === 'High' && c.status === 'Not Started')
  if (notStarted.length) {
    const c = notStarted[0]
    out.push({
      key: 'high-priority-not-started',
      title: `Start ${c.name}`,
      because: `${plural(notStarted.length, 'high-priority chapter')} still marked Not Started${findById(data.subjects, c.subjectId) ? ` (first: ${subjectName(data, c.subjectId)})` : ''}.`,
      to: '/subjects',
    })
  }
  const nextWeekStart = addDays(m.weekStart, 7)
  const nextWeekEnd = addDays(m.weekStart, 13)
  if (!data.tasks.some((t) => t.date >= nextWeekStart && t.date <= nextWeekEnd && !t.done)) {
    out.push({
      key: 'plan-next-week',
      title: 'Plan tasks for next week',
      because: 'No pending tasks are scheduled for next week yet.',
      to: '/tasks',
    })
  }
  return out.slice(0, 3)
}
