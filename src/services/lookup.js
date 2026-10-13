export const findById = (list, id) => list.find((x) => x.id === id) || null

export function subjectName(data, id) {
  const s = findById(data.subjects, id)
  if (!s) return ''
  return s.archived ? `${s.name} (archived)` : s.name
}

export function chapterName(data, id) {
  const c = findById(data.chapters, id)
  if (!c) return ''
  return c.archived ? `${c.name} (archived)` : c.name
}

export const bySubjectOrder = (a, b) => (a.order || 0) - (b.order || 0)

export const activeSubjects = (data) => data.subjects.filter((s) => !s.archived).sort(bySubjectOrder)

// Chapters of one subject. Archived ones are included only when asked (or when still selected).
export function chaptersOf(data, subjectId, { includeArchived = false, keepId = null } = {}) {
  return data.chapters
    .filter((c) => c.subjectId === subjectId && (includeArchived || !c.archived || c.id === keepId))
    .sort(bySubjectOrder)
}

// "Chapter — Subject" style label for a record that may link to either or neither.
export function contextLabel(data, { subjectId, chapterId }) {
  const chapter = chapterId ? findById(data.chapters, chapterId) : null
  const sid = subjectId || chapter?.subjectId
  const parts = []
  if (sid) parts.push(subjectName(data, sid))
  if (chapter) parts.push(chapterName(data, chapter.id))
  return parts.join(' › ')
}
