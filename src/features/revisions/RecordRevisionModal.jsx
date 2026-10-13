import { useState } from 'react'
import Modal from '../../components/Modal'
import { Field, FormActions } from '../../components/Field'
import { useStore } from '../../data/store'
import { recordRevision } from '../../data/repositories'
import { RECALL_LABELS, RECALL_LEVELS } from '../../data/constants'
import { nextRevisionDate } from '../../services/revisionSchedule'
import { validateRevisionRecord } from '../../services/validators'
import { formatDate, today } from '../../utils/dates'

export default function RecordRevisionModal({ revision, onClose }) {
  const { data, update, notify } = useStore()
  const intervals = data.settings.revisionIntervals
  const [v, setV] = useState({ date: today(), confidence: '3', recall: 'okay', notes: '' })
  const [override, setOverride] = useState(null) // manual next date, if the user picked one
  const [errors, setErrors] = useState({})
  const set = (patch) => setV((cur) => ({ ...cur, ...patch }))

  const suggested = nextRevisionDate(v.date || today(), v.recall, intervals)
  const nextDate = override ?? suggested

  function submit(e) {
    e.preventDefault()
    const found = validateRevisionRecord({ ...v, nextDate })
    setErrors(found)
    if (Object.keys(found).length) return
    update((d) => recordRevision(d, revision.id, { date: v.date, confidence: Number(v.confidence), recall: v.recall, notes: v.notes }, nextDate))
    notify(`Revision recorded. Next review: ${formatDate(nextDate)}.`)
    onClose()
  }

  return (
    <Modal title="Record a revision" onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <p className="item-title">{revision.topic}</p>
        <div className="grid-2">
          <Field label="Date revised" error={errors.date}>
            <input type="date" value={v.date} onChange={(e) => set({ date: e.target.value })} />
          </Field>
          <Field label="Confidence (1 low – 5 high)" error={errors.confidence}>
            <select value={v.confidence} onChange={(e) => set({ confidence: e.target.value })}>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="How well could you recall it?" error={errors.recall}>
          <select value={v.recall} onChange={(e) => set({ recall: e.target.value })}>
            {RECALL_LEVELS.map((r) => (
              <option key={r} value={r}>
                {RECALL_LABELS[r]} (review again in {intervals[r]} day{intervals[r] === 1 ? '' : 's'})
              </option>
            ))}
          </select>
        </Field>
        <Field label="Next review date" error={errors.nextDate} hint="Suggested from your recall result using the schedule in Settings. You can change it. It is a planning aid, not a guarantee of retention.">
          <input type="date" value={nextDate} onChange={(e) => setOverride(e.target.value)} />
        </Field>
        <Field label="Revision notes">
          <textarea value={v.notes} onChange={(e) => set({ notes: e.target.value })} />
        </Field>
        <FormActions onCancel={onClose} submitLabel="Save revision" />
      </form>
    </Modal>
  )
}
