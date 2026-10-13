import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import ConfirmDialog from '../components/ConfirmDialog'
import { Field } from '../components/Field'
import { useStore } from '../data/store'
import { updateSettings } from '../data/repositories'
import { RECALL_LABELS, RECALL_LEVELS } from '../data/constants'
import { countRecords, downloadBackup, parseBackup } from '../data/backup'
import { createStarterData } from '../data/defaults'
import { loadPrevious } from '../data/storage'
import { validateSettings } from '../services/validators'
import { toNum } from '../utils/numbers'

export default function Settings() {
  const { data, update, notify, replaceAll, restorePrevious } = useStore()
  const s = data.settings
  const [form, setForm] = useState(() => ({
    dailyTargetMinutes: String(s.dailyTargetMinutes),
    attemptLabel: s.examAttempt.label,
    examDate: s.examAttempt.examDate,
    intervals: Object.fromEntries(RECALL_LEVELS.map((l) => [l, String(s.revisionIntervals[l])])),
  }))
  const [errors, setErrors] = useState({})
  const [importState, setImportState] = useState(null) // { errors } | { data, fileName, exportedAt }
  const [modal, setModal] = useState(null)
  const [resetText, setResetText] = useState('')
  const fileRef = useRef(null)
  const hasPrevious = Boolean(loadPrevious())

  function saveSettings(e) {
    e.preventDefault()
    const found = validateSettings({ dailyTargetMinutes: form.dailyTargetMinutes, examDate: form.examDate, intervals: form.intervals })
    setErrors(found)
    if (Object.keys(found).length) return
    update((d) =>
      updateSettings(d, {
        dailyTargetMinutes: Number(form.dailyTargetMinutes),
        examAttempt: { label: form.attemptLabel.trim(), examDate: form.examDate },
        revisionIntervals: Object.fromEntries(RECALL_LEVELS.map((l) => [l, toNum(form.intervals[l])])),
      }),
    )
    notify('Settings saved.')
  }

  function exportData() {
    try {
      downloadBackup(data)
      update((d) => updateSettings(d, { lastExportedAt: new Date().toISOString() }))
      notify('Backup downloaded. Keep the file somewhere safe (Files app, Drive, email to yourself).')
    } catch {
      notify('Could not create the backup file in this browser.', 'error')
    }
  }

  async function chooseFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    let text
    try {
      text = await file.text()
    } catch {
      return setImportState({ errors: ['The file could not be read.'] })
    }
    const result = parseBackup(text)
    setImportState(result.errors ? { errors: result.errors } : { data: result.data, exportedAt: result.exportedAt, fileName: file.name })
  }

  function confirmImport() {
    const result = replaceAll(importState.data)
    setModal(null)
    if (result.ok) {
      setImportState(null)
      notify('Backup imported. Your earlier data was kept as a safety copy.')
    } else {
      notify(`${result.error} Your current data is unchanged.`, 'error')
    }
  }

  function undoImport() {
    const result = restorePrevious()
    setModal(null)
    notify(result.ok ? 'Earlier data restored.' : result.error, result.ok ? 'success' : 'error')
  }

  const setInterval_ = (level, value) => setForm((f) => ({ ...f, intervals: { ...f.intervals, [level]: value } }))

  return (
    <>
      <PageHeader title="Settings" subtitle="Targets, revision schedule and data backup." />

      <form className="card" onSubmit={saveSettings} noValidate aria-label="Study settings">
        <h2>Study settings</h2>
        <div className="grid-2">
          <Field label="Daily study target (minutes)" error={errors.dailyTargetMinutes}>
            <input type="number" inputMode="numeric" min="1" value={form.dailyTargetMinutes} onChange={(e) => setForm({ ...form, dailyTargetMinutes: e.target.value })} />
          </Field>
          <span />
          <Field label="Exam attempt (e.g. May 2027)">
            <input type="text" value={form.attemptLabel} onChange={(e) => setForm({ ...form, attemptLabel: e.target.value })} />
          </Field>
          <Field label="Exam start date (optional)" error={errors.examDate} hint="Check the date on icai.org. This app does not look it up.">
            <input type="date" value={form.examDate} onChange={(e) => setForm({ ...form, examDate: e.target.value })} />
          </Field>
        </div>
        <h3>Revision schedule</h3>
        <p className="muted small">After a revision, the next review is this many days later, depending on how well you recalled the topic. It is a simple planning rule, not a guarantee of retention.</p>
        <div className="grid-2">
          {RECALL_LEVELS.map((l) => (
            <Field key={l} label={`${RECALL_LABELS[l]} recall → days until next review`} error={errors[`interval_${l}`]}>
              <input type="number" inputMode="numeric" min="1" value={form.intervals[l]} onChange={(e) => setInterval_(l, e.target.value)} />
            </Field>
          ))}
        </div>
        <div className="form-actions">
          <button type="submit" className="btn btn-primary">Save settings</button>
        </div>
      </form>

      <section className="card section" aria-label="Syllabus">
        <h2>Subjects and chapters</h2>
        <p>
          Edit, reorder and archive subjects and chapters on the <Link to="/subjects">Subjects page</Link>. The starter subjects are only a suggestion: please verify the papers and syllabus for your attempt on the official ICAI website (icai.org).
        </p>
      </section>

      <section className="card section" aria-label="Backup">
        <h2>Backup and restore</h2>
        <p className="banner banner-warn small">
          Your data is stored only inside this browser on this device. Clearing browser data, or Safari removing unused site data, will erase it. It is not a secure or cloud database, and laptop and iPad do not sync. Export a backup regularly.
        </p>
        <p className="muted small">{s.lastExportedAt ? `Last exported: ${new Date(s.lastExportedAt).toLocaleString()}` : 'You have not exported a backup yet.'}</p>
        <div className="row">
          <button type="button" className="btn btn-primary" onClick={exportData}>Export data (JSON)</button>
          <button type="button" className="btn" onClick={() => fileRef.current?.click()}>Import backup…</button>
          <input ref={fileRef} type="file" accept=".json,application/json" onChange={chooseFile} className="sr-only" aria-label="Choose backup file" tabIndex={-1} />
        </div>

        {importState?.errors && (
          <div className="banner banner-error" role="alert" style={{ marginTop: 12, display: 'block' }}>
            <strong>This file was not imported. Your data is unchanged.</strong>
            <ul style={{ paddingLeft: 20 }}>
              {importState.errors.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
        )}
        {importState?.data && (
          <div className="card" style={{ marginTop: 12 }}>
            <h3>Ready to import: {importState.fileName}</h3>
            <p className="muted small">{importState.exportedAt ? `Exported ${new Date(importState.exportedAt).toLocaleString()}. ` : ''}The file is valid. It contains:</p>
            <ul className="list small">
              {Object.entries(countRecords(importState.data)).map(([k, n]) => (
                <li key={k}>{k}: {n}</li>
              ))}
            </ul>
            <div className="form-actions">
              <button type="button" className="btn" onClick={() => setImportState(null)}>Cancel</button>
              <button type="button" className="btn btn-danger" onClick={() => setModal('import')}>Replace my data…</button>
            </div>
          </div>
        )}
        {hasPrevious && (
          <p style={{ marginTop: 12 }}>
            <button type="button" className="btn btn-sm" onClick={() => setModal('undo')}>Restore data from before the last import/reset</button>
          </p>
        )}
      </section>

      <section className="card section" aria-label="Reset">
        <h2>Reset</h2>
        <p className="muted">Erases all your records and brings back the starter subjects. A safety copy of your current data is kept so you can undo once.</p>
        <button type="button" className="btn btn-danger" onClick={() => { setResetText(''); setModal('reset') }}>Reset all data…</button>
      </section>

      {modal === 'import' && (
        <ConfirmDialog
          title="Replace all current data?"
          message="Everything currently in the app will be replaced by the contents of this backup file. A safety copy of your current data is kept so you can undo it once from this page."
          confirmLabel="Replace data"
          danger
          onCancel={() => setModal(null)}
          onConfirm={confirmImport}
        />
      )}
      {modal === 'undo' && (
        <ConfirmDialog
          title="Restore the earlier data?"
          message="This swaps your current data with the safety copy taken before the last import or reset. Your current data becomes the new safety copy."
          confirmLabel="Restore"
          onCancel={() => setModal(null)}
          onConfirm={undoImport}
        />
      )}
      {modal === 'reset' && (
        <ConfirmDialog
          title="Reset all data?"
          message={
            <>
              Type <strong>RESET</strong> to confirm.
              <input type="text" aria-label="Type RESET to confirm" value={resetText} onChange={(e) => setResetText(e.target.value)} style={{ marginTop: 8 }} />
            </>
          }
          confirmLabel="Reset everything"
          danger
          onCancel={() => setModal(null)}
          onConfirm={() => {
            if (resetText.trim() !== 'RESET') return
            const result = replaceAll(createStarterData())
            setModal(null)
            notify(result.ok ? 'All data reset. Starter subjects restored.' : `${result.error} Your data is unchanged.`, result.ok ? 'success' : 'error')
          }}
        />
      )}
    </>
  )
}
