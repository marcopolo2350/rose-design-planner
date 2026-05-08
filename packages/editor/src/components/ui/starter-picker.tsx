'use client'

import { Icon as IconifyIcon } from '@iconify/react'
import { useScene } from '@pascal-app/core'
import { MOODS, useViewer } from '@pascal-app/viewer'
import { useCallback, useEffect } from 'react'
import { cn } from '../../lib/utils'
import { applySceneGraphToEditor } from '../../lib/scene'
import {
  buildStarterScene,
  getStarterSceneAtmosphere,
  getStarterSceneSummary,
  STARTER_SCENE_ORDER,
  type StarterSceneId,
} from '../../lib/starter-scenes'
import useEditor from '../../store/use-editor'

const PICKER_DISMISSED_KEY = 'roses-outdoor-starter-picker-dismissed:v1'

/**
 * StarterPicker — first-run dialog that asks the user to pick a backyard
 * vibe before they see the empty editor. Each card loads a pre-composed
 * scene plus the matching mood (time of day + camera framing) so the
 * user lands inside a designed space, not a blank lawn.
 *
 * The picker:
 *  - opens automatically the first time the user visits an empty scene
 *  - can be dismissed via "Empty canvas" or the X
 *  - can be re-opened any time via the toolbar's Starter Scenes button
 *
 * "Has the user seen the picker before?" is stored in localStorage so
 * dismissal survives page reloads. The dismissal key is intentionally
 * separate from any of the editor's persisted state so we can change
 * it without affecting saved scenes.
 */
export function StarterPicker() {
  const open = useEditor((s) => s.isStarterPickerOpen)
  const setOpen = useEditor((s) => s.setStarterPickerOpen)
  const setTimeOfDay = useViewer((s) => s.setTimeOfDay)
  const requestCameraPreset = useViewer((s) => s.requestCameraPreset)

  const onClose = useCallback(() => {
    try {
      localStorage.setItem(PICKER_DISMISSED_KEY, '1')
    } catch {
      // Treat localStorage failures as non-fatal
    }
    setOpen(false)
  }, [setOpen])

  const handleLoad = useCallback(
    (id: StarterSceneId) => {
      const scene = buildStarterScene(id)
      applySceneGraphToEditor(scene)
      const atmosphere = getStarterSceneAtmosphere(id)
      const mood = atmosphere.mood ? MOODS[atmosphere.mood] : null
      const timeOfDay = mood?.timeOfDay ?? atmosphere.timeOfDay
      const cameraPreset = mood?.cameraPreset ?? atmosphere.cameraPreset
      if (timeOfDay) setTimeOfDay(timeOfDay)
      if (cameraPreset) {
        // Defer slightly so the scene mounts first and the camera tween
        // targets the actual content.
        setTimeout(() => requestCameraPreset(cameraPreset), 350)
      }
      onClose()
    },
    [setTimeOfDay, requestCameraPreset, onClose],
  )

  const handleEmptyCanvas = useCallback(() => {
    onClose()
  }, [onClose])

  if (!open) return null

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      role="dialog"
    >
      <div className="relative w-full max-w-3xl rounded-2xl border border-white/10 bg-neutral-950/95 p-6 shadow-2xl">
        <button
          aria-label="Close starter picker"
          className="absolute top-3.5 right-3.5 flex h-7 w-7 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/8 hover:text-white"
          onClick={handleEmptyCanvas}
          type="button"
        >
          <IconifyIcon height={14} icon="lucide:x" width={14} />
        </button>

        <div className="mb-5">
          <h2 className="font-semibold text-white text-xl">Pick a backyard vibe</h2>
          <p className="mt-1 text-sm text-white/60">
            Start from a designed space — you can rearrange anything.
          </p>
        </div>

        <div className="grid max-h-[60vh] grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
          {STARTER_SCENE_ORDER.map((id) => {
            const summary = getStarterSceneSummary(id)
            const mood = summary.mood ? MOODS[summary.mood] : null
            const icon = summary.icon ?? mood?.icon ?? 'lucide:circle'
            const tint = summary.tint ?? mood?.tint ?? 'text-white'
            const gradient =
              id === 'gardenRetreat'
                ? 'bg-gradient-to-br from-emerald-700/15 via-emerald-500/5 to-transparent'
                : id === 'resortPoolside'
                  ? 'bg-gradient-to-br from-amber-600/20 via-orange-500/8 to-transparent'
                  : id === 'firepitLounge'
                    ? 'bg-gradient-to-br from-rose-700/20 via-orange-700/8 to-transparent'
                    : id === 'modernEvening'
                      ? 'bg-gradient-to-br from-indigo-700/20 via-violet-700/8 to-transparent'
                      : id === 'outdoorKitchen'
                        ? 'bg-gradient-to-br from-orange-600/20 via-amber-500/5 to-transparent'
                        : id === 'compactBackyard'
                          ? 'bg-gradient-to-br from-sky-700/15 via-cyan-500/5 to-transparent'
                          : id === 'luxuryNighttime'
                            ? 'bg-gradient-to-br from-violet-700/25 via-indigo-500/8 to-transparent'
                            : ''
            return (
              <button
                aria-label={`Load starter scene: ${summary.label}`}
                className={cn(
                  'group relative flex flex-col items-start gap-2 overflow-hidden rounded-xl border border-white/10 bg-neutral-900 p-4 text-left transition-all',
                  'hover:border-white/25 hover:bg-neutral-800/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30',
                )}
                key={id}
                onClick={() => handleLoad(id)}
                type="button"
              >
                <div className={cn('absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100', gradient)} />
                <div className="relative z-10 flex items-center gap-2">
                  <span
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-black/30',
                      tint,
                    )}
                  >
                    <IconifyIcon height={16} icon={icon} width={16} />
                  </span>
                  <span className="font-medium text-base text-white">{summary.label}</span>
                </div>
                <p className="relative z-10 text-[12.5px] text-white/65 leading-relaxed">
                  {summary.description}
                </p>
              </button>
            )
          })}
        </div>

        <div className="mt-5 flex items-center justify-between">
          <button
            className="text-sm text-white/55 transition-colors hover:text-white"
            onClick={handleEmptyCanvas}
            type="button"
          >
            or start from an empty canvas
          </button>
          <span className="text-[11px] text-white/35">
            You can swap vibes any time from the toolbar.
          </span>
        </div>
      </div>
    </div>
  )
}

/**
 * Drives the auto-open behavior on first run with an empty scene.
 * Mount this once near the top of the editor (alongside StarterPicker).
 *
 * Auto-opens when:
 *   1. The user has not previously dismissed the picker, AND
 *   2. The current scene has no slabs and no items
 *
 * After dismissal the picker is silent on subsequent visits unless the
 * user opens it manually via the toolbar.
 */
export function StarterPickerAutoOpener() {
  const setOpen = useEditor((s) => s.setStarterPickerOpen)
  const isOpen = useEditor((s) => s.isStarterPickerOpen)
  const nodes = useScene((s) => s.nodes)

  useEffect(() => {
    if (typeof window === 'undefined' || isOpen) return

    let dismissed = false
    try {
      dismissed = localStorage.getItem(PICKER_DISMISSED_KEY) === '1'
    } catch {
      // Treat storage failures as "not dismissed"
    }
    if (dismissed) return

    const values = Object.values(nodes ?? {})
    const hasContent = values.some(
      (n: any) => n?.type === 'slab' || n?.type === 'item',
    )
    if (hasContent) return

    const t = setTimeout(() => setOpen(true), 600)
    return () => clearTimeout(t)
  }, [nodes, isOpen, setOpen])

  return null
}
