import { useState } from 'react'
import Modal from '../../components/Modal'
import { Field, FormActions } from '../../components/Field'
import SubjectChapterPicker from '../../components/SubjectChapterPicker'
import { useStore } from '../../data/store'
import { addRevision, updateRevision } from '../../data/repositories'
import { validateRevision } from '../../services/validators'
import { findById } from '../../services/lookup'
import { today } from '../../utils/dates'

export default function RevisionForm({ revision = null, onClose }) {
  const { data, update, notify } = useStore()
  const [v, setV] = useState(() => ({
    topic: revision?.topic ?? '',
    subjectId: revision?.subjectId ?? findById(data.chapters, revision?.chapterId)?.subjectId ?? '',
    chapterId: revision?.chapterId ?? '',
    nextDate: revision?.nextDate ?? today(),
  }))
  const [errors, setErrors] = useState({})
  const set = (patch) => setV((cur) => ({ ...cur, ...patch }))

  function submit(e) {
    e.preventDefault()
    const found = validateRevision(v)
    setErrors(found)
    if (Object.keys(found).length) return
    const topic = v.topic.trim() || findById(data.chapters, v.chapterId)?.name || ''
    update((d) => (revision ? updateRevision(d, revision.id, { ...v, topic }) : addRevision(d, { ...v, topic })))
    notify(revision ? 'Revision item updated.' : 'Revision item added.')
    onClose()
  }

  return (
    <Modal title={revision ? 'Edit revision item' : 'Add revision item'} onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <SubjectChapterPicker data={data} subjectId={v.subjectId} chapterId={v.chapterId} onChange={set} />
        <Field label="Topic" error={errors.topic} hint="Leave empty to use the chapter name.">
          <input type="text" value={v.topic} onChange={(e) => set({ topic: e.target.value })} />
        </Field>
        {!revision && (
          <Field label="First revision date" error={errors.nextDate}>
            <input type="date" value={v.nextDate} onChange={(e) => set({ nextDate: e.target.value })} />
          </Field>
        )}
        <FormActions onCancel={onClose} submitLabel={revision ? 'Save changes' : 'Add item'} />
      </form>
    </Modal>
  )
}
