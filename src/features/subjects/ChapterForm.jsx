import { useState } from 'react'
import Modal from '../../components/Modal'
import { Field, FormActions } from '../../components/Field'
import { useStore } from '../../data/store'
import { addChapter, updateChapter } from '../../data/repositories'
import { CHAPTER_STATUSES, PRIORITIES } from '../../data/constants'
import { validateChapter } from '../../services/validators'
import { toNum } from '../../utils/numbers'

const str = (v) => (v === null || v === undefined ? '' : String(v))

export default function ChapterForm({ subjectId, chapter = null, onClose }) {
  const { data, update, notify } = useStore()
  const [v, setV] = useState(() => ({
    name: chapter?.name ?? '',
    status: chapter?.status ?? 'Not Started',
    priority: chapter?.priority ?? 'Medium',
    lecturesPlanned: str(chapter?.lecturesPlanned),
    questionsTarget: str(chapter?.questionsTarget),
    questionsPracticed: str(chapter?.questionsPracticed),
  }))
  const [errors, setErrors] = useState({})
  const set = (patch) => setV((cur) => ({ ...cur, ...patch }))

  function submit(e) {
    e.preventDefault()
    const found = validateChapter({ ...v, subjectId }, data, chapter?.id)
    setErrors(found)
    if (Object.keys(found).length) return
    const clean = {
      name: v.name,
      status: v.status,
      priority: v.priority,
      lecturesPlanned: toNum(v.lecturesPlanned) ?? 0,
      questionsTarget: toNum(v.questionsTarget) ?? 0,
      questionsPracticed: toNum(v.questionsPracticed) ?? 0,
    }
    update((d) => (chapter ? updateChapter(d, chapter.id, clean) : addChapter(d, { ...clean, subjectId })))
    notify(chapter ? 'Chapter updated.' : 'Chapter added.')
    onClose()
  }

  return (
    <Modal title={chapter ? 'Edit chapter' : 'Add chapter'} onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <Field label="Chapter name" error={errors.name}>
          <input type="text" value={v.name} onChange={(e) => set({ name: e.target.value })} autoFocus />
        </Field>
        <div className="grid-2">
          <Field label="Status" error={errors.status} hint="You choose this yourself. Watching lectures never completes a chapter.">
            <select value={v.status} onChange={(e) => set({ status: e.target.value })}>
              {CHAPTER_STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="Priority" error={errors.priority}>
            <select value={v.priority} onChange={(e) => set({ priority: e.target.value })}>
              {PRIORITIES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="grid-3">
          <Field label="Lectures planned" error={errors.lecturesPlanned}>
            <input type="number" inputMode="numeric" min="0" value={v.lecturesPlanned} onChange={(e) => set({ lecturesPlanned: e.target.value })} />
          </Field>
          <Field label="Question target" error={errors.questionsTarget}>
            <input type="number" inputMode="numeric" min="0" value={v.questionsTarget} onChange={(e) => set({ questionsTarget: e.target.value })} />
          </Field>
          <Field label="Questions practised (outside lectures)" error={errors.questionsPracticed}>
            <input type="number" inputMode="numeric" min="0" value={v.questionsPracticed} onChange={(e) => set({ questionsPracticed: e.target.value })} />
          </Field>
        </div>
        <FormActions onCancel={onClose} submitLabel={chapter ? 'Save changes' : 'Add chapter'} />
      </form>
    </Modal>
  )
}
