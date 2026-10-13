import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { useStore } from '../data/store'
import { buildWeeklyReview } from '../services/weeklyReview'
import { chapterName } from '../services/lookup'
import { MIN_TESTS_FOR_TREND } from '../services/mockStats'
import { addDays, formatDate, formatMinutes, startOfWeek, today } from '../utils/dates'

function Stat({ value, label }) {
  return (
    <div className="stat">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  )
}

export default function WeeklyReview() {
  const { data } = useStore()
  const t0 = today()
  const thisWeek = startOfWeek(t0)
  const [weekStart, setWeekStart] = useState(thisWeek)
  const r = useMemo(() => buildWeeklyReview(data, weekStart, t0), [data, weekStart, t0])
  const noData = data.tasks.length + data.lectures.length + data.revisions.length + data.mistakes.length + data.mockTests.length === 0

  return (
    <>
      <PageHeader
        title="Weekly Review"
        subtitle={`${formatDate(r.weekStart)} – ${formatDate(r.weekEnd)}${weekStart === thisWeek ? ' (this week)' : ''}`}
        actions={
          <>
            <button type="button" className="btn" onClick={() => setWeekStart(addDays(weekStart, -7))}>← Previous week</button>
            <button type="button" className="btn" disabled={weekStart === thisWeek} onClick={() => setWeekStart(thisWeek)}>This week</button>
            <button type="button" className="btn" onClick={() => setWeekStart(addDays(weekStart, 7))}>Next week →</button>
          </>
        }
      />
      {noData && <p className="banner banner-info">Nothing to review yet. Add tasks, lectures, revisions or mock tests and this page will summarise them.</p>}

      <section className="card" aria-label="Recommended priorities">
        <h2>Three priorities for next week</h2>
        <p className="muted small">Chosen by simple rules from your saved records. Each one says why.</p>
        {r.priorities.length === 0 ? (
          <p className="muted">Not enough records yet to suggest priorities.</p>
        ) : (
          <ol className="stack" style={{ paddingLeft: 20 }}>
            {r.priorities.map((p) => (
              <li key={p.key}>
                <strong>{p.title}</strong>
                <div className="muted small">{p.because}</div>
                <Link to={p.to} className="small">Go there</Link>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="section" aria-label="Week numbers">
        <h2>This week in numbers</h2>
        <div className="stat-grid">
          <Stat value={`${r.tasksDone} / ${r.tasksPlanned}`} label="Tasks completed / planned" />
          <Stat value={formatMinutes(r.taskMinutes)} label={`Time logged on tasks (planned ${formatMinutes(r.plannedMinutes)})`} />
          <Stat value={`${r.lecturesWatched} / ${r.lectureCount}`} label="Lectures watched / recorded" />
          <Stat value={formatMinutes(r.lectureMinutes)} label="Lecture time watched" />
          <Stat value={r.questionsPracticed} label="Questions practised (from lecture records)" />
          <Stat value={r.revisionsDone} label="Revisions completed" />
          <Stat value={r.outstandingRevisions.length} label="Revisions outstanding now" />
          <Stat value={r.mistakesDue.length} label="Mistakes due for retry now" />
        </div>
        <p className="muted small">Task time and lecture time can overlap if you log the same lecture as both a task and a lecture record.</p>
      </section>

      <div className="cards section">
        <section className="card" aria-label="Recurring mistakes">
          <h2>Recurring mistakes</h2>
          {r.recurringChapters.length === 0 && r.recurringCategories.length === 0 ? (
            <p className="muted">No pattern yet. A pattern appears when 2 or more unresolved mistakes share a chapter or category.</p>
          ) : (
            <>
              {r.recurringChapters.length > 0 && (
                <>
                  <h3>By chapter</h3>
                  <ul className="list">
                    {r.recurringChapters.slice(0, 5).map((c) => (
                      <li key={c.chapterId}>{chapterName(data, c.chapterId)}: {c.count} unresolved</li>
                    ))}
                  </ul>
                </>
              )}
              {r.recurringCategories.length > 0 && (
                <>
                  <h3 style={{ marginTop: 12 }}>By category</h3>
                  <ul className="list">
                    {r.recurringCategories.slice(0, 5).map((c) => (
                      <li key={c.category}>{c.category}: {c.count} unresolved</li>
                    ))}
                  </ul>
                </>
              )}
            </>
          )}
        </section>

        <section className="card" aria-label="Mock test trend">
          <h2>Mock-test trend</h2>
          {r.trend ? (
            <p>
              Latest {r.trend.latest}% vs earlier average {r.trend.earlierAvg}% ({r.trend.direction === 'flat' ? 'no change' : `${Math.abs(r.trend.diff)} points ${r.trend.direction === 'up' ? 'up' : 'down'}`}).
            </p>
          ) : (
            <p className="muted">Needs at least {MIN_TESTS_FOR_TREND} recorded mock tests (you have {data.mockTests.length}).</p>
          )}
        </section>
      </div>
    </>
  )
}
