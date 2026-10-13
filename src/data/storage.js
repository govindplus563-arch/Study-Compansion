import { CORRUPT_KEY, PREVIOUS_KEY, STORAGE_KEY } from './constants'
import { createStarterData, normalizeData } from './defaults'
import { migrate } from './migrations'
import { validateData } from './validateData'

const STORAGE_ERROR =
  'Could not save to this browser (storage may be full or blocked, for example in a private window). Export a backup now.'

// Turns stored text into trusted data, or explains why not.
export function parseStoredData(text) {
  let raw
  try {
    raw = JSON.parse(text)
  } catch {
    return { error: 'The saved data is not valid JSON.' }
  }
  const migrated = migrate(raw)
  if (migrated.error) return { error: migrated.error }
  const problems = validateData(migrated.data)
  if (problems.length) return { error: problems.slice(0, 3).join(' ') }
  return { data: normalizeData(migrated.data) }
}

// Loads saved data. If it is unreadable we keep a raw copy, never overwrite it silently.
export function loadInitial() {
  let text = null
  try {
    text = localStorage.getItem(STORAGE_KEY)
  } catch {
    return {
      data: createStarterData(),
      warning: 'This browser blocks storage, so your changes will be lost when you close the tab. Use Export in Settings often.',
    }
  }
  if (text === null) return { data: createStarterData(), warning: null }

  const parsed = parseStoredData(text)
  if (parsed.data) return { data: parsed.data, warning: null }

  try {
    localStorage.setItem(CORRUPT_KEY, text)
  } catch {
    /* nothing more we can do */
  }
  return {
    data: createStarterData(),
    warning: `Your saved data could not be read (${parsed.error}). A raw copy was kept in this browser. You can import a backup in Settings.`,
  }
}

export function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    return { ok: true }
  } catch {
    return { ok: false, error: STORAGE_ERROR }
  }
}

export function savePrevious(data) {
  try {
    localStorage.setItem(PREVIOUS_KEY, JSON.stringify(data))
    return { ok: true }
  } catch {
    return { ok: false, error: 'Could not keep a safety copy of your current data, so nothing was changed.' }
  }
}

export function loadPrevious() {
  try {
    const text = localStorage.getItem(PREVIOUS_KEY)
    if (!text) return null
    const parsed = parseStoredData(text)
    return parsed.data || null
  } catch {
    return null
  }
}
