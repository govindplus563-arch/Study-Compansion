import { sum } from '../utils/numbers'

// Lecture progress and question progress are kept separate, and neither marks a chapter "Completed".
export function chapterStats(data, chapter) {
  const lectures = data.lectures.filter((l) => l.chapterId === chapter.id)
  const lecturesWatched = lectures.filter((l) => l.status === 'Watched').length
  const questionsDone = (chapter.questionsPracticed || 0) + sum(lectures, (l) => l.questionsPracticed)
  return {
    lectureCount: lectures.length,
    lecturesWatched,
    lecturesPlanned: chapter.lecturesPlanned || 0,
    questionsDone,
    questionsTarget: chapter.questionsTarget || 0,
    unresolvedMistakes: data.mistakes.filter((m) => m.chapterId === chapter.id && !m.resolved).length,
    openRevisions: data.revisions.filter((r) => r.chapterId === chapter.id && !r.archived).length,
  }
}

export function subjectStats(data, subjectId) {
  const chapters = data.chapters.filter((c) => c.subjectId === subjectId && !c.archived)
  return {
    chapters: chapters.length,
    completed: chapters.filter((c) => c.status === 'Completed').length,
  }
}
