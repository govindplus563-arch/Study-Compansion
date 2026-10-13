import { DEFAULT_INTERVALS, SCHEMA_VERSION, STARTER_SUBJECTS } from './constants'
import { newId, nowIso } from '../utils/ids'

export function defaultSettings() {
  return {
    dailyTargetMinutes: 240,
    examAttempt: { label: '', examDate: '' },
    revisionIntervals: { ...DEFAULT_INTERVALS },
    lastExportedAt: null,
  }
}

export function createEmptyData() {
  return {
    schemaVersion: SCHEMA_VERSION,
    settings: defaultSettings(),
    subjects: [],
    chapters: [],
    tasks: [],
    lectures: [],
    revisions: [],
    mistakes: [],
    mockTests: [],
  }
}

export function createStarterData() {
  const data = createEmptyData()
  data.subjects = STARTER_SUBJECTS.map((name, i) => ({
    id: newId('sub'),
    name,
    order: i + 1,
    archived: false,
    createdAt: nowIso(),
  }))
  return data
}

// Fill in optional settings that older/partial files may lack.
export function normalizeData(data) {
  const base = defaultSettings()
  const s = data.settings || {}
  return {
    ...data,
    schemaVersion: SCHEMA_VERSION,
    settings: {
      ...base,
      ...s,
      examAttempt: { ...base.examAttempt, ...(s.examAttempt || {}) },
      revisionIntervals: { ...base.revisionIntervals, ...(s.revisionIntervals || {}) },
    },
  }
}
