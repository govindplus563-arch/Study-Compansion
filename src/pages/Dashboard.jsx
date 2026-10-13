import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import { useStore } from '../data/store'
import { groupRevisions } from '../services/revisionSchedule'
import { buildWeeklyReview } from '../services/weeklyReview'
import { addDays, diffDays, formatDate, formatMinutes, formatShortDate, startOfWeek, today } from '../utils/dates'
import { sum } from '../utils/numbers'
import TaskForm from '../features/tasks/TaskForm'
import TaskList from '../features/tasks/TaskList'

function Stat({ value, label }) {
  return (
    <div className="stat">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  )
}

export default function Dashboard() {
  const { data } = useStore()
  const [adding, setAdding] = useState(false)
  const t0 = today()

  const view = useMemo(() => {
    const todays = data.tasks.filter((t) => t.date === t0).sort((a, b) => Number(a.done) - Number(b.done) || a.createdAt.localeCompare(b.createdAt))
    const overdue = data.tasks.filter((t) => !t.done && t.date < t0).sort((a, b) => a.date.localeCompare(b.date))
    const upcoming = data.tasks.filter((t) => !t.done && t.date > t0 && t.date <= addDays(t0, 7)).sort((a, b) => a.date.localeCompare(b.date))
    const revs = groupRevisions(data.revisions.filter((r) => !r.archived), t0)
    const week = buildWeeklyReview(data, startOfWeek(t0), t0)
    const mistakesDue = data.mistakes.filter((m) => !m.resolved && m.nextPracticeDate && m.nextPracticeDate <= t0).length
    return { todays, overdue, upcoming, revs, week, mistakesDue }
  }, [data, t0])

  const { settings } = data
  const doneToday = view.todays.filter((t) => t.done)
  const loggedMinutes = sum(doneToday, (t) => t.actualMin)
  const plannedToday = sum(view.todays, (t) => t.plannedMin)
  const daysToExam = settings.examAttempt.examDate ? diffDays(settings.examAttempt.examDate, t0) : null
  const lastExport = settings.lastExportedAt
  const exportAge = lastExport ? diffDays(t0, lastExport.slice(0, 10)) : null
  const hasAnyData = data.tasks.length + data.chapters.length + data.revisions.length + data.mistakes.length + data.mockTests.length > 0

  return (
    <>
      <PageHeader
        title="Today"
        subtitle={`${formatDate(t0)}${settings.examAttempt.label ? ` · Attempt: ${settings.examAttempt.label}` : ''}${daysToExam !== null && daysToExam >= 0 ? ` · ${daysToExam} days to exam start` : ''}`}
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setAdding(true)}>
            + Add task
          </button>
        }
      />

      {hasAnyData && (lastExport === null || exportAge >= 7) && (
        <div className="banner banner-warn" role="note">
          <span>{lastExport === null ? 'You have not exported a backup yet.' : `Your last backup was ${exportAge} days ago.`} Your data lives only in this browser.</span>
          <Link className="btn btn-sm" to="/settings">Back up now</Link>
        </div>
      )}

      {!hasAnyData && (
        <EmptyState
          title="Welcome to CA Companion"
          action={
            <div className="row" style={{ justifyContent: 'center' }}>
              <Link className="btn btn-primary" to="/subjects">Set up chapters</Link>
              <button type="button" className="btn" onClick={() => setAdding(true)}>Add your first task</button>
            </div>
          }
        >
          Start by adding chapters to your subjects, then plan today&apos;s study tasks. Everything on this page is calculated from what you enter.
        </EmptyState>
      )}

      {hasAnyData && (
        <>
          <section className="card" aria-label="Today progress">
            <div className="stat-grid">
              <Stat value={`${doneToday.length} / ${view.todays.length}`} label="Today's tasks completed" />
              <Stat value={formatMinutes(loggedMinutes)} label={`Time logged (target ${formatMinutes(settings.dailyTargetMinutes)})`} />
              <Stat value={formatMinutes(plannedToday)} label="Time planned today" />
              <Stat value={view.revs.overdue.length + view.revs.today.length} label="Revisions due" />
            </div>
          </section>

          <div className="cards section">
            <section className="card" aria-label="Today's tasks">
              <h2>Today&apos;s tasks</h2>
              <TaskList tasks={view.todays} showDate={false} emptyText="Nothing planned for today. Add a task to get started." />
            </section>

            <section className="card" aria-label="Revisions">
              <h2>Revisions</h2>
              {view.revs.overdue.length + view.revs.today.length === 0 ? (
                <p className="muted">{data.revisions.length === 0 ? 'No revision items yet.' : 'No revisions due today.'}</p>
              ) : (
                <ul className="list">
                  {[...view.revs.overdue, ...view.revs.today].slice(0, 6).map((r) => (
                    <li key={r.id} className="item row-between">
                      <span className="item-title">{r.topic}</span>
                      <span className={`badge ${r.nextDate < t0 ? 'badge-danger' : 'badge-warn'}`}>{r.nextDate < t0 ? `Overdue · ${formatShortDate(r.nextDate)}` : 'Due today'}</span>
                    </li>
                  ))}
                </ul>
              )}
              <p style={{ marginTop: 12 }}>
                <Link to="/revisions">Open revisions</Link>
                {view.mistakesDue > 0 && (
                  <>
                    {' · '}
                    <Link to="/mistakes">{view.mistakesDue} mistake(s) due for retry</Link>
                  </>
                )}
              </p>
            </section>
          </div>

          {view.overdue.length > 0 && (
            <section className="card section" aria-label="Overdue tasks">
              <h2>Overdue tasks <span className="badge badge-danger">{view.overdue.length}</span></h2>
              <TaskList tasks={view.overdue} />
            </section>
          )}

          <div className="cards section">
            <section className="card" aria-label="Upcoming">
              <h2>Next 7 days</h2>
              <TaskList tasks={view.upcoming} emptyText="No tasks scheduled for the next 7 days." />
              {view.revs.upcoming.length > 0 && (
                <>
                  <h3 style={{ marginTop: 16 }}>Upcoming revisions</h3>
                  <ul className="list">
                    {view.revs.upcoming.slice(0, 5).map((r) => (
                      <li key={r.id} className="small">{formatShortDate(r.nextDate)} · {r.topic}</li>
                    ))}
                  </ul>
                </>
              )}
            </section>

            <section className="card" aria-label="Weekly summary">
              <h2>This week so far</h2>
              <ul className="list">
                <li>Tasks completed: <strong>{view.week.tasksDone}</strong> of {view.week.tasksPlanned} planned</li>
                <li>Time logged on tasks: <strong>{formatMinutes(view.week.taskMinutes)}</strong></li>
                <li>Lectures watched: <strong>{view.week.lecturesWatched}</strong></li>
                <li>Revisions completed: <strong>{view.week.revisionsDone}</strong></li>
              </ul>
              <p style={{ marginTop: 12 }}><Link to="/weekly-review">Open the weekly review</Link></p>
            </section>
          </div>
        </>
      )}

      {adding && <TaskForm onClose={() => setAdding(false)} />}
    </>
  )
}
