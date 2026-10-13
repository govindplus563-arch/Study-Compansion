import { Field } from './Field'
import { activeSubjects, chaptersOf, subjectName } from '../services/lookup'

// Two linked dropdowns: choosing a subject limits the chapter list to that subject.
export default function SubjectChapterPicker({ data, subjectId, chapterId, onChange, errors = {}, subjectRequired = false, chapterRequired = false }) {
  const subjects = activeSubjects(data)
  const keepSubject = data.subjects.find((s) => s.id === subjectId && s.archived)
  const chapters = subjectId ? chaptersOf(data, subjectId, { keepId: chapterId }) : []
  return (
    <div className="grid-2">
      <Field label={`Subject${subjectRequired ? '' : ' (optional)'}`} error={errors.subjectId}>
        <select value={subjectId || ''} onChange={(e) => onChange({ subjectId: e.target.value, chapterId: '' })}>
          <option value="">{subjectRequired ? 'Choose a subject' : 'No subject'}</option>
          {keepSubject && <option value={keepSubject.id}>{subjectName(data, keepSubject.id)}</option>}
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label={`Chapter${chapterRequired ? '' : ' (optional)'}`} error={errors.chapterId}>
        <select value={chapterId || ''} disabled={!subjectId} onChange={(e) => onChange({ subjectId, chapterId: e.target.value })}>
          <option value="">{subjectId ? (chapterRequired ? 'Choose a chapter' : 'No chapter') : 'Choose a subject first'}</option>
          {chapters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.archived ? ' (archived)' : ''}
            </option>
          ))}
        </select>
      </Field>
    </div>
  )
}
