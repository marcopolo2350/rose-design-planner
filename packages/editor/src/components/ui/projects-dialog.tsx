'use client'

import { Icon as IconifyIcon } from '@iconify/react'
import { useEffect, useState } from 'react'
import { applySceneGraphToEditor } from '../../lib/scene'
import {
  deleteProject,
  formatSaveTimestamp,
  getProject,
  listProjects,
  renameProject,
  type SavedProject,
  setCurrentProjectId,
} from '../../lib/projects'
import { showToast } from '../../lib/use-toast'
import useEditor from '../../store/use-editor'

/**
 * "My Projects" dialog — shows the saved-project list with Load / Rename
 * / Delete actions for each entry. Open via useEditor.isProjectsDialogOpen.
 */
export function ProjectsDialog() {
  const open = useEditor((s) => s.isProjectsDialogOpen)
  const setOpen = useEditor((s) => s.setProjectsDialogOpen)
  const [projects, setProjects] = useState<SavedProject[]>([])
  const [renameTargetId, setRenameTargetId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  useEffect(() => {
    if (open) {
      setProjects(listProjects())
      setRenameTargetId(null)
    }
  }, [open])

  if (!open) return null

  const refresh = () => setProjects(listProjects())

  const handleLoad = (p: SavedProject) => {
    const fresh = getProject(p.id)
    if (!fresh) {
      showToast('Project not found', 'error')
      refresh()
      return
    }
    applySceneGraphToEditor(fresh.scene, { resetToSelect: true })
    setCurrentProjectId(fresh.id)
    showToast(`Loaded "${fresh.name}"`, 'success')
    setOpen(false)
  }

  const handleDelete = (p: SavedProject) => {
    if (
      typeof window !== 'undefined' &&
      !window.confirm(`Delete project "${p.name}"? This cannot be undone.`)
    ) {
      return
    }
    deleteProject(p.id)
    showToast(`Deleted "${p.name}"`, 'default')
    refresh()
  }

  const startRename = (p: SavedProject) => {
    setRenameTargetId(p.id)
    setRenameValue(p.name)
  }

  const commitRename = (p: SavedProject) => {
    if (!renameValue.trim() || renameValue.trim() === p.name) {
      setRenameTargetId(null)
      return
    }
    const updated = renameProject(p.id, renameValue.trim())
    setRenameTargetId(null)
    if (updated) {
      showToast(`Renamed to "${updated.name}"`, 'success')
      refresh()
    } else {
      showToast('Could not rename project', 'error')
    }
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      onClick={() => setOpen(false)}
      role="dialog"
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-white/10 bg-neutral-950 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          aria-label="Close projects dialog"
          className="absolute top-3.5 right-3.5 flex h-7 w-7 items-center justify-center rounded-full text-white/55 transition-colors hover:bg-white/8 hover:text-white"
          onClick={() => setOpen(false)}
          type="button"
        >
          <IconifyIcon height={14} icon="lucide:x" width={14} />
        </button>

        <h2 className="font-semibold text-white text-xl">My projects</h2>
        <p className="mt-1 text-[13px] text-white/65">
          Saved locally on this device. No accounts, no cloud.
        </p>

        <div className="mt-5 max-h-[60vh] overflow-y-auto pr-1">
          {projects.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center text-white/55">
              <IconifyIcon height={32} icon="lucide:folder-open" width={32} />
              <p className="text-[13px]">No saved projects yet.</p>
              <p className="text-[12px] text-white/40">
                Click <span className="font-semibold">Save Progress</span> in the toolbar to save your current scene.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {projects.map((p) => (
                <li
                  className="rounded-xl border border-white/8 bg-white/3 p-3"
                  key={p.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      {renameTargetId === p.id ? (
                        <input
                          autoFocus
                          className="w-full rounded-md border border-white/15 bg-black/30 px-2 py-1 text-[13px] text-white outline-none focus:border-white/40"
                          onBlur={() => commitRename(p)}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              commitRename(p)
                            } else if (e.key === 'Escape') {
                              setRenameTargetId(null)
                            }
                          }}
                          value={renameValue}
                        />
                      ) : (
                        <button
                          className="truncate text-left font-medium text-[13px] text-white hover:text-white/90"
                          onClick={() => startRename(p)}
                          title="Click to rename"
                          type="button"
                        >
                          {p.name}
                        </button>
                      )}
                      <span className="text-[11px] text-white/45">
                        Saved {formatSaveTimestamp(p.savedAt)}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        aria-label={`Load ${p.name}`}
                        className="rounded-md border border-emerald-400/35 bg-emerald-500/12 px-2.5 py-1 font-medium text-[12px] text-emerald-200 transition-colors hover:bg-emerald-500/22"
                        onClick={() => handleLoad(p)}
                        type="button"
                      >
                        Load
                      </button>
                      <button
                        aria-label={`Delete ${p.name}`}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-white/45 transition-colors hover:bg-red-500/15 hover:text-red-300"
                        onClick={() => handleDelete(p)}
                        type="button"
                      >
                        <IconifyIcon height={13} icon="lucide:trash-2" width={13} />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
