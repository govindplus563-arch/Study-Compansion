# Data model (schema version 1)

Everything is one JSON object saved under the key `ca-companion:data` in `localStorage`, and exported as a backup file `{ app: "ca-companion", schemaVersion, exportedAt, data }`.

## Rules
- Every record has a stable random `id` (e.g. `sub_…`). Names are never used as keys.
- Calendar days are local `YYYY-MM-DD` strings (no time-zone shifts). Timestamps (`createdAt`, `exportedAt`) are ISO strings.
- Records with history are archived, not deleted (subjects, chapters, revisions). Revision `history` and mistake `attempts` are append-only.
- Relationships use ids: `chapter.subjectId`, `lecture.chapterId`, `task.subjectId/chapterId` (optional), etc.
- `validateData` checks every list, enum, date, number and reference before data is loaded or imported.

## Entities
| Entity | Main fields |
|---|---|
| settings | dailyTargetMinutes, examAttempt {label, examDate}, revisionIntervals {poor, okay, good, strong}, lastExportedAt |
| subjects | id, name, order, archived |
| chapters | id, subjectId, name, order, status, priority, lecturesPlanned, questionsTarget, questionsPracticed, archived |
| lectures | id, subjectId, chapterId, title, date, plannedMin, watchedMin, status (Planned/In progress/Watched), notesDone, questionsPracticed, nextAction |
| tasks | id, type, title, subjectId?, chapterId?, date, plannedMin, actualMin, done, doneOn |
| revisions | id, topic, subjectId?, chapterId?, nextDate, history[{date, confidence 1-5, recall, notes, nextDate}], archived |
| mistakes | id, subjectId?, chapterId?, reference, category, whatWentWrong, correctApproach, recordedOn, nextPracticeDate, resolved, resolvedOn, attempts[{date, result, note}] |
| mockTests | id, name, date, durationMin, marksObtained, maxMarks, scores[{subjectId, obtained, max}], notes, improveTopics |

## Derived (never stored)
Chapter lecture progress, question progress, weekly review numbers, dashboard statistics, revision buckets (overdue / today / upcoming), mock-test trends.

## Moving to a database later
Only `src/data/storage.js` and `src/data/store.jsx` read/write persistence. The collections map directly to tables, and `schemaVersion` + `src/data/migrations.js` handle upgrades.
