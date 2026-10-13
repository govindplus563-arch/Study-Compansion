import { useState } from 'react'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import ConfirmDialog from '../components/ConfirmDialog'
import Modal from '../components/Modal'
import { Field, FormActions } from '../components/Field'
import { useStore } from '../data/store'
import { rescheduleRevision, setRevisionArchived } from '../data/repositories'
import { RECALL_LABELS } from '../data/constants'
import { contextLabel } from '../services/lookup'
import { groupRevisions, lastReview } from '../services/revisionSchedule'
import { formatDate, formatShortDate, isValidDateStr, today } from '../utils/dates'
import RevisionForm from '../features/revisions/RevisionForm'
import RecordRevisionModal from '../features/revisions/RecordRevisionModal'

function RescheduleModal({ revision, onClose }) {
  const { update, notify } = useStore()
  const [date, setDate] = useState(revision.nextDate)
  const [error, setError] = useState('')
  function submit(e) {
    e.preventDefault()
    if (!isValidDateStr(date)) return setError('Choose a valid date.')
    update((d) => rescheduleRevision(d, revision.id, date))
    notify('Revision rescheduled.')
    onClose()
  }
  return (
    <Modal title="Reschedule revision" onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <p>{revision.topic}</p>
        <Field label="Next review date" error={error}>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} autoFocus />
        </Field>
        <FormActions onCancel={onClose} submitLabel="Reschedule" />
      </form>
    </Modal>
  )
}

function RevisionItem({ revision, status, onAction }) {
  const { data } = useStore()
  const last = lastReview(revision)
  const context = contextLabel(data, revision)
  return (
    <li className="item">
      <div className="row-between">
        <span className="item-title">{revision.topic}</span>
        <span className={`badge ${status === 'overdue' ? 'badge-danger' : status === 'today' ? 'badge-warn' : ''}`}>
          {status === 'overdue' ? 'Overdue · ' : status === 'today' ? 'Due today · ' : 'Due '}
          {formatShortDate(revision.nextDate)}
        </span>
      </div>
      <div className="item-meta">
        {context && <span>{context}</span>}
        {last ? (
          <span>
            Last revised {formatDate(last.date)} · confidence {last.confidence}/5 · recall {RECALL_LABELS[last.recall]}
          </span>
        ) : (
          <span>Not revised yet</span>
        )}
      </div>
      {revision.history.length > 0 && (
        <details>
          <summary>History ({revision.history.length})</summary>
          <ul className="list" style={{ marginTop: 8 }}>
            {[...revision.history].reverse().map((h) => (
              <li key={h.id} className="small">
                {formatDate(h.date)} · confidence {h.confidence}/5 · {RECALL_LABELS[h.recall]} recall
                {h.notes ? ` · ${h.notes}` : ''}
              </li>
            ))}
          </ul>
        </details>
      )}
      <div className="item-actions">
        <button type="button" className="btn btn-sm btn-primary" onClick={() => onAction('record', revision)}>
          Record revision
        </button>
        <button type="button" className="btn btn-sm" onClick={() => onAction('reschedule', revision)}>
          Reschedule
        </button>
        <button type="button" className="btn btn-sm" onClick={() => onAction('edit', revision)}>
          Edit
        </button>
        <button type="button" className="btn btn-sm btn-ghost" onClick={() => onAction('archive', revision)}>
          Archive
        </button>
      </div>
    </li>
  )
}

export default function Revisions() {
  const { data, update, notify } = useStore()
  const [modal, setModal] = useState(null)
  const close = () => setModal(null)
  const t0 = today()
  const active = data.revisions.filter((r) => !r.archived)
  const groups = groupRevisions(active, t0)
  const archived = data.revisions.filter((r) => r.archived)
  const act = (kind, revision) => setModal({ kind, revision })

  const sections = [
    ['overdue', 'Overdue', groups.overdue],
    ['today', 'Due today', groups.today],
    ['upcoming', 'Upcoming', groups.upcoming],
  ]

  return (
    <>
      <PageHeader
        title="Revisions"
        subtitle="Review topics on a simple schedule. Poor recall brings the next review sooner; strong recall allows a longer gap."
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setModal({ kind: 'add' })}>
            + Add revision item
          </button>
        }
      />
      {active.length === 0 ? (
        <EmptyState title="No revision items yet" action={<button type="button" className="btn btn-primary" onClick={() => setModal({ kind: 'add' })}>Add your first item</button>}>
          Add a chapter or topic you want to revise. After each revision, record how well you recalled it and the app suggests the next date.
        </EmptyState>
      ) : (
        sections.map(([key, label, items]) => (
          <section key={key} className="section" aria-label={label}>
            <h2>
              {label} <span className="badge">{items.length}</span>
            </h2>
            {items.length === 0 ? (
              <p className="muted">Nothing {key === 'upcoming' ? 'upcoming' : key === 'today' ? 'due today' : 'overdue'}.</p>
            ) : (
              <ul className="list">
                {items.map((r) => (
                  <RevisionItem key={r.id} revision={r} status={key} onAction={act} />
                ))}
              </ul>
            )}
          </section>
        ))
      )}
      {archived.length > 0 && (
        <section className="section">
          <details>
            <summary>Archived items ({archived.length})</summary>
            <ul className="list" style={{ marginTop: 8 }}>
              {archived.map((r) => (
                <li key={r.id} className="item">
                  <div className="row-between">
                    <span className="item-title">{r.topic}</span>
                    <button type="button" className="btn btn-sm" onClick={() => { update((d) => setRevisionArchived(d, r.id, false)); notify('Revision item restored.') }}>
                      Restore
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </details>
        </section>
      )}
      <p className="muted small section">The review gaps (Settings → Revision schedule) are a simple planning rule. They do not guarantee retention or exam results.</p>

      {modal?.kind === 'add' && <RevisionForm onClose={close} />}
      {modal?.kind === 'edit' && <RevisionForm revision={modal.revision} onClose={close} />}
      {modal?.kind === 'record' && <RecordRevisionModal revision={modal.revision} onClose={close} />}
      {modal?.kind === 'reschedule' && <RescheduleModal revision={modal.revision} onClose={close} />}
      {modal?.kind === 'archive' && (
        <ConfirmDialog
          title="Archive revision item?"
          message={`"${modal.revision.topic}" will stop appearing in the schedule. Its history is kept and you can restore it.`}
          confirmLabel="Archive"
          onCancel={close}
          onConfirm={() => {
            update((d) => setRevisionArchived(d, modal.revision.id, true))
            notify('Revision item archived.')
            close()
          }}
        />
      )}
    </>
  )
}
