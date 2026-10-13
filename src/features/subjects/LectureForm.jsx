import { useState } from 'react'
import Modal from '../../components/Modal'
import { Field, FormActions } from '../../components/Field'
import { useStore } from '../../data/store'
import { addLecture, updateLecture } from '../../data/repositories'
import { LECTURE_STATUSES } from '../../data/constants'
import { chaptersOf } from '../../services/lookup'
import { validateLecture } from '../../services/validators'
import { today } from '../../utils/dates'
import { toNum } from '../../utils/numbers'

const str = (v) => (v === null || v === undefined ? '' : String(v))

export default function LectureForm({ subjectId, lecture = null, defaultChapterId = '', onClose }) {
  const { data, update, notify } = useStore()
  const [v, setV] = useState(() => ({
    chapterId: lecture?.chapterId ?? defaultChapterId,
    title: lecture?.title ?? '',
    date: lecture?.date ?? today(),
    plannedMin: str(lecture?.plannedMin),
    watchedMin: str(lecture?.watchedMin),
    status: lecture?.status ?? 'Planned',
    notesDone: lecture?.notesDone ?? false,
    questionsPracticed: str(lecture?.questionsPracticed),
    nextAction: lecture?.nextAction ?? '',
  }))
  const [errors, setErrors] = useState({})
  const set = (patch) => setV((cur) => ({ ...cur, ...patch }))
  const chapters = chaptersOf(data, subjectId, { keepId: lecture?.chapterId })

  function submit(e) {
    e.preventDefault()
    const found = validateLecture(v)
    setErrors(found)
    if (Object.keys(found).length) return
    const clean = {
      ...v,
      subjectId,
      plannedMin: toNum(v.plannedMin),
      watchedMin: toNum(v.watchedMin),
      questionsPracticed: toNum(v.questionsPracticed) ?? 0,
      nextAction: v.nextAction.trim(),
    }
    update((d) => (lecture ? updateLecture(d, lecture.id, clean) : addLecture(d, clean)))
    notify(lecture ? 'Lecture updated.' : 'Lecture added.')
    onClose()
  }

  return (
    <Modal title={lecture ? 'Edit lecture' : 'Add lecture'} onClose={onClose} wide>
      <form onSubmit={submit} noValidate>
        <div className="grid-2">
          <Field label="Chapter" error={errors.chapterId}>
            <select value={v.chapterId} onChange={(e) => set({ chapterId: e.target.value })}>
              <option value="">Choose a chapter</option>
              {chapters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.archived ? ' (archived)' : ''}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Lecture title or number" error={errors.title}>
            <input type="text" value={v.title} onChange={(e) => set({ title: e.target.value })} />
          </Field>
        </div>
        <div className="grid-3">
          <Field label="Lecture date" error={errors.date}>
            <input type="date" value={v.date} onChange={(e) => set({ date: e.target.value })} />
          </Field>
          <Field label="Planned minutes" error={errors.plannedMin}>
            <input type="number" inputMode="numeric" min="0" value={v.plannedMin} onChange={(e) => set({ plannedMin: e.target.value })} />
          </Field>
          <Field label="Watched minutes" error={errors.watchedMin}>
            <input type="number" inputMode="numeric" min="0" value={v.watchedMin} onChange={(e) => set({ watchedMin: e.target.value })} />
          </Field>
        </div>
        <div className="grid-2">
          <Field label="Completion status" error={errors.status}>
            <select value={v.status} onChange={(e) => set({ status: e.target.value })}>
              {LECTURE_STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="Questions practised from this lecture" error={errors.questionsPracticed}>
            <input type="number" inputMode="numeric" min="0" value={v.questionsPracticed} onChange={(e) => set({ questionsPracticed: e.target.value })} />
          </Field>
        </div>
        <label className="check">
          <input type="checkbox" checked={v.notesDone} onChange={(e) => set({ notesDone: e.target.checked })} />
          Notes completed
        </label>
        <Field label="Next action">
          <input type="text" value={v.nextAction} onChange={(e) => set({ nextAction: e.target.value })} placeholder="e.g. Solve 10 questions, revise formulas" />
        </Field>
        <FormActions onCancel={onClose} submitLabel={lecture ? 'Save changes' : 'Add lecture'} />
      </form>
    </Modal>
  )
}
