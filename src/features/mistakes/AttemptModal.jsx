import { useState } from 'react'
import Modal from '../../components/Modal'
import { Field, FormActions } from '../../components/Field'
import { useStore } from '../../data/store'
import { recordAttempt } from '../../data/repositories'
import { nextMistakeDate } from '../../services/revisionSchedule'
import { validateAttempt } from '../../services/validators'
import { today } from '../../utils/dates'

export default function AttemptModal({ mistake, onClose }) {
  const { data, update, notify } = useStore()
  const [v, setV] = useState({ date: today(), result: 'correct', note: '' })
  const [override, setOverride] = useState(null)
  const [errors, setErrors] = useState({})
  const set = (patch) => setV((cur) => ({ ...cur, ...patch }))
  const suggested = nextMistakeDate(v.date || today(), v.result, data.settings.revisionIntervals)
  const nextDate = override ?? suggested

  function submit(e) {
    e.preventDefault()
    const found = validateAttempt({ ...v, nextPracticeDate: nextDate })
    setErrors(found)
    if (Object.keys(found).length) return
    update((d) => recordAttempt(d, mistake.id, { date: v.date, result: v.result, note: v.note }, nextDate))
    notify('Attempt recorded.')
    onClose()
  }

  return (
    <Modal title="Record a re-attempt" onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <p className="item-title">{mistake.reference}</p>
        <div className="grid-2">
          <Field label="Date attempted" error={errors.date}>
            <input type="date" value={v.date} onChange={(e) => set({ date: e.target.value })} />
          </Field>
          <Field label="Result">
            <select value={v.result} onChange={(e) => set({ result: e.target.value })}>
              <option value="correct">Solved correctly</option>
              <option value="wrong">Still wrong</option>
            </select>
          </Field>
        </div>
        <Field label="Next practice date" error={errors.nextPracticeDate} hint="Suggested from the result using your revision schedule. You can change it.">
          <input type="date" value={nextDate} onChange={(e) => setOverride(e.target.value)} />
        </Field>
        <Field label="Note">
          <textarea value={v.note} onChange={(e) => set({ note: e.target.value })} />
        </Field>
        <FormActions onCancel={onClose} submitLabel="Save attempt" />
      </form>
    </Modal>
  )
}
