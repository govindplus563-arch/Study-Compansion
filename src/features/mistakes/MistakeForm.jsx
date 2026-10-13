import { useState } from 'react'
import Modal from '../../components/Modal'
import { Field, FormActions } from '../../components/Field'
import SubjectChapterPicker from '../../components/SubjectChapterPicker'
import { useStore } from '../../data/store'
import { addMistake, updateMistake } from '../../data/repositories'
import { MISTAKE_CATEGORIES } from '../../data/constants'
import { validateMistake } from '../../services/validators'
import { addDays, today } from '../../utils/dates'

export default function MistakeForm({ mistake = null, onClose }) {
  const { data, update, notify } = useStore()
  const [v, setV] = useState(() => ({
    subjectId: mistake?.subjectId ?? '',
    chapterId: mistake?.chapterId ?? '',
    reference: mistake?.reference ?? '',
    category: mistake?.category ?? MISTAKE_CATEGORIES[0],
    whatWentWrong: mistake?.whatWentWrong ?? '',
    correctApproach: mistake?.correctApproach ?? '',
    recordedOn: mistake?.recordedOn ?? today(),
    nextPracticeDate: mistake ? mistake.nextPracticeDate ?? '' : addDays(today(), 3),
  }))
  const [errors, setErrors] = useState({})
  const set = (patch) => setV((cur) => ({ ...cur, ...patch }))

  function submit(e) {
    e.preventDefault()
    const found = validateMistake(v)
    setErrors(found)
    if (Object.keys(found).length) return
    update((d) => (mistake ? updateMistake(d, mistake.id, v) : addMistake(d, v)))
    notify(mistake ? 'Mistake updated.' : 'Mistake logged.')
    onClose()
  }

  return (
    <Modal title={mistake ? 'Edit mistake' : 'Log a mistake'} onClose={onClose} wide>
      <form onSubmit={submit} noValidate>
        <SubjectChapterPicker data={data} subjectId={v.subjectId} chapterId={v.chapterId} onChange={set} />
        <div className="grid-2">
          <Field label="Question reference or short description" error={errors.reference}>
            <input type="text" value={v.reference} onChange={(e) => set({ reference: e.target.value })} placeholder="e.g. RTP May 24, Q4" />
          </Field>
          <Field label="Mistake category" error={errors.category}>
            <select value={v.category} onChange={(e) => set({ category: e.target.value })}>
              {MISTAKE_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="What went wrong?" error={errors.whatWentWrong}>
          <textarea value={v.whatWentWrong} onChange={(e) => set({ whatWentWrong: e.target.value })} />
        </Field>
        <Field label="Correct approach" error={errors.correctApproach}>
          <textarea value={v.correctApproach} onChange={(e) => set({ correctApproach: e.target.value })} />
        </Field>
        <div className="grid-2">
          <Field label="Date recorded" error={errors.recordedOn}>
            <input type="date" value={v.recordedOn} onChange={(e) => set({ recordedOn: e.target.value })} />
          </Field>
          <Field label="Next practice date" error={errors.nextPracticeDate} hint="When should you try a similar question again?">
            <input type="date" value={v.nextPracticeDate} onChange={(e) => set({ nextPracticeDate: e.target.value })} />
          </Field>
        </div>
        <FormActions onCancel={onClose} submitLabel={mistake ? 'Save changes' : 'Log mistake'} />
      </form>
    </Modal>
  )
}
