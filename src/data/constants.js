export const APP_ID = 'ca-companion'
export const SCHEMA_VERSION = 1
export const STORAGE_KEY = 'ca-companion:data'
export const PREVIOUS_KEY = 'ca-companion:data-before-import'
export const CORRUPT_KEY = 'ca-companion:unreadable-copy'

export const COLLECTIONS = ['subjects', 'chapters', 'tasks', 'lectures', 'revisions', 'mistakes', 'mockTests']

export const CHAPTER_STATUSES = ['Not Started', 'Learning', 'Practice', 'Revision', 'Completed']
export const PRIORITIES = ['High', 'Medium', 'Low']
export const TASK_TYPES = ['Lecture', 'Revision', 'Question Practice', 'Mock Test', 'Review']
export const LECTURE_STATUSES = ['Planned', 'In progress', 'Watched']
export const RECALL_LEVELS = ['poor', 'okay', 'good', 'strong']
export const RECALL_LABELS = { poor: 'Poor', okay: 'Okay', good: 'Good', strong: 'Strong' }
export const MISTAKE_CATEGORIES = [
  'Concept gap',
  'Forgotten provision or formula',
  'Calculation error',
  'Misread question',
  'Presentation issue',
  'Time-management issue',
]
export const ATTEMPT_RESULTS = ['correct', 'wrong']

// Simple, editable review gaps (in days) for each recall result.
export const DEFAULT_INTERVALS = { poor: 1, okay: 3, good: 7, strong: 14 }

// Starter list only. Verify the papers and syllabus for your attempt on icai.org.
export const STARTER_SUBJECTS = [
  'Advanced Accounting',
  'Corporate and Other Laws',
  'Taxation',
  'Cost and Management Accounting',
  'Auditing and Ethics',
  'Financial Management and Strategic Management',
]
