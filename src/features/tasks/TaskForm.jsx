import { useState } from 'react'
import Modal from '../../components/Modal'
import { Field, FormActions } from '../../components/Field'
import SubjectChapterPicker from '../../components/SubjectChapterPicker'
import { useStore } from '../../data/store'
import { addTask, updateTask } from '../../data/repositories'
import { TASK_TYPES } from '../../data/constants'
import { validateTask } from '../../services/validators'
import { today } from '../../utils/dates'
import { toNum } from '../../utils/numbers'

const str = (v) => (v === null || v === undefined ? '' : String(v))

export default function TaskForm({ task = null, defaults = {}, onClose }) {
  const { data, update, notify } = useStore()
  const [v, setV] = useState(() => ({
    title: task?.title ?? '',
    type: task?.type ?? defaults.type ?? 'Lecture',
    subjectId: task?.subjectId ?? defaults.subjectId ?? '',
    chapterId: task?.chapterId ?? defaults.chapterId ?? '',
    date: task?.date ?? defaults.date ?? today(),
    plannedMin: str(task?.plannedMin),
    actualMin: str(task?.actualMin),
  }))
  const [errors, setErrors] = useState({})
  const set = (patch) => setV((cur) => ({ ...cur, ...patch }))

  function submit(e) {
    e.preventDefault()
    const found = validateTask(v)
    setErrors(found)
    if (Object.keys(found).length) return
    const clean = { ...v, plannedMin: toNum(v.plannedMin), actualMin: toNum(v.actualMin) }
    update((d) => (task ? updateTask(d, task.id, clean) : addTask(d, clean)))
    notify(task ? 'Task updated.' : 'Task added.')
    onClose()
  }

  return (
    <Modal title={task ? 'Edit task' : 'Add task'} onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <Field label="What do you want to do?" error={errors.title}>
          <input type="text" value={v.title} onChange={(e) => set({ title: e.target.value })} autoFocus />
        </Field>
        <div className="grid-2">
          <Field label="Type" error={errors.type}>
            <select value={v.type} onChange={(e) => set({ type: e.target.value })}>
              {TASK_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Date" error={errors.date}>
            <input type="date" value={v.date} onChange={(e) => set({ date: e.target.value })} />
          </Field>
        </div>
        <SubjectChapterPicker data={data} subjectId={v.subjectId} chapterId={v.chapterId} onChange={set} />
        <div className="grid-2">
          <Field label="Planned minutes" error={errors.plannedMin}>
            <input type="number" inputMode="numeric" min="0" value={v.plannedMin} onChange={(e) => set({ plannedMin: e.target.value })} />
          </Field>
          <Field label="Actual minutes" error={errors.actualMin} hint="Fill this after you finish.">
            <input type="number" inputMode="numeric" min="0" value={v.actualMin} onChange={(e) => set({ actualMin: e.target.value })} />
          </Field>
        </div>
        <FormActions onCancel={onClose} submitLabel={task ? 'Save changes' : 'Add task'} />
      </form>
    </Modal>
  )
}
