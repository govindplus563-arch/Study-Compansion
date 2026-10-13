import { useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import ConfirmDialog from '../components/ConfirmDialog'
import { useStore } from '../data/store'
import { moveSubject, setSubjectArchived } from '../data/repositories'
import { bySubjectOrder } from '../services/lookup'
import { subjectStats } from '../services/progress'
import SubjectForm from '../features/subjects/SubjectForm'

export default function Subjects() {
  const { data, update, notify } = useStore()
  const [showArchived, setShowArchived] = useState(false)
  const [modal, setModal] = useState(null)
  const close = () => setModal(null)

  const active = data.subjects.filter((s) => !s.archived).sort(bySubjectOrder)
  const archived = data.subjects.filter((s) => s.archived).sort(bySubjectOrder)

  return (
    <>
      <PageHeader
        title="Subjects"
        subtitle="Your papers, chapters and lecture progress. Starter subjects are editable."
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setModal({ kind: 'add' })}>
            + Add subject
          </button>
        }
      />
      <p className="banner banner-info small">
        The starter list is only a suggestion. Please verify the papers and syllabus for your attempt on the official ICAI website (icai.org) and edit anything that differs.
      </p>

      {active.length === 0 ? (
        <EmptyState title="No subjects yet" action={<button type="button" className="btn btn-primary" onClick={() => setModal({ kind: 'add' })}>Add your first subject</button>}>
          Add the papers you are studying, then add chapters inside each one.
        </EmptyState>
      ) : (
        <ul className="list">
          {active.map((s, i) => {
            const st = subjectStats(data, s.id)
            const pct = st.chapters ? Math.round((st.completed / st.chapters) * 100) : 0
            return (
              <li key={s.id} className="item">
                <div className="row-between">
                  <Link to={`/subjects/${s.id}`} className="item-title">
                    {s.name}
                  </Link>
                  <span className="muted small">
                    {st.chapters === 0 ? 'No chapters yet' : `${st.completed} of ${st.chapters} chapters completed`}
                  </span>
                </div>
                {st.chapters > 0 && (
                  <div className="progress" role="img" aria-label={`${pct}% of chapters completed`}>
                    <span style={{ width: `${pct}%` }} />
                  </div>
                )}
                <div className="item-actions">
                  <Link className="btn btn-sm btn-primary" to={`/subjects/${s.id}`}>
                    Open chapters
                  </Link>
                  <button type="button" className="btn btn-sm" onClick={() => setModal({ kind: 'edit', subject: s })}>
                    Rename
                  </button>
                  <button type="button" className="btn btn-sm" disabled={i === 0} onClick={() => update((d) => moveSubject(d, s.id, -1))} aria-label={`Move ${s.name} up`}>
                    ↑
                  </button>
                  <button type="button" className="btn btn-sm" disabled={i === active.length - 1} onClick={() => update((d) => moveSubject(d, s.id, 1))} aria-label={`Move ${s.name} down`}>
                    ↓
                  </button>
                  <button type="button" className="btn btn-sm btn-ghost" onClick={() => setModal({ kind: 'archive', subject: s })}>
                    Archive
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {archived.length > 0 && (
        <section className="section">
          <button type="button" className="btn btn-sm" aria-expanded={showArchived} onClick={() => setShowArchived((v) => !v)}>
            {showArchived ? 'Hide' : 'Show'} archived subjects ({archived.length})
          </button>
          {showArchived && (
            <ul className="list" style={{ marginTop: 12 }}>
              {archived.map((s) => (
                <li key={s.id} className="item">
                  <div className="row-between">
                    <Link to={`/subjects/${s.id}`} className="item-title">
                      {s.name}
                    </Link>
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => {
                        update((d) => setSubjectArchived(d, s.id, false))
                        notify('Subject restored.')
                      }}
                    >
                      Restore
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {modal?.kind === 'add' && <SubjectForm onClose={close} />}
      {modal?.kind === 'edit' && <SubjectForm subject={modal.subject} onClose={close} />}
      {modal?.kind === 'archive' && (
        <ConfirmDialog
          title="Archive subject?"
          message={`"${modal.subject.name}" will be hidden from pickers and lists. Nothing is deleted: its chapters, lectures, tasks, mistakes and mock-test scores stay saved, and you can restore it any time.`}
          confirmLabel="Archive"
          onCancel={close}
          onConfirm={() => {
            update((d) => setSubjectArchived(d, modal.subject.id, true))
            notify('Subject archived.')
            close()
          }}
        />
      )}
    </>
  )
}
