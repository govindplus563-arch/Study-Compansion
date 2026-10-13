import { useMemo, useState } from 'react'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import ConfirmDialog from '../components/ConfirmDialog'
import { Field } from '../components/Field'
import { useStore } from '../data/store'
import { deleteMistake, setMistakeResolved } from '../data/repositories'
import { activeSubjects, contextLabel } from '../services/lookup'
import { formatDate, today } from '../utils/dates'
import MistakeForm from '../features/mistakes/MistakeForm'
import AttemptModal from '../features/mistakes/AttemptModal'

export default function Mistakes() {
  const { data, update, notify } = useStore()
  const [view, setView] = useState('unresolved')
  const [subject, setSubject] = useState('')
  const [modal, setModal] = useState(null)
  const close = () => setModal(null)
  const t0 = today()

  const unresolved = data.mistakes.filter((m) => !m.resolved)
  const due = unresolved.filter((m) => m.nextPracticeDate && m.nextPracticeDate <= t0)

  const shown = useMemo(() => {
    return data.mistakes
      .filter((m) => !subject || m.subjectId === subject)
      .filter((m) => (view === 'all' ? true : view === 'resolved' ? m.resolved : view === 'due' ? !m.resolved && m.nextPracticeDate && m.nextPracticeDate <= t0 : !m.resolved))
      .sort((a, b) => (a.nextPracticeDate || '9999').localeCompare(b.nextPracticeDate || '9999'))
  }, [data.mistakes, view, subject, t0])

  return (
    <>
      <PageHeader
        title="Mistake Log"
        subtitle="Write down what went wrong, the correct approach, and when to try again."
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setModal({ kind: 'add' })}>
            + Log mistake
          </button>
        }
      />
      {data.mistakes.length === 0 ? (
        <EmptyState title="No mistakes logged" action={<button type="button" className="btn btn-primary" onClick={() => setModal({ kind: 'add' })}>Log your first mistake</button>}>
          After a practice session or mock test, record the questions you got wrong and why. Patterns show up in your Weekly Review.
        </EmptyState>
      ) : (
        <>
          <div className="stat-grid" style={{ marginBottom: 16 }}>
            <div className="stat"><div className="stat-value">{unresolved.length}</div><div className="stat-label">Unresolved</div></div>
            <div className="stat"><div className="stat-value">{due.length}</div><div className="stat-label">Due for another attempt</div></div>
            <div className="stat"><div className="stat-value">{data.mistakes.length - unresolved.length}</div><div className="stat-label">Resolved</div></div>
          </div>
          <div className="toolbar">
            <Field label="Show">
              <select value={view} onChange={(e) => setView(e.target.value)}>
                <option value="unresolved">Unresolved</option>
                <option value="due">Due for another attempt</option>
                <option value="resolved">Resolved</option>
                <option value="all">All</option>
              </select>
            </Field>
            <Field label="Subject">
              <select value={subject} onChange={(e) => setSubject(e.target.value)}>
                <option value="">All subjects</option>
                {activeSubjects(data).map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </Field>
          </div>
          {shown.length === 0 ? (
            <p className="muted">No mistakes match this view.</p>
          ) : (
            <ul className="list">
              {shown.map((m) => {
                const isDue = !m.resolved && m.nextPracticeDate && m.nextPracticeDate <= t0
                const context = contextLabel(data, m)
                return (
                  <li key={m.id} className="item">
                    <div className="row-between">
                      <span className="item-title">{m.reference}</span>
                      <span className="row">
                        <span className="badge badge-primary">{m.category}</span>
                        {m.resolved ? <span className="badge badge-success">Resolved</span> : isDue ? <span className="badge badge-danger">Due to retry</span> : null}
                      </span>
                    </div>
                    <div className="item-meta">
                      {context && <span>{context}</span>}
                      <span>Recorded {formatDate(m.recordedOn)}</span>
                      {!m.resolved && m.nextPracticeDate && <span>Retry on {formatDate(m.nextPracticeDate)}</span>}
                      <span>{m.attempts.length} re-attempt(s)</span>
                    </div>
                    <div className="small"><strong>What went wrong:</strong> {m.whatWentWrong}</div>
                    <div className="small"><strong>Correct approach:</strong> {m.correctApproach}</div>
                    {m.attempts.length > 0 && (
                      <details>
                        <summary>Attempt history</summary>
                        <ul className="list" style={{ marginTop: 8 }}>
                          {[...m.attempts].reverse().map((a) => (
                            <li key={a.id} className="small">
                              {formatDate(a.date)} · {a.result === 'correct' ? 'Solved correctly' : 'Still wrong'}
                              {a.note ? ` · ${a.note}` : ''}
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                    <div className="item-actions">
                      {!m.resolved && <button type="button" className="btn btn-sm btn-primary" onClick={() => setModal({ kind: 'attempt', mistake: m })}>Record re-attempt</button>}
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => {
                          update((d) => setMistakeResolved(d, m.id, !m.resolved, t0))
                          notify(m.resolved ? 'Mistake reopened.' : 'Marked as resolved.')
                        }}
                      >
                        {m.resolved ? 'Reopen' : 'Mark resolved'}
                      </button>
                      <button type="button" className="btn btn-sm" onClick={() => setModal({ kind: 'edit', mistake: m })}>Edit</button>
                      <button type="button" className="btn btn-sm btn-ghost" onClick={() => setModal({ kind: 'delete', mistake: m })}>Delete</button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}

      {modal?.kind === 'add' && <MistakeForm onClose={close} />}
      {modal?.kind === 'edit' && <MistakeForm mistake={modal.mistake} onClose={close} />}
      {modal?.kind === 'attempt' && <AttemptModal mistake={modal.mistake} onClose={close} />}
      {modal?.kind === 'delete' && (
        <ConfirmDialog
          title="Delete this mistake?"
          message="The record and its attempt history will be permanently removed. If you only want it out of the way, mark it resolved instead."
          confirmLabel="Delete"
          danger
          onCancel={close}
          onConfirm={() => {
            update((d) => deleteMistake(d, modal.mistake.id))
            notify('Mistake deleted.')
            close()
          }}
        />
      )}
    </>
  )
}
