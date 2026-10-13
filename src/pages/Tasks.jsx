import { useMemo, useState } from 'react'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import { Field } from '../components/Field'
import { useStore } from '../data/store'
import { activeSubjects } from '../services/lookup'
import TaskForm from '../features/tasks/TaskForm'
import TaskList from '../features/tasks/TaskList'
import { addDays, today } from '../utils/dates'

export default function Tasks() {
  const { data } = useStore()
  const [adding, setAdding] = useState(false)
  const [subject, setSubject] = useState('')
  const [status, setStatus] = useState('pending')
  const [when, setWhen] = useState('all')
  const [pickedDate, setPickedDate] = useState(today())

  const filtered = useMemo(() => {
    const t0 = today()
    return data.tasks
      .filter((t) => !subject || t.subjectId === subject)
      .filter((t) => (status === 'all' ? true : status === 'done' ? t.done : status === 'pending' ? !t.done : !t.done && t.date < t0))
      .filter((t) => {
        if (when === 'today') return t.date === t0
        if (when === 'week') return t.date >= t0 && t.date <= addDays(t0, 6)
        if (when === 'pick') return t.date === pickedDate
        return true
      })
      .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt))
  }, [data.tasks, subject, status, when, pickedDate])

  return (
    <>
      <PageHeader
        title="Study Tasks"
        subtitle="Plan what to study and record how long it really took."
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setAdding(true)}>
            + Add task
          </button>
        }
      />
      {data.tasks.length === 0 ? (
        <EmptyState
          title="No tasks yet"
          action={
            <button type="button" className="btn btn-primary" onClick={() => setAdding(true)}>
              Add your first task
            </button>
          }
        >
          Tasks are the things you plan to do each day: a lecture, a revision, a set of questions or a mock test.
        </EmptyState>
      ) : (
        <>
          <div className="toolbar">
            <Field label="Subject">
              <select value={subject} onChange={(e) => setSubject(e.target.value)}>
                <option value="">All subjects</option>
                {activeSubjects(data).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="pending">Pending</option>
                <option value="overdue">Overdue</option>
                <option value="done">Completed</option>
                <option value="all">All</option>
              </select>
            </Field>
            <Field label="Date">
              <select value={when} onChange={(e) => setWhen(e.target.value)}>
                <option value="all">Any date</option>
                <option value="today">Today</option>
                <option value="week">Next 7 days</option>
                <option value="pick">Pick a date…</option>
              </select>
            </Field>
            {when === 'pick' && (
              <Field label="Day">
                <input type="date" value={pickedDate} onChange={(e) => setPickedDate(e.target.value)} />
              </Field>
            )}
          </div>
          <TaskList tasks={filtered} emptyText="No tasks match these filters." />
        </>
      )}
      {adding && <TaskForm onClose={() => setAdding(false)} />}
    </>
  )
}
