import { APP_ID, SCHEMA_VERSION } from './constants'
import { normalizeData } from './defaults'
import { migrate } from './migrations'
import { validateData } from './validateData'
import { toDateStr } from '../utils/dates'

export function buildBackup(data) {
  return { app: APP_ID, schemaVersion: SCHEMA_VERSION, exportedAt: new Date().toISOString(), data }
}

export function backupFileName(date = new Date()) {
  return `ca-companion-backup-${toDateStr(date)}.json`
}

// Checks backup text without touching existing data.
export function parseBackup(text) {
  let file
  try {
    file = JSON.parse(text)
  } catch {
    return { errors: ['This file is not valid JSON. Choose a backup exported from CA Companion.'] }
  }
  if (!file || typeof file !== 'object' || file.app !== APP_ID || !file.data) {
    return { errors: ['This does not look like a CA Companion backup file.'] }
  }
  const migrated = migrate(file.data)
  if (migrated.error) return { errors: [migrated.error] }
  const errors = validateData(migrated.data)
  if (errors.length) return { errors }
  return { data: normalizeData(migrated.data), exportedAt: file.exportedAt || null }
}

export function countRecords(data) {
  return {
    Subjects: data.subjects.length,
    Chapters: data.chapters.length,
    Tasks: data.tasks.length,
    Lectures: data.lectures.length,
    Revisions: data.revisions.length,
    Mistakes: data.mistakes.length,
    'Mock tests': data.mockTests.length,
  }
}

export function downloadBackup(data) {
  const blob = new Blob([JSON.stringify(buildBackup(data), null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = backupFileName()
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
