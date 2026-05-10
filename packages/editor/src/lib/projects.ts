'use client'

/**
 * Local-first named-project storage.
 *
 * The autosave hook persists the *current* working scene to
 * `pascal-editor-scene` on every change. That's the "live" state — what
 * the user reloads back into. This module sits ABOVE that and gives the
 * user named savepoints they can return to:
 *
 *   - "Save Progress" copies the current scene into a named entry in
 *     the projects list. If there's already a current project loaded,
 *     it overwrites that entry. Otherwise it creates a new entry and
 *     sets it as current.
 *   - "Load Project" copies a named project's scene back into the live
 *     scene state.
 *   - "New Project" wipes the live scene and clears the current pointer.
 *   - "Delete Project" removes a named entry.
 *
 * Storage layout (localStorage):
 *   roses-outdoor-projects:v1            JSON array of SavedProject
 *   roses-outdoor-current-project:v1     id of the currently-loaded
 *                                        named project, or absent if
 *                                        the user is in an unsaved
 *                                        scratch session.
 *
 * Everything here is local-first. No accounts, no cloud, no sync.
 */

import type { SceneGraph } from './scene'

const PROJECTS_KEY = 'roses-outdoor-projects:v1'
const CURRENT_KEY = 'roses-outdoor-current-project:v1'

export type SavedProject = {
  id: string
  name: string
  savedAt: number
  scene: SceneGraph
}

function makeId(): string {
  // 12-char base36 id, sufficient for a user-local project list
  return Math.random().toString(36).slice(2, 14)
}

export function listProjects(): SavedProject[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(PROJECTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    // Sort newest first so the picker shows recent saves at the top
    return parsed
      .filter(
        (p): p is SavedProject =>
          typeof p === 'object' &&
          p !== null &&
          typeof p.id === 'string' &&
          typeof p.name === 'string' &&
          typeof p.savedAt === 'number' &&
          typeof p.scene === 'object',
      )
      .sort((a, b) => b.savedAt - a.savedAt)
  } catch {
    return []
  }
}

function writeProjects(projects: SavedProject[]) {
  try {
    window.localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects))
  } catch {
    // Storage quota / private mode — surface to caller via thrown error
    throw new Error('Could not write projects to local storage')
  }
}

export function getCurrentProjectId(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(CURRENT_KEY)
  } catch {
    return null
  }
}

export function setCurrentProjectId(id: string | null) {
  if (typeof window === 'undefined') return
  try {
    if (id) {
      window.localStorage.setItem(CURRENT_KEY, id)
    } else {
      window.localStorage.removeItem(CURRENT_KEY)
    }
  } catch {
    // Non-fatal
  }
}

/** Create a new named project from the given scene. Returns the saved project. */
export function createProject(name: string, scene: SceneGraph): SavedProject {
  const trimmed = name.trim() || 'Untitled'
  const project: SavedProject = {
    id: makeId(),
    name: trimmed,
    savedAt: Date.now(),
    scene,
  }
  const all = listProjects()
  writeProjects([project, ...all])
  setCurrentProjectId(project.id)
  return project
}

/** Update an existing project's scene + savedAt. Returns the updated project. */
export function updateProject(id: string, scene: SceneGraph): SavedProject | null {
  const all = listProjects()
  const idx = all.findIndex((p) => p.id === id)
  if (idx === -1) return null
  const updated: SavedProject = { ...all[idx]!, scene, savedAt: Date.now() }
  all[idx] = updated
  writeProjects(all)
  return updated
}

/** Rename an existing project. */
export function renameProject(id: string, name: string): SavedProject | null {
  const trimmed = name.trim()
  if (!trimmed) return null
  const all = listProjects()
  const idx = all.findIndex((p) => p.id === id)
  if (idx === -1) return null
  const updated: SavedProject = { ...all[idx]!, name: trimmed }
  all[idx] = updated
  writeProjects(all)
  return updated
}

export function getProject(id: string): SavedProject | null {
  return listProjects().find((p) => p.id === id) ?? null
}

export function deleteProject(id: string) {
  const all = listProjects().filter((p) => p.id !== id)
  writeProjects(all)
  if (getCurrentProjectId() === id) {
    setCurrentProjectId(null)
  }
}

/**
 * Save current scene as either a new project or an update to the current
 * one. If `forceNewName` is provided, always creates a new entry; otherwise
 * updates the current project if one is loaded, else creates a new one
 * with `defaultName`.
 *
 * Returns the saved project (caller can use the name + id for confirmation).
 */
export function saveCurrentScene(
  scene: SceneGraph,
  opts?: { defaultName?: string; forceNewName?: string },
): SavedProject {
  const newName = opts?.forceNewName
  if (newName) {
    return createProject(newName, scene)
  }
  const currentId = getCurrentProjectId()
  if (currentId) {
    const updated = updateProject(currentId, scene)
    if (updated) return updated
    // Current id pointed to a deleted project — fall through to create new
  }
  return createProject(opts?.defaultName || 'Untitled', scene)
}

export function formatSaveTimestamp(ts: number): string {
  const date = new Date(ts)
  const now = Date.now()
  const diffSec = Math.floor((now - ts) / 1000)
  if (diffSec < 60) return 'just now'
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}
