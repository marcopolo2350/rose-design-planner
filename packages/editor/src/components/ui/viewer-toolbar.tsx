'use client'

import { Icon as IconifyIcon } from '@iconify/react'
import { useScene } from '@pascal-app/core'
import {
  CAMERA_PRESET_ORDER,
  CAMERA_PRESETS,
  MOOD_ORDER,
  MOODS,
  TIME_OF_DAY_LABELS,
  TIME_OF_DAY_ORDER,
  useViewer,
} from '@pascal-app/viewer'
import { Check, ChevronsLeft, ChevronsRight, Columns2, Eye, Footprints, Moon, Sparkles, Sun } from 'lucide-react'
import { useCallback } from 'react'
import { useIsMobile } from '../../hooks/use-mobile'
import { assetPath } from '../../lib/asset-path'
import {
  getCurrentProjectId,
  getProject,
  saveCurrentScene,
  setCurrentProjectId,
} from '../../lib/projects'
import { applySceneGraphToEditor } from '../../lib/scene'
import { showToast } from '../../lib/use-toast'
import {
  buildStarterScene,
  getStarterSceneAtmosphere,
  getStarterSceneSummary,
  STARTER_SCENE_ORDER,
} from '../../lib/starter-scenes'
import { cn } from '../../lib/utils'
import useEditor from '../../store/use-editor'
import type { GridSnapStep, ViewMode } from '../../store/use-editor'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './primitives/dropdown-menu'
import { useSidebarStore } from './primitives/sidebar'
import { Tooltip, TooltipContent, TooltipTrigger } from './primitives/tooltip'

// ── Shared styles ───────────────────────────────────────────────────────────

/** Container for a group of buttons — no padding, overflow-hidden clips children flush. */
const TOOLBAR_CONTAINER =
  'inline-flex h-8 items-stretch overflow-hidden rounded-xl border border-border bg-background/90 shadow-2xl backdrop-blur-md'

/** Ghost button inside a container — flush edges, no individual border/radius. */
const TOOLBAR_BTN =
  'flex w-8 items-center justify-center text-muted-foreground/80 transition-colors hover:bg-white/8 hover:text-foreground/90 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60'

// ── View mode segmented control ─────────────────────────────────────────────

const VIEW_MODES: { id: ViewMode; label: string; icon: React.ReactNode }[] = [
  {
    id: '3d',
    label: '3D',
    icon: <img alt="" className="h-3.5 w-3.5 object-contain" src={assetPath('/icons/building.png')} />,
  },
  {
    id: '2d',
    label: '2D',
    icon: <img alt="" className="h-3.5 w-3.5 object-contain" src={assetPath('/icons/blueprint.png')} />,
  },
  {
    id: 'split',
    label: 'Split',
    icon: <Columns2 className="h-3 w-3" />,
  },
]

function ViewModeControl() {
  const viewMode = useEditor((s) => s.viewMode)
  const setViewMode = useEditor((s) => s.setViewMode)

  return (
    <div className={TOOLBAR_CONTAINER}>
      {VIEW_MODES.map((mode) => {
        const isActive = viewMode === mode.id
        return (
          <button
            className={cn(
              'flex items-center justify-center gap-1.5 px-2.5 font-medium text-xs transition-colors',
              isActive
                ? 'bg-white/10 text-foreground'
                : 'text-muted-foreground/70 hover:bg-white/8 hover:text-muted-foreground',
            )}
            key={mode.id}
            onClick={() => setViewMode(mode.id)}
            type="button"
          >
            {mode.icon}
            <span>{mode.label}</span>
          </button>
        )
      })}
    </div>
  )
}

// ── Collapse sidebar button ─────────────────────────────────────────────────

function CollapseSidebarButton() {
  const isCollapsed = useSidebarStore((s) => s.isCollapsed)
  const setIsCollapsed = useSidebarStore((s) => s.setIsCollapsed)

  const toggle = useCallback(() => {
    setIsCollapsed(!isCollapsed)
  }, [isCollapsed, setIsCollapsed])

  return (
    <div className={TOOLBAR_CONTAINER}>
      <button
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className={TOOLBAR_BTN}
        onClick={toggle}
        title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        type="button"
      >
        {isCollapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
      </button>
    </div>
  )
}

// ── Right toolbar buttons ───────────────────────────────────────────────────

function WalkthroughButton() {
  const isFirstPersonMode = useEditor((s) => s.isFirstPersonMode)
  const setFirstPersonMode = useEditor((s) => s.setFirstPersonMode)

  const toggle = () => {
    setFirstPersonMode(!isFirstPersonMode)
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          aria-label="Toggle Walkthrough Mode"
          className={cn(
            TOOLBAR_BTN,
            isFirstPersonMode && 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/20',
          )}
          onClick={toggle}
          type="button"
        >
          <Footprints className="h-4 w-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">Walkthrough</TooltipContent>
    </Tooltip>
  )
}

function UnitToggle() {
  const unit = useViewer((s) => s.unit)
  const setUnit = useViewer((s) => s.setUnit)

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          aria-label={`Switch units to ${unit === 'metric' ? 'imperial' : 'metric'}`}
          className={TOOLBAR_BTN}
          onClick={() => setUnit(unit === 'metric' ? 'imperial' : 'metric')}
          type="button"
        >
          <span className="font-semibold text-[10px]">{unit === 'metric' ? 'm' : 'ft'}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {unit === 'metric' ? 'Metric (m)' : 'Imperial (ft)'}
      </TooltipContent>
    </Tooltip>
  )
}

function ThemeToggle() {
  const theme = useViewer((s) => s.theme)
  const setTheme = useViewer((s) => s.setTheme)

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          className={cn(TOOLBAR_BTN, theme === 'dark' ? 'text-indigo-400/60' : 'text-amber-400/60')}
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          type="button"
        >
          {theme === 'dark' ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{theme === 'dark' ? 'Dark' : 'Light'}</TooltipContent>
    </Tooltip>
  )
}

// ── Level mode toggle ───────────────────────────────────────────────────────

const levelModeOrder = ['stacked', 'exploded', 'solo'] as const
const levelModeLabels: Record<string, string> = {
  manual: 'Stack',
  stacked: 'Stack',
  exploded: 'Exploded',
  solo: 'Solo',
}

const gridSnapOrder: GridSnapStep[] = [0.5, 0.25, 0.1, 0.05]
const gridSnapLabels: Record<GridSnapStep, string> = {
  0.5: '0.50',
  0.25: '0.25',
  0.1: '0.10',
  0.05: '0.05',
}

function formatGridSnapStep(step: GridSnapStep): string {
  return gridSnapLabels[step]
}

function LevelModeToggle() {
  const levelMode = useViewer((s) => s.levelMode)
  const setLevelMode = useViewer((s) => s.setLevelMode)

  const cycle = () => {
    if (levelMode === 'manual') {
      setLevelMode('stacked')
      return
    }
    const idx = levelModeOrder.indexOf(levelMode as (typeof levelModeOrder)[number])
    const next = levelModeOrder[(idx + 1) % levelModeOrder.length]
    if (next) setLevelMode(next)
  }

  const isDefault = levelMode === 'stacked' || levelMode === 'manual'

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          aria-label={`Set level view to ${levelModeLabels[levelMode] ?? 'Stack'}`}
          className={cn(
            TOOLBAR_BTN,
            'w-auto gap-1.5 px-2.5',
            !isDefault && 'bg-white/10 text-foreground/90',
          )}
          onClick={cycle}
          type="button"
        >
          {levelMode === 'solo' ? (
            <IconifyIcon height={14} icon="lucide:diamond" width={14} />
          ) : levelMode === 'exploded' ? (
            <IconifyIcon height={14} icon="charm:stack-pop" width={14} />
          ) : (
            <IconifyIcon height={14} icon="charm:stack-push" width={14} />
          )}
          <span className="font-medium text-xs">{levelModeLabels[levelMode] ?? 'Stack'}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        Levels: {levelMode === 'manual' ? 'Manual' : levelModeLabels[levelMode]}
      </TooltipContent>
    </Tooltip>
  )
}

function GridSnapToggle() {
  const gridSnapStep = useEditor((s) => s.gridSnapStep)
  const setGridSnapStep = useEditor((s) => s.setGridSnapStep)

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button
              aria-label="Open grid snap options"
              className={cn(TOOLBAR_BTN, 'w-auto gap-1.5 px-2.5')}
              type="button"
            >
              <IconifyIcon height={14} icon="lucide:grid-2x2" width={14} />
              <span className="font-medium text-xs">{formatGridSnapStep(gridSnapStep)}</span>
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">Grid snap: {formatGridSnapStep(gridSnapStep)}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="center" side="bottom">
        {gridSnapOrder.map((step) => {
          const isActive = step === gridSnapStep
          return (
            <DropdownMenuItem key={step} onSelect={() => setGridSnapStep(step)}>
              <span className="flex min-w-12 items-center justify-between gap-3">
                <span>{formatGridSnapStep(step)}</span>
                {isActive ? <Check className="h-3.5 w-3.5" /> : <span className="h-3.5 w-3.5" />}
              </span>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ── Wall mode toggle ────────────────────────────────────────────────────────

const wallModeOrder = ['cutaway', 'up', 'down'] as const
const wallModeConfig: Record<string, { icon: string; label: string }> = {
  up: { icon: assetPath('/icons/room.png'), label: 'Full height' },
  cutaway: { icon: assetPath('/icons/wallcut.png'), label: 'Cutaway' },
  down: { icon: assetPath('/icons/walllow.png'), label: 'Low' },
}

function WallModeToggle() {
  const wallMode = useViewer((s) => s.wallMode)
  const setWallMode = useViewer((s) => s.setWallMode)

  const cycle = () => {
    const idx = wallModeOrder.indexOf(wallMode as (typeof wallModeOrder)[number])
    const next = wallModeOrder[(idx + 1) % wallModeOrder.length]
    if (next) setWallMode(next)
  }

  const config = wallModeConfig[wallMode] ?? wallModeConfig.cutaway!

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          aria-label={`Set wall view to ${config.label}`}
          className={cn(
            TOOLBAR_BTN,
            'w-auto gap-1.5 px-2.5',
            wallMode !== 'cutaway'
              ? 'bg-white/10'
              : 'opacity-60 grayscale hover:opacity-100 hover:grayscale-0',
          )}
          onClick={cycle}
          type="button"
        >
          <img alt={config.label} className="h-4 w-4 object-contain" src={config.icon} />
          <span className="font-medium text-xs">{config.label}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">Walls: {config.label}</TooltipContent>
    </Tooltip>
  )
}

// ── Camera mode toggle ──────────────────────────────────────────────────────

function CameraModeToggle() {
  const cameraMode = useViewer((s) => s.cameraMode)
  const setCameraMode = useViewer((s) => s.setCameraMode)

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          aria-label={`Switch to ${cameraMode === 'perspective' ? 'orthographic' : 'perspective'} camera`}
          className={cn(
            TOOLBAR_BTN,
            cameraMode === 'orthographic' && 'bg-white/10 text-foreground/90',
          )}
          onClick={() =>
            setCameraMode(cameraMode === 'perspective' ? 'orthographic' : 'perspective')
          }
          type="button"
        >
          {cameraMode === 'perspective' ? (
            <IconifyIcon height={16} icon="icon-park-outline:perspective" width={16} />
          ) : (
            <IconifyIcon height={16} icon="vaadin:grid" width={16} />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {cameraMode === 'perspective' ? 'Perspective' : 'Orthographic'}
      </TooltipContent>
    </Tooltip>
  )
}

function PreviewButton() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          aria-label="Open Preview Mode"
          className="flex items-center gap-1.5 px-2.5 font-medium text-muted-foreground/80 text-xs transition-colors hover:bg-white/8 hover:text-foreground/90"
          onClick={() => useEditor.getState().setPreviewMode(true)}
          type="button"
        >
          <Eye className="h-3.5 w-3.5 shrink-0" />
          <span>Preview</span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">Preview mode</TooltipContent>
    </Tooltip>
  )
}

// ── Outdoor: time of day pill ───────────────────────────────────────────────

const TIME_OF_DAY_ICON: Record<string, string> = {
  day: 'lucide:sun',
  goldenHour: 'lucide:sunset',
  dusk: 'lucide:cloud-moon',
  evening: 'lucide:moon-star',
}

const TIME_OF_DAY_TINT: Record<string, string> = {
  day: 'text-sky-300',
  goldenHour: 'text-amber-300',
  dusk: 'text-rose-300',
  evening: 'text-indigo-300',
}

function TimeOfDayPill() {
  const outdoorMode = useViewer((s) => s.outdoorMode)
  const timeOfDay = useViewer((s) => s.timeOfDay)
  const setTimeOfDay = useViewer((s) => s.setTimeOfDay)
  const isMobile = useIsMobile()

  if (!outdoorMode || isMobile) return null

  const cycle = () => {
    const idx = TIME_OF_DAY_ORDER.indexOf(timeOfDay)
    const next = TIME_OF_DAY_ORDER[(idx + 1) % TIME_OF_DAY_ORDER.length]
    if (next) setTimeOfDay(next)
  }

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button
              aria-label={`Time of day: ${TIME_OF_DAY_LABELS[timeOfDay]}`}
              className={cn(TOOLBAR_BTN, 'w-auto gap-1.5 px-2.5')}
              onContextMenu={(e) => {
                e.preventDefault()
                cycle()
              }}
              type="button"
            >
              <IconifyIcon
                className={TIME_OF_DAY_TINT[timeOfDay]}
                height={14}
                icon={TIME_OF_DAY_ICON[timeOfDay] ?? 'lucide:sun'}
                width={14}
              />
              <span className="font-medium text-xs">{TIME_OF_DAY_LABELS[timeOfDay]}</span>
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          Time of day · right-click to cycle
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="center" side="bottom">
        {TIME_OF_DAY_ORDER.map((time) => {
          const isActive = time === timeOfDay
          return (
            <DropdownMenuItem key={time} onSelect={() => setTimeOfDay(time)}>
              <span className="flex min-w-[120px] items-center justify-between gap-3">
                <span className="flex items-center gap-2">
                  <IconifyIcon
                    className={TIME_OF_DAY_TINT[time]}
                    height={14}
                    icon={TIME_OF_DAY_ICON[time] ?? 'lucide:sun'}
                    width={14}
                  />
                  <span>{TIME_OF_DAY_LABELS[time]}</span>
                </span>
                {isActive ? <Check className="h-3.5 w-3.5" /> : <span className="h-3.5 w-3.5" />}
              </span>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ── Outdoor: cinematic camera preset dropdown ───────────────────────────────

function CameraPresetMenu() {
  const outdoorMode = useViewer((s) => s.outdoorMode)
  const requestCameraPreset = useViewer((s) => s.requestCameraPreset)
  const isMobile = useIsMobile()

  if (!outdoorMode || isMobile) return null

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button
              aria-label="Cinematic camera presets"
              className={cn(TOOLBAR_BTN, 'w-auto gap-1.5 px-2.5')}
              type="button"
            >
              <IconifyIcon height={14} icon="lucide:clapperboard" width={14} />
              <span className="font-medium text-xs">Views</span>
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">Cinematic camera views</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="center" side="bottom">
        {CAMERA_PRESET_ORDER.map((id) => {
          const preset = CAMERA_PRESETS[id]
          if (!preset) return null
          return (
            <DropdownMenuItem key={id} onSelect={() => requestCameraPreset(id)}>
              <span className="flex min-w-[200px] flex-col gap-0.5">
                <span className="font-medium">{preset.label}</span>
                <span className="text-[11px] text-muted-foreground/80">
                  {preset.description}
                </span>
              </span>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ── Outdoor: Projects dropdown (Save / Load / New / Reset) ─────────────────

function ProjectsMenu() {
  const outdoorMode = useViewer((s) => s.outdoorMode)
  const setProjectsDialogOpen = useEditor((s) => s.setProjectsDialogOpen)
  const setStarterPickerOpen = useEditor((s) => s.setStarterPickerOpen)
  const isMobile = useIsMobile()

  if (!outdoorMode || isMobile) return null

  const handleSaveProgress = () => {
    const scene = useScene.getState()
    const sceneGraph = {
      nodes: scene.nodes,
      rootNodeIds: scene.rootNodeIds,
    } as any
    const totalNodes = Object.keys(scene.nodes).length
    if (totalNodes === 0) {
      showToast('Nothing to save — load a starter or place items first', 'error')
      return
    }
    const currentId = getCurrentProjectId()
    const currentName = currentId ? getProject(currentId)?.name : null
    const defaultName = currentName || `Project ${new Date().toLocaleDateString()}`
    const inputName =
      typeof window !== 'undefined'
        ? window.prompt(
            currentName ? 'Update project name (or leave as-is):' : 'Name your project:',
            defaultName,
          )
        : null
    if (inputName === null) return // user cancelled
    try {
      const saved = saveCurrentScene(sceneGraph, {
        forceNewName: !currentId ? inputName : undefined,
        defaultName: inputName,
      })
      // If we already had a current project, update its name too if it changed
      if (currentId && currentName !== inputName.trim() && inputName.trim()) {
        // saveCurrentScene already updated savedAt; explicitly rename if needed
        // (cheap path: re-create — but we want to preserve id, so do it via the store)
      }
      showToast(`Saved as "${saved.name}"`, 'success')
    } catch {
      showToast('Could not save — local storage may be full', 'error')
    }
  }

  const handleNewProject = () => {
    if (
      typeof window !== 'undefined' &&
      !window.confirm(
        'Start a new project? Your current scene will be cleared. (Saved projects are not affected.)',
      )
    ) {
      return
    }
    applySceneGraphToEditor(null, { resetToSelect: true })
    setCurrentProjectId(null)
    showToast('New project started', 'success')
    // Open the picker so the user has a clear next step
    setStarterPickerOpen(true)
  }

  const handleResetScene = () => {
    if (
      typeof window !== 'undefined' &&
      !window.confirm(
        'Reset the current scene? Unsaved changes will be lost. Saved projects are not affected.',
      )
    ) {
      return
    }
    applySceneGraphToEditor(null, { resetToSelect: true })
    setCurrentProjectId(null)
    showToast('Scene reset', 'default')
  }

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button
              aria-label="Project actions"
              className={cn(TOOLBAR_BTN, 'w-auto gap-1.5 px-2.5')}
              type="button"
            >
              <IconifyIcon className="text-emerald-300" height={14} icon="lucide:folder" width={14} />
              <span className="font-medium text-xs">Projects</span>
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">Save, load, and manage projects</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="center" side="bottom">
        <DropdownMenuItem onSelect={handleSaveProgress}>
          <span className="flex min-w-[200px] items-center gap-2">
            <IconifyIcon className="text-emerald-300" height={14} icon="lucide:save" width={14} />
            <span className="font-medium">Save Progress</span>
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setProjectsDialogOpen(true)}>
          <span className="flex min-w-[200px] items-center gap-2">
            <IconifyIcon className="text-sky-300" height={14} icon="lucide:folder-open" width={14} />
            <span className="font-medium">My Projects…</span>
          </span>
        </DropdownMenuItem>
        <div className="my-1 h-px bg-white/8" />
        <DropdownMenuItem onSelect={handleNewProject}>
          <span className="flex min-w-[200px] items-center gap-2">
            <IconifyIcon className="text-amber-300" height={14} icon="lucide:file-plus" width={14} />
            <span className="font-medium">New Project</span>
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={handleResetScene}>
          <span className="flex min-w-[200px] items-center gap-2">
            <IconifyIcon className="text-red-300" height={14} icon="lucide:eraser" width={14} />
            <span className="font-medium">Reset Current Scene</span>
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ── Outdoor: Starter scenes dropdown ────────────────────────────────────────

function StarterScenesMenu() {
  const outdoorMode = useViewer((s) => s.outdoorMode)
  const setTimeOfDay = useViewer((s) => s.setTimeOfDay)
  const requestCameraPreset = useViewer((s) => s.requestCameraPreset)
  const setStarterPickerOpen = useEditor((s) => s.setStarterPickerOpen)
  const isMobile = useIsMobile()

  if (!outdoorMode || isMobile) return null

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button
              aria-label="Starter backyard scenes"
              className={cn(TOOLBAR_BTN, 'w-auto gap-1.5 px-2.5')}
              type="button"
            >
              <IconifyIcon className="text-emerald-300" height={14} icon="lucide:layout-template" width={14} />
              <span className="font-medium text-xs">Starters</span>
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">Pre-built backyard layouts</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="center" side="bottom">
        <DropdownMenuItem onSelect={() => setStarterPickerOpen(true)}>
          <span className="flex min-w-[220px] items-center gap-2">
            <IconifyIcon className="text-white/70" height={14} icon="lucide:wand-2" width={14} />
            <span className="font-medium">Open vibe picker…</span>
          </span>
        </DropdownMenuItem>
        <div className="my-1 h-px bg-white/8" />
        {STARTER_SCENE_ORDER.map((id) => {
          const summary = getStarterSceneSummary(id)
          const mood = summary.mood ? MOODS[summary.mood] : null
          const icon = summary.icon ?? mood?.icon ?? 'lucide:layout-template'
          const tint = summary.tint ?? mood?.tint
          return (
            <DropdownMenuItem
              key={id}
              onSelect={() => {
                applySceneGraphToEditor(buildStarterScene(id), { resetToSelect: true })
                // Starter is an editable copy — break any existing project
                // pointer so the next "Save Progress" prompts for a name.
                setCurrentProjectId(null)
                const atmosphere = getStarterSceneAtmosphere(id)
                const m = atmosphere.mood ? MOODS[atmosphere.mood] : null
                const tod = m?.timeOfDay ?? atmosphere.timeOfDay
                const cam = m?.cameraPreset ?? atmosphere.cameraPreset
                if (tod) setTimeOfDay(tod)
                if (cam) setTimeout(() => requestCameraPreset(cam), 350)
                showToast(`Started from "${summary.label}" — edit and save when ready`, 'success')
              }}
            >
              <span className="flex min-w-[220px] flex-col gap-0.5">
                <span className="flex items-center gap-2">
                  <IconifyIcon className={tint} height={14} icon={icon} width={14} />
                  <span className="font-medium">{summary.label}</span>
                </span>
                <span className="text-[11px] text-muted-foreground/80">
                  {summary.description}
                </span>
              </span>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ── Outdoor: Mood selector — bundles time-of-day + camera framing ──────────

function MoodMenu() {
  const outdoorMode = useViewer((s) => s.outdoorMode)
  const setTimeOfDay = useViewer((s) => s.setTimeOfDay)
  const requestCameraPreset = useViewer((s) => s.requestCameraPreset)
  const isMobile = useIsMobile()

  if (!outdoorMode || isMobile) return null

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button
              aria-label="Backyard mood presets"
              className={cn(TOOLBAR_BTN, 'w-auto gap-1.5 px-2.5')}
              type="button"
            >
              <IconifyIcon className="text-emerald-300" height={14} icon="lucide:wand-2" width={14} />
              <span className="font-medium text-xs">Mood</span>
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          One-click mood — time of day &amp; framing
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="center" side="bottom">
        {MOOD_ORDER.map((id) => {
          const mood = MOODS[id]
          if (!mood) return null
          return (
            <DropdownMenuItem
              key={id}
              onSelect={() => {
                setTimeOfDay(mood.timeOfDay)
                requestCameraPreset(mood.cameraPreset)
              }}
            >
              <span className="flex min-w-[220px] flex-col gap-0.5">
                <span className="flex items-center gap-2">
                  <IconifyIcon
                    className={mood.tint}
                    height={14}
                    icon={mood.icon}
                    width={14}
                  />
                  <span className="font-medium">{mood.label}</span>
                </span>
                <span className="text-[11px] text-muted-foreground/80">
                  {mood.description}
                </span>
              </span>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ── Help / tutorial — always visible, always discoverable ─────────────────

function HelpButton() {
  const setTutorialOpen = useEditor((s) => s.setTutorialOpen)
  const isMobile = useIsMobile()

  if (isMobile) return null // mobile uses the outdoor sheet's section

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          aria-label="How to use Rose's Outdoor Designs"
          className={cn(TOOLBAR_BTN, 'text-white/65 hover:text-white')}
          onClick={() => setTutorialOpen(true)}
          type="button"
        >
          <IconifyIcon height={14} icon="lucide:help-circle" width={14} />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">How to use</TooltipContent>
    </Tooltip>
  )
}

// ── Outdoor: Showcase Mode button — fades UI, warms lights, gives cinematic feel ──

function ShowcaseButton() {
  const outdoorMode = useViewer((s) => s.outdoorMode)
  const showcaseMode = useViewer((s) => s.showcaseMode)
  const setShowcaseMode = useViewer((s) => s.setShowcaseMode)
  const isMobile = useIsMobile()

  if (!outdoorMode || isMobile) return null

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          aria-label="Toggle Showcase Mode"
          className={cn(
            TOOLBAR_BTN,
            showcaseMode && 'bg-amber-400/15 text-amber-300 hover:bg-amber-400/25',
          )}
          onClick={() => setShowcaseMode(!showcaseMode)}
          type="button"
        >
          <Sparkles className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">Showcase mode</TooltipContent>
    </Tooltip>
  )
}

// ── Composed toolbar sections ───────────────────────────────────────────────

export function ViewerToolbarLeft() {
  return (
    <>
      <CollapseSidebarButton />
      <ViewModeControl />
    </>
  )
}

export function ViewerToolbarRight() {
  return (
    <div className={TOOLBAR_CONTAINER}>
      <ProjectsMenu />
      <StarterScenesMenu />
      <MoodMenu />
      <TimeOfDayPill />
      <CameraPresetMenu />
      <ShowcaseButton />
      <HelpButton />
      <div className="my-1.5 w-px bg-border/50" />
      <LevelModeToggle />
      <WallModeToggle />
      <GridSnapToggle />
      <div className="my-1.5 w-px bg-border/50" />
      <UnitToggle />
      <ThemeToggle />
      <CameraModeToggle />
      <div className="my-1.5 w-px bg-border/50" />
      <WalkthroughButton />
      <PreviewButton />
    </div>
  )
}
