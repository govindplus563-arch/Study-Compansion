import { SCHEMA_VERSION } from './constants'

// Upgrades old data to the current shape. Only version 1 exists today;
// future versions add steps here (v1 -> v2 -> ...).
export function migrate(raw) {
  const v = raw?.schemaVersion
  if (typeof v !== 'number') return { error: 'The data has no schemaVersion, so it cannot be trusted.' }
  if (v > SCHEMA_VERSION) {
    return { error: `The data was made by a newer version of the app (schema ${v}). Please update the app first.` }
  }
  return { data: { ...raw, schemaVersion: SCHEMA_VERSION } }
}
