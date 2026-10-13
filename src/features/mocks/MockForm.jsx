import { useState } from 'react'
import Modal from '../../components/Modal'
import { Field, FormActions } from '../../components/Field'
import { useStore } from '../../data/store'
import { addMock, updateMock } from '../../data/repositories'
import { activeSubjects, subjectName } from '../../services/lookup'
import { totalsFromScores } from '../../services/mockStats'
import { validateMock } from '../../services/validators'
import { today } from '../../utils/dates'
import { toNum } from '../../utils/numbers'

const str = (v) => (v === null || v === undefined ? '' : String(v))

export default function MockForm({ mock = null, onClose }) {
  const { data, update, notify } = useStore()
  const [v, setV] = useState(() => ({
    name: mock?.name ?? '',
    date: mock?.date ?? today(),
    durationMin: str(mock?.durationMin),
    breakdown: mock ? mock.scores.length > 0 : false,
    marksObtained: str(mock?.marksObtained),
    maxMarks: str(mock?.maxMarks),
    rows: (mock?.scores ?? []).map((s) => ({ subjectId: s.subjectId, obtained: str(s.obtained), max: str(s.max) })),
    notes: mock?.notes ?? '',
    improveTopics: mock?.improveTopics ?? '',
  }))
  const [errors, setErrors] = useState({})
  const set = (patch) => setV((cur) => ({ ...cur, ...patch }))
  const setRow = (i, patch) => set({ rows: v.rows.map((r, k) => (k === i ? { ...r, ...patch } : r)) })

  const subjects = activeSubjects(data)
  const usedArchived = v.rows.map((r) => r.subjectId).filter((id) => id && !subjects.some((s) => s.id === id))

  function submit(e) {
    e.preventDefault()
    const found = validateMock(v)
    setErrors(found)
    if (Object.keys(found).length) return
    let scores = []
    let totals
    if (v.breakdown) {
      scores = v.rows.map((r) => ({ subjectId: r.subjectId, obtained: Number(r.obtained), max: Number(r.max) }))
      totals = totalsFromScores(scores)
    } else {
      totals = { marksObtained: Number(v.marksObtained), maxMarks: Number(v.maxMarks) }
    }
    const clean = { name: v.name, date: v.date, durationMin: toNum(v.durationMin), scores, ...totals, notes: v.notes, improveTopics: v.improveTopics }
    update((d) => (mock ? updateMock(d, mock.id, clean) : addMock(d, clean)))
    notify(mock ? 'Mock test updated.' : 'Mock test saved.')
    onClose()
  }

  const preview = v.breakdown && v.rows.length ? totalsFromScores(v.rows.map((r) => ({ obtained: Number(r.obtained) || 0, max: Number(r.max) || 0 }))) : null

  return (
    <Modal title={mock ? 'Edit mock test' : 'Add mock test'} onClose={onClose} wide>
      <form onSubmit={submit} noValidate>
        <div className="grid-3">
          <Field label="Test name" error={errors.name}>
            <input type="text" value={v.name} onChange={(e) => set({ name: e.target.value })} autoFocus />
          </Field>
          <Field label="Date" error={errors.date}>
            <input type="date" value={v.date} onChange={(e) => set({ date: e.target.value })} />
          </Field>
          <Field label="Duration (minutes)" error={errors.durationMin}>
            <input type="number" inputMode="numeric" min="0" value={v.durationMin} onChange={(e) => set({ durationMin: e.target.value })} />
          </Field>
        </div>

        <label className="check">
          <input
            type="checkbox"
            checked={v.breakdown}
            onChange={(e) => set({ breakdown: e.target.checked, rows: e.target.checked && v.rows.length === 0 ? [{ subjectId: '', obtained: '', max: '' }] : v.rows })}
          />
          Enter marks subject-wise
        </label>

        {v.breakdown ? (
          <div className="stack" style={{ marginBottom: 12 }}>
            {errors.rows && <p className="error" role="alert">{errors.rows}</p>}
            {v.rows.map((r, i) => (
              <div key={i} className="grid-3" style={{ alignItems: 'end' }}>
                <Field label={`Subject ${i + 1}`} error={errors.rowErrors?.[i] && !r.subjectId ? errors.rowErrors[i] : undefined}>
                  <select value={r.subjectId} onChange={(e) => setRow(i, { subjectId: e.target.value })}>
                    <option value="">Choose a subject</option>
                    {usedArchived.includes(r.subjectId) && <option value={r.subjectId}>{subjectName(data, r.subjectId)}</option>}
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Marks obtained" error={errors.rowErrors?.[i] && r.subjectId ? errors.rowErrors[i] : undefined}>
                  <input type="number" inputMode="decimal" min="0" step="any" value={r.obtained} onChange={(e) => setRow(i, { obtained: e.target.value })} />
                </Field>
                <div className="row" style={{ alignItems: 'end', marginBottom: 12 }}>
                  <Field label="Maximum marks" className="grow">
                    <input type="number" inputMode="decimal" min="0" step="any" value={r.max} onChange={(e) => setRow(i, { max: e.target.value })} />
                  </Field>
                  <button type="button" className="btn btn-icon" aria-label={`Remove subject row ${i + 1}`} onClick={() => set({ rows: v.rows.filter((_, k) => k !== i) })}>✕</button>
                </div>
              </div>
            ))}
            <div className="row-between">
              <button type="button" className="btn btn-sm" onClick={() => set({ rows: [...v.rows, { subjectId: '', obtained: '', max: '' }] })}>+ Add subject row</button>
              {preview && <span className="muted">Total: {preview.marksObtained} / {preview.maxMarks}</span>}
            </div>
          </div>
        ) : (
          <>
            <div className="grid-2">
              <Field label="Marks obtained">
                <input type="number" inputMode="decimal" min="0" step="any" value={v.marksObtained} onChange={(e) => set({ marksObtained: e.target.value })} aria-invalid={errors.marks ? true : undefined} />
              </Field>
              <Field label="Maximum marks">
                <input type="number" inputMode="decimal" min="0" step="any" value={v.maxMarks} onChange={(e) => set({ maxMarks: e.target.value })} aria-invalid={errors.marks ? true : undefined} />
              </Field>
            </div>
            {errors.marks && <p className="error" role="alert">{errors.marks}</p>}
          </>
        )}

        <Field label="Topics needing improvement">
          <textarea value={v.improveTopics} onChange={(e) => set({ improveTopics: e.target.value })} />
        </Field>
        <Field label="Performance notes">
          <textarea value={v.notes} onChange={(e) => set({ notes: e.target.value })} />
        </Field>
        <FormActions onCancel={onClose} submitLabel={mock ? 'Save changes' : 'Save test'} />
      </form>
    </Modal>
  )
}
