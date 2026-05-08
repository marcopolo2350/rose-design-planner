'use client'

import { Icon as IconifyIcon } from '@iconify/react'
import {
  CAMERA_PRESET_ORDER,
  CAMERA_PRESETS,
  MOOD_ORDER,
  MOODS,
  TIME_OF_DAY_LABELS,
  TIME_OF_DAY_ORDER,
  useViewer,
} from '@pascal-app/viewer'
import { Sparkles } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useIsMobile } from '../../hooks/use-mobile'
import { applySceneGraphToEditor } from '../../lib/scene'
import {
  buildStarterScene,
  getStarterSceneAtmosphere,
  getStarterSceneSummary,
  STARTER_SCENE_ORDER,
} from '../../lib/starter-scenes'
import { cn } from '../../lib/utils'
import useEditor from '../../store/use-editor'

/**
 * MobileOutdoorSheet — on small viewports the toolbar can't fit the
 * outdoor experience pills (Mood, Time of day, Cinematic, Showcase,
 * Starters). This component exposes them via a single floating action
 * button at the bottom-right that opens a bottom sheet with everything
 * organized by section.
 *
 * Hidden on desktop where the toolbar already exposes everything.
 */
export function MobileOutdoorSheet() {
  const isMobile = useIsMobile()
  const outdoorMode = useViewer((s) => s.outdoorMode)
  const [open, setOpen] = useState(false)

  if (!(isMobile && outdoorMode)) return null

  return (
    <>
      <button
        aria-label="Open outdoor controls"
        // Positioned above the mobile bottom panel (max-h-[42vh] content
        // + ~50px TabBar + padding ≈ 50% of viewport). Bottom-[calc(50vh+2rem)]
        // gives the FAB headroom so it never sits on top of panel content.
        className="pointer-events-auto fixed right-3 bottom-[calc(50vh+2rem)] z-50 flex h-12 w-12 items-center justify-center rounded-full border border-white/12 bg-neutral-900/85 text-amber-300 shadow-2xl backdrop-blur-md transition-colors hover:bg-neutral-800/90"
        onClick={() => setOpen(true)}
        type="button"
      >
        <Sparkles className="h-5 w-5" />
      </button>
      {open && <OutdoorSheet onClose={() => setOpen(false)} />}
    </>
  )
}

function OutdoorSheet({ onClose }: { onClose: () => void }) {
  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[70] flex flex-col justify-end bg-black/55 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
    >
      <div
        className="relative max-h-[78vh] overflow-y-auto rounded-t-2xl border-t border-white/10 bg-neutral-950 px-5 pt-5 pb-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="-translate-x-1/2 absolute top-2 left-1/2 h-1 w-12 rounded-full bg-white/15" />
        <button
          aria-label="Close outdoor controls"
          className="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-full text-white/55 transition-colors hover:bg-white/8 hover:text-white"
          onClick={onClose}
          type="button"
        >
          <IconifyIcon height={14} icon="lucide:x" width={14} />
        </button>

        <div className="mb-4 mt-3">
          <h2 className="font-semibold text-base text-white">Outdoor experience</h2>
        </div>

        <SectionMood onClose={onClose} />
        <SectionTimeOfDay />
        <SectionCameras onClose={onClose} />
        <SectionStarters onClose={onClose} />
        <SectionShowcase />
        <SectionTutorial onClose={onClose} />
      </div>
    </div>
  )
}

function SectionTutorial({ onClose }: { onClose: () => void }) {
  const setTutorialOpen = useEditor((s) => s.setTutorialOpen)
  return (
    <Section icon="lucide:help-circle" title="Help">
      <button
        className="flex w-full items-center justify-between rounded-lg border border-white/8 bg-white/4 px-3 py-2.5 text-white transition-colors hover:bg-white/8"
        onClick={() => {
          setTutorialOpen(true)
          onClose()
        }}
        type="button"
      >
        <span className="font-medium text-[13px]">How to use this app</span>
        <IconifyIcon className="text-white/55" height={14} icon="lucide:arrow-right" width={14} />
      </button>
    </Section>
  )
}

function SectionMood({ onClose }: { onClose: () => void }) {
  const setTimeOfDay = useViewer((s) => s.setTimeOfDay)
  const requestCameraPreset = useViewer((s) => s.requestCameraPreset)

  return (
    <Section icon="lucide:wand-2" title="Mood">
      <div className="grid grid-cols-2 gap-2">
        {MOOD_ORDER.map((id) => {
          const mood = MOODS[id]
          if (!mood) return null
          return (
            <button
              className="flex items-center gap-2 rounded-lg border border-white/8 bg-white/4 px-3 py-2.5 text-left text-white transition-colors hover:bg-white/8"
              key={id}
              onClick={() => {
                setTimeOfDay(mood.timeOfDay)
                setTimeout(() => requestCameraPreset(mood.cameraPreset), 200)
                onClose()
              }}
              type="button"
            >
              <IconifyIcon className={mood.tint} height={16} icon={mood.icon} width={16} />
              <span className="font-medium text-[13px]">{mood.label}</span>
            </button>
          )
        })}
      </div>
    </Section>
  )
}

function SectionTimeOfDay() {
  const timeOfDay = useViewer((s) => s.timeOfDay)
  const setTimeOfDay = useViewer((s) => s.setTimeOfDay)

  return (
    <Section icon="lucide:sun" title="Time of day">
      <div className="grid grid-cols-4 gap-2">
        {TIME_OF_DAY_ORDER.map((t) => (
          <button
            className={cn(
              'rounded-lg border px-2 py-2 text-center text-[12px] transition-colors',
              timeOfDay === t
                ? 'border-white/35 bg-white/12 text-white'
                : 'border-white/8 bg-white/4 text-white/70 hover:bg-white/8',
            )}
            key={t}
            onClick={() => setTimeOfDay(t)}
            type="button"
          >
            {TIME_OF_DAY_LABELS[t]}
          </button>
        ))}
      </div>
    </Section>
  )
}

function SectionCameras({ onClose }: { onClose: () => void }) {
  const requestCameraPreset = useViewer((s) => s.requestCameraPreset)
  return (
    <Section icon="lucide:clapperboard" title="Camera views">
      <div className="grid grid-cols-2 gap-2">
        {CAMERA_PRESET_ORDER.map((id) => {
          const preset = CAMERA_PRESETS[id]
          if (!preset) return null
          return (
            <button
              className="rounded-lg border border-white/8 bg-white/4 px-3 py-2.5 text-left text-white transition-colors hover:bg-white/8"
              key={id}
              onClick={() => {
                requestCameraPreset(id)
                onClose()
              }}
              type="button"
            >
              <span className="font-medium text-[13px]">{preset.label}</span>
            </button>
          )
        })}
      </div>
    </Section>
  )
}

function SectionStarters({ onClose }: { onClose: () => void }) {
  const setTimeOfDay = useViewer((s) => s.setTimeOfDay)
  const requestCameraPreset = useViewer((s) => s.requestCameraPreset)
  const setStarterPickerOpen = useEditor((s) => s.setStarterPickerOpen)

  const apply = useCallback(
    (id: (typeof STARTER_SCENE_ORDER)[number]) => {
      applySceneGraphToEditor(buildStarterScene(id))
      const atmosphere = getStarterSceneAtmosphere(id)
      const mood = atmosphere.mood ? MOODS[atmosphere.mood] : null
      const tod = mood?.timeOfDay ?? atmosphere.timeOfDay
      const cam = mood?.cameraPreset ?? atmosphere.cameraPreset
      if (tod) setTimeOfDay(tod)
      if (cam) setTimeout(() => requestCameraPreset(cam), 350)
      onClose()
    },
    [setTimeOfDay, requestCameraPreset, onClose],
  )

  return (
    <Section icon="lucide:layout-template" title="Starter scenes">
      <button
        className="mb-2 flex w-full items-center gap-2 rounded-lg border border-white/8 bg-white/4 px-3 py-2.5 text-left text-white transition-colors hover:bg-white/8"
        onClick={() => {
          setStarterPickerOpen(true)
          onClose()
        }}
        type="button"
      >
        <IconifyIcon className="text-white/70" height={14} icon="lucide:wand-2" width={14} />
        <span className="font-medium text-[13px]">Open vibe picker…</span>
      </button>
      <div className="grid grid-cols-1 gap-2">
        {STARTER_SCENE_ORDER.map((id) => {
          const summary = getStarterSceneSummary(id)
          const mood = summary.mood ? MOODS[summary.mood] : null
          const icon = summary.icon ?? mood?.icon ?? 'lucide:layout-template'
          const tint = summary.tint ?? mood?.tint
          return (
            <button
              className="flex items-start gap-3 rounded-lg border border-white/8 bg-white/4 px-3 py-2.5 text-left transition-colors hover:bg-white/8"
              key={id}
              onClick={() => apply(id)}
              type="button"
            >
              <span className={cn('mt-0.5 shrink-0', tint)}>
                <IconifyIcon height={16} icon={icon} width={16} />
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="font-medium text-[13px] text-white">{summary.label}</span>
                <span className="text-[11px] text-white/55 leading-snug">
                  {summary.description}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </Section>
  )
}

function SectionShowcase() {
  const showcaseMode = useViewer((s) => s.showcaseMode)
  const setShowcaseMode = useViewer((s) => s.setShowcaseMode)
  const showcaseAutoplay = useViewer((s) => s.showcaseAutoplay)
  const setShowcaseAutoplay = useViewer((s) => s.setShowcaseAutoplay)

  return (
    <Section icon="lucide:sparkles" title="Showcase mode">
      <button
        className={cn(
          'mb-2 flex w-full items-center justify-between rounded-lg border px-3 py-2.5 transition-colors',
          showcaseMode
            ? 'border-amber-300/40 bg-amber-300/15 text-amber-100'
            : 'border-white/8 bg-white/4 text-white hover:bg-white/8',
        )}
        onClick={() => setShowcaseMode(!showcaseMode)}
        type="button"
      >
        <span className="font-medium text-[13px]">
          {showcaseMode ? 'Showcase on — tap to exit' : 'Enter Showcase'}
        </span>
        <Sparkles className="h-4 w-4" />
      </button>
      <button
        className="flex w-full items-center justify-between rounded-lg border border-white/8 bg-white/4 px-3 py-2.5 text-white transition-colors hover:bg-white/8"
        onClick={() => setShowcaseAutoplay(!showcaseAutoplay)}
        type="button"
      >
        <span className="font-medium text-[13px]">Autoplay (orbit + day/night)</span>
        <span className="text-[12px] text-white/55">{showcaseAutoplay ? 'On' : 'Off'}</span>
      </button>
    </Section>
  )
}

function Section({
  title,
  icon,
  children,
}: {
  title: string
  icon: string
  children: React.ReactNode
}) {
  return (
    <section className="mb-5">
      <div className="mb-2 flex items-center gap-2 text-[11px] text-white/45 uppercase tracking-wider">
        <IconifyIcon height={12} icon={icon} width={12} />
        <span>{title}</span>
      </div>
      {children}
    </section>
  )
}
