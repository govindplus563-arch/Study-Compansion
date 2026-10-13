import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import ConfirmDialog from '../components/ConfirmDialog'
import { useStore } from '../data/store'
import { deleteLecture, moveChapter, setChapterArchived, setChapterStatus, setSubjectArchived } from '../data/repositories'
import { CHAPTER_STATUSES } from '../data/constants'
import { bySubjectOrder, chapterName, findById } from '../services/lookup'
import { chapterStats } from '../services/progress'
import { formatMinutes, formatShortDate } from '../utils/dates'
import ChapterForm from '../features/subjects/ChapterForm'
import LectureForm from '../features/subjects/LectureForm'

const PRIORITY_BADGE = { High: 'badge-danger', Medium: 'badge-warn', Low: '' }

export default function SubjectDetail() {
  const { subjectId } = useParams()
  const { data, update, notify } = useStore()
  const [tab, setTab] = useState('chapters')
  const [showArchived, setShowArchived] = useState(false)
  const [lectureFilter, setLectureFilter] = useState('')
  const [modal, setModal] = useState(null)
  const close = () => setModal(null)

  const subject = findById(data.subjects, subjectId)
  if (!subject) {
    return (
      <>
        <PageHeader title="Subject not found" />
        <p>
          <Link to="/subjects">Back to subjects</Link>
        </p>
      </>
    )
  }

  const allChapters = data.chapters.filter((c) => c.subjectId === subjectId).sort(bySubjectOrder)
  const chapters = allChapters.filter((c) => !c.archived)
  const archivedChapters = allChapters.filter((c) => c.archived)
  const lectures = data.lectures
    .filter((l) => l.subjectId === subjectId && (!lectureFilter || l.chapterId === lectureFilter))
    .sort((a, b) => b.date.localeCompare(a.date))

  return (
    <>
      <PageHeader
        title={subject.name}
        subtitle={subject.archived ? 'This subject is archived. Its records are kept.' : 'Chapters, status and lecture progress.'}
        actions={
          <>
            <Link className="btn" to="/subjects">
              ← All subjects
            </Link>
            {subject.archived && (
              <button
                type="button"
                className="btn"
                onClick={() => {
                  update((d) => setSubjectArchived(d, subject.id, false))
                  notify('Subject restored.')
                }}
              >
                Restore subject
              </button>
            )}
          </>
        }
      />

      <div className="tabs" role="tablist" aria-label="Subject sections">
        {[
          ['chapters', 'Chapters'],
          ['lectures', 'Lectures'],
        ].map(([key, label]) => (
          <button key={key} type="button" role="tab" className="tab" aria-selected={tab === key} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'chapters' && (
        <section aria-label="Chapters">
          <div className="row-between" style={{ marginBottom: 12 }}>
            <p className="muted small" style={{ margin: 0 }}>
              Lecture progress and question practice are tracked separately. Status is always set by you.
            </p>
            <button type="button" className="btn btn-primary" onClick={() => setModal({ kind: 'chapter' })}>
              + Add chapter
            </button>
          </div>
          {chapters.length === 0 ? (
            <EmptyState title="No chapters yet">Add the chapters of this paper (copy the names from your lecture series or the ICAI syllabus).</EmptyState>
          ) : (
            <ul className="list">
              {chapters.map((c, i) => {
                const st = chapterStats(data, c)
                const lecturePct = st.lecturesPlanned ? Math.min(100, Math.round((st.lecturesWatched / st.lecturesPlanned) * 100)) : 0
                const qPct = st.questionsTarget ? Math.min(100, Math.round((st.questionsDone / st.questionsTarget) * 100)) : 0
                return (
                  <li key={c.id} className="item">
                    <div className="row-between">
                      <span className="item-title">{c.name}</span>
                      <span className="row">
                        <span className={`badge ${PRIORITY_BADGE[c.priority]}`}>{c.priority} priority</span>
                        <select
                          aria-label={`Status of ${c.name}`}
                          value={c.status}
                          style={{ width: 'auto' }}
                          onChange={(e) => update((d) => setChapterStatus(d, c.id, e.target.value))}
                        >
                          {CHAPTER_STATUSES.map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                      </span>
                    </div>
                    <div className="grid-2">
                      <div>
                        <div className="small">
                          Lectures watched: {st.lecturesWatched}
                          {st.lecturesPlanned ? ` of ${st.lecturesPlanned} planned` : ' (no plan set)'}
                        </div>
                        {st.lecturesPlanned > 0 && (
                          <div className="progress" role="img" aria-label={`Lecture progress ${lecturePct}%`}>
                            <span style={{ width: `${lecturePct}%` }} />
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="small">
                          Questions practised: {st.questionsDone}
                          {st.questionsTarget ? ` of ${st.questionsTarget} target` : ' (no target set)'}
                        </div>
                        {st.questionsTarget > 0 && (
                          <div className="progress" role="img" aria-label={`Question progress ${qPct}%`}>
                            <span style={{ width: `${qPct}%` }} />
                          </div>
                        )}
                      </div>
                    </div>
                    {(st.unresolvedMistakes > 0 || st.openRevisions > 0) && (
                      <div className="item-meta">
                        {st.unresolvedMistakes > 0 && <span className="badge badge-danger">{st.unresolvedMistakes} unresolved mistake(s)</span>}
                        {st.openRevisions > 0 && <span className="badge">{st.openRevisions} revision item(s)</span>}
                      </div>
                    )}
                    <div className="item-actions">
                      <button type="button" className="btn btn-sm" onClick={() => setModal({ kind: 'chapter', chapter: c })}>
                        Edit
                      </button>
                      <button type="button" className="btn btn-sm" onClick={() => setModal({ kind: 'lecture', chapterId: c.id })}>
                        + Lecture
                      </button>
                      <button type="button" className="btn btn-sm" disabled={i === 0} onClick={() => update((d) => moveChapter(d, c.id, -1))} aria-label={`Move ${c.name} up`}>
                        ↑
                      </button>
                      <button type="button" className="btn btn-sm" disabled={i === chapters.length - 1} onClick={() => update((d) => moveChapter(d, c.id, 1))} aria-label={`Move ${c.name} down`}>
                        ↓
                      </button>
                      <button type="button" className="btn btn-sm btn-ghost" onClick={() => setModal({ kind: 'archiveChapter', chapter: c })}>
                        Archive
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
          {archivedChapters.length > 0 && (
            <div className="section">
              <button type="button" className="btn btn-sm" aria-expanded={showArchived} onClick={() => setShowArchived((v) => !v)}>
                {showArchived ? 'Hide' : 'Show'} archived chapters ({archivedChapters.length})
              </button>
              {showArchived && (
                <ul className="list" style={{ marginTop: 12 }}>
                  {archivedChapters.map((c) => (
                    <li key={c.id} className="item">
                      <div className="row-between">
                        <span className="item-title">{c.name}</span>
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => {
                            update((d) => setChapterArchived(d, c.id, false))
                            notify('Chapter restored.')
                          }}
                        >
                          Restore
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>
      )}

      {tab === 'lectures' && (
        <section aria-label="Lectures">
          <div className="toolbar">
            <div className="field">
              <label htmlFor="lec-filter">Chapter</label>
              <select id="lec-filter" value={lectureFilter} onChange={(e) => setLectureFilter(e.target.value)}>
                <option value="">All chapters</option>
                {allChapters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <button type="button" className="btn btn-primary" disabled={allChapters.length === 0} onClick={() => setModal({ kind: 'lecture', chapterId: lectureFilter })}>
              + Add lecture
            </button>
          </div>
          {allChapters.length === 0 ? (
            <EmptyState title="Add a chapter first">Every lecture belongs to a chapter. Add chapters in the Chapters tab.</EmptyState>
          ) : lectures.length === 0 ? (
            <EmptyState title="No lectures recorded">Record each lecture you watch. Watching a lecture does not mark the chapter complete.</EmptyState>
          ) : (
            <ul className="list">
              {lectures.map((l) => (
                <li key={l.id} className="item">
                  <div className="row-between">
                    <span className="item-title">{l.title}</span>
                    <span className={`badge ${l.status === 'Watched' ? 'badge-success' : l.status === 'In progress' ? 'badge-warn' : ''}`}>{l.status}</span>
                  </div>
                  <div className="item-meta">
                    <span>{chapterName(data, l.chapterId)}</span>
                    <span>{formatShortDate(l.date)}</span>
                    {l.plannedMin != null && <span>Planned {formatMinutes(l.plannedMin)}</span>}
                    {l.watchedMin != null && <span>Watched {formatMinutes(l.watchedMin)}</span>}
                    <span>{l.notesDone ? 'Notes done' : 'Notes pending'}</span>
                    <span>{l.questionsPracticed || 0} questions practised</span>
                  </div>
                  {l.nextAction && <div className="small">Next: {l.nextAction}</div>}
                  <div className="item-actions">
                    <button type="button" className="btn btn-sm" onClick={() => setModal({ kind: 'lecture', lecture: l })}>
                      Edit
                    </button>
                    <button type="button" className="btn btn-sm btn-ghost" onClick={() => setModal({ kind: 'deleteLecture', lecture: l })}>
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {modal?.kind === 'chapter' && <ChapterForm subjectId={subject.id} chapter={modal.chapter} onClose={close} />}
      {modal?.kind === 'lecture' && <LectureForm subjectId={subject.id} lecture={modal.lecture} defaultChapterId={modal.chapterId || ''} onClose={close} />}
      {modal?.kind === 'archiveChapter' && (
        <ConfirmDialog
          title="Archive chapter?"
          message={`"${modal.chapter.name}" will be hidden, but its lectures, tasks, revisions and mistakes stay saved. You can restore it later.`}
          confirmLabel="Archive"
          onCancel={close}
          onConfirm={() => {
            update((d) => setChapterArchived(d, modal.chapter.id, true))
            notify('Chapter archived.')
            close()
          }}
        />
      )}
      {modal?.kind === 'deleteLecture' && (
        <ConfirmDialog
          title="Delete lecture record?"
          message={`"${modal.lecture.title}" will be permanently removed. This cannot be undone.`}
          confirmLabel="Delete"
          danger
          onCancel={close}
          onConfirm={() => {
            update((d) => deleteLecture(d, modal.lecture.id))
            notify('Lecture deleted.')
            close()
          }}
        />
      )}
    </>
  )
}
