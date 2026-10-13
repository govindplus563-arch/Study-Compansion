import { useState } from 'react'
import Modal from '../../components/Modal'
import ConfirmDialog from '../../components/ConfirmDialog'
import { Field, FormActions } from '../../components/Field'
import { useStore } from '../../data/store'
import { completeTask, deleteTask, reopenTask, rescheduleTask } from '../../data/repositories'
import { contextLabel } from '../../services/lookup'
import { formatMinutes, formatShortDate, isValidDateStr, today } from '../../utils/dates'
import { isNonNegInt, toNum } from '../../utils/numbers'
import TaskForm from './TaskForm'

function CompleteModal({ task, onClose }) {
  const { update, notify } = useStore()
  const [minutes, setMinutes] = useState(task.actualMin ?? task.plannedMin ?? '')
  const [error, setError] = useState('')
  function submit(e) {
    e.preventDefault()
    const n = toNum(minutes)
    if (n !== null && !(isNonNegInt(n) && n <= 1440)) return setError('Enter whole minutes (0–1440), or leave it empty.')
    update((d) => completeTask(d, task.id, n, today()))
    notify('Task completed.')
    onClose()
  }
  return (
    <Modal title="Complete task" onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <p>{task.title}</p>
        <Field label="Actual minutes spent" error={error} hint={task.plannedMin ? `Planned: ${formatMinutes(task.plannedMin)}. Change it if it took a different time.` : 'Optional.'}>
          <input type="number" inputMode="numeric" min="0" value={minutes} onChange={(e) => setMinutes(e.target.value)} autoFocus />
        </Field>
        <FormActions onCancel={onClose} submitLabel="Mark complete" />
      </form>
    </Modal>
  )
}

function RescheduleModal({ task, onClose }) {
  const { update, notify } = useStore()
  const [date, setDate] = useState(task.date < today() ? today() : task.date)
  const [error, setError] = useState('')
  function submit(e) {
    e.preventDefault()
    if (!isValidDateStr(date)) return setError('Choose a valid date.')
    update((d) => rescheduleTask(d, task.id, date))
    notify('Task rescheduled.')
    onClose()
  }
  return (
    <Modal title="Reschedule task" onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <p>{task.title}</p>
        <Field label="New date" error={error}>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} autoFocus />
        </Field>
        <FormActions onCancel={onClose} submitLabel="Reschedule" />
      </form>
    </Modal>
  )
}

// Shows tasks with all their actions. Used on the Dashboard and the Study Tasks page.
export default function TaskList({ tasks, showDate = true, emptyText = 'No tasks to show.' }) {
  const { data, update, notify } = useStore()
  const [modal, setModal] = useState(null) // { kind, task }
  const close = () => setModal(null)
  const t0 = today()

  if (tasks.length === 0) return <p className="muted">{emptyText}</p>

  return (
    <>
      <ul className="list">
        {tasks.map((t) => {
          const late = !t.done && t.date < t0
          const context = contextLabel(data, t)
          return (
            <li key={t.id} className={`item${t.done ? ' item-done' : ''}`}>
              <div className="task-main">
                <input
                  type="checkbox"
                  checked={t.done}
                  aria-label={t.done ? `Mark "${t.title}" as not done` : `Complete "${t.title}"`}
                  onChange={() => (t.done ? update((d) => reopenTask(d, t.id)) : setModal({ kind: 'complete', task: t }))}
                />
                <div className="stack" style={{ gap: 4, flex: 1, minWidth: 0 }}>
                  <span className="item-title">{t.title}</span>
                  <span className="item-meta">
                    <span className="badge badge-primary">{t.type}</span>
                    {context && <span>{context}</span>}
                    {showDate && <span>{formatShortDate(t.date)}</span>}
                    {late && <span className="badge badge-danger">Overdue</span>}
                    {t.plannedMin != null && <span>Planned {formatMinutes(t.plannedMin)}</span>}
                    {t.actualMin != null && <span>Actual {formatMinutes(t.actualMin)}</span>}
                  </span>
                </div>
              </div>
              <div className="item-actions">
                <button type="button" className="btn btn-sm" onClick={() => setModal({ kind: 'edit', task: t })}>
                  Edit
                </button>
                {!t.done && (
                  <button type="button" className="btn btn-sm" onClick={() => setModal({ kind: 'reschedule', task: t })}>
                    Reschedule
                  </button>
                )}
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => setModal({ kind: 'delete', task: t })}>
                  Delete
                </button>
              </div>
            </li>
          )
        })}
      </ul>
      {modal?.kind === 'complete' && <CompleteModal task={modal.task} onClose={close} />}
      {modal?.kind === 'reschedule' && <RescheduleModal task={modal.task} onClose={close} />}
      {modal?.kind === 'edit' && <TaskForm task={modal.task} onClose={close} />}
      {modal?.kind === 'delete' && (
        <ConfirmDialog
          title="Delete task?"
          message={`"${modal.task.title}" will be permanently removed. This cannot be undone.`}
          confirmLabel="Delete"
          danger
          onCancel={close}
          onConfirm={() => {
            update((d) => deleteTask(d, modal.task.id))
            notify('Task deleted.')
            close()
          }}
        />
      )}
    </>
  )
}
