import { useState } from 'react'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import ConfirmDialog from '../components/ConfirmDialog'
import { useStore } from '../data/store'
import { deleteMock } from '../data/repositories'
import { subjectName } from '../services/lookup'
import { MIN_TESTS_FOR_TREND, mockPercent, overallTrend, sortedByDate, subjectAverages } from '../services/mockStats'
import { formatDate, formatMinutes } from '../utils/dates'
import MockForm from '../features/mocks/MockForm'

export default function MockTests() {
  const { data, update, notify } = useStore()
  const [modal, setModal] = useState(null)
  const close = () => setModal(null)
  const mocks = [...sortedByDate(data.mockTests)].reverse()
  const trend = overallTrend(data.mockTests)
  const averages = subjectAverages(data.mockTests)

  return (
    <>
      <PageHeader
        title="Mock Tests"
        subtitle="Record scores and see trends once you have enough real results."
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setModal({ kind: 'add' })}>
            + Add mock test
          </button>
        }
      />
      {mocks.length === 0 ? (
        <EmptyState title="No mock tests recorded" action={<button type="button" className="btn btn-primary" onClick={() => setModal({ kind: 'add' })}>Add your first mock test</button>}>
          Enter the marks after each test. You can add subject-wise marks to find weak areas.
        </EmptyState>
      ) : (
        <>
          <section className="card" aria-label="Trend">
            <h2>Performance trend</h2>
            {trend ? (
              <p>
                Latest score is <strong>{trend.latest}%</strong>, compared with an average of <strong>{trend.earlierAvg}%</strong> across your earlier {trend.count - 1} test(s):{' '}
                {trend.direction === 'flat' ? 'no change.' : `${Math.abs(trend.diff)} percentage points ${trend.direction === 'up' ? 'higher' : 'lower'}.`}
                <span className="muted small"> Based only on your {trend.count} saved tests; a small number of tests is a rough guide.</span>
              </p>
            ) : (
              <p className="muted">
                Not enough data for a trend yet. Record at least {MIN_TESTS_FOR_TREND} tests (you have {mocks.length}).
              </p>
            )}
            {averages.length > 0 && (
              <div className="table-scroll">
                <table className="data">
                  <caption className="sr-only">Subject-wise averages</caption>
                  <thead>
                    <tr><th>Subject</th><th>Tests</th><th>Average</th></tr>
                  </thead>
                  <tbody>
                    {averages.map((a) => (
                      <tr key={a.subjectId}>
                        <td>{subjectName(data, a.subjectId)}</td>
                        <td>{a.tests}</td>
                        <td>{a.average}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <ul className="list section">
            {mocks.map((m) => (
              <li key={m.id} className="item">
                <div className="row-between">
                  <span className="item-title">{m.name}</span>
                  <span className="badge badge-primary">
                    {m.marksObtained} / {m.maxMarks} · {mockPercent(m)}%
                  </span>
                </div>
                <div className="item-meta">
                  <span>{formatDate(m.date)}</span>
                  {m.durationMin != null && <span>{formatMinutes(m.durationMin)}</span>}
                </div>
                {m.scores.length > 0 && (
                  <div className="table-scroll">
                    <table className="data">
                      <caption className="sr-only">Subject-wise marks for {m.name}</caption>
                      <thead>
                        <tr><th>Subject</th><th>Marks</th><th>%</th></tr>
                      </thead>
                      <tbody>
                        {m.scores.map((s) => (
                          <tr key={s.subjectId}>
                            <td>{subjectName(data, s.subjectId)}</td>
                            <td>{s.obtained} / {s.max}</td>
                            <td>{Math.round((s.obtained / s.max) * 1000) / 10}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {m.improveTopics && <div className="small"><strong>Needs improvement:</strong> {m.improveTopics}</div>}
                {m.notes && <div className="small"><strong>Notes:</strong> {m.notes}</div>}
                <div className="item-actions">
                  <button type="button" className="btn btn-sm" onClick={() => setModal({ kind: 'edit', mock: m })}>Edit</button>
                  <button type="button" className="btn btn-sm btn-ghost" onClick={() => setModal({ kind: 'delete', mock: m })}>Delete</button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
      {modal?.kind === 'add' && <MockForm onClose={close} />}
      {modal?.kind === 'edit' && <MockForm mock={modal.mock} onClose={close} />}
      {modal?.kind === 'delete' && (
        <ConfirmDialog
          title="Delete mock test?"
          message={`"${modal.mock.name}" will be permanently removed. This cannot be undone.`}
          confirmLabel="Delete"
          danger
          onCancel={close}
          onConfirm={() => {
            update((d) => deleteMock(d, modal.mock.id))
            notify('Mock test deleted.')
            close()
          }}
        />
      )}
    </>
  )
}
