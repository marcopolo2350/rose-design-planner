'use client'

import { Icon as IconifyIcon } from '@iconify/react'
import { useCallback, useEffect, useState } from 'react'
import { useIsMobile } from '../../hooks/use-mobile'
import { cn } from '../../lib/utils'
import useEditor from '../../store/use-editor'

/**
 * In-app tutorial — a multi-step overlay that walks the user through the
 * outdoor experience. Designed to be skippable, fast to flip through, and
 * never auto-opening except for the very first visitor (and only after the
 * starter-picker has been resolved, so we don't stack two modals).
 *
 * The tutorial doesn't change scene state. It just teaches; it does not
 * touch the scene graph, so users can read it mid-build without losing
 * their work.
 *
 * Visibility is driven by useEditor.isTutorialOpen, so it's openable from
 * any UI surface (toolbar Help button, mobile sheet, the picker, etc.).
 */

const TUTORIAL_DISMISSED_KEY = 'roses-outdoor-tutorial-dismissed:v1'

export type TutorialStep = {
  icon: string
  iconTint: string
  title: string
  body: string
  /** Mobile-only or desktop-only steps can be filtered out via `mobileOnly`/`desktopOnly` */
  mobileOnly?: boolean
  desktopOnly?: boolean
}

const STEPS: TutorialStep[] = [
  {
    icon: 'lucide:sparkles',
    iconTint: 'text-amber-300',
    title: 'Welcome to Rose\'s Outdoor Designs',
    body:
      'Plan beautiful outdoor spaces — patios, pools, firepit lounges, pergolas — without ever feeling like CAD software. Here\'s the 30-second tour.',
  },
  {
    icon: 'lucide:wand-2',
    iconTint: 'text-emerald-300',
    title: 'Start from a backyard you love',
    body:
      'Open the Starters menu (top toolbar) and pick a vibe — Garden retreat, Resort poolside, Firepit lounge, Outdoor kitchen, Compact backyard, Luxury nighttime, or Modern evening. Each loads a designed space with the right lighting and a hero camera shot.',
  },
  {
    icon: 'ph:mouse-left-click-fill',
    iconTint: 'text-sky-300',
    title: 'Move the camera like a real space',
    body:
      'Hold Space + drag to pan. Right-click drag to rotate. Scroll to zoom. The camera respects horizons and gentle ground levels — it won\'t fly underground unless you ask it to.',
    desktopOnly: true,
  },
  {
    icon: 'lucide:hand',
    iconTint: 'text-sky-300',
    title: 'Move the camera with touch',
    body:
      'One finger drag to pan. Two-finger drag to rotate. Pinch to zoom. The bottom-right star button opens the outdoor controls — Mood, Time of day, Cameras, Showcase.',
    mobileOnly: true,
  },
  {
    icon: 'lucide:hammer',
    iconTint: 'text-orange-300',
    title: 'Build, furnish, zone',
    body:
      'Use the bottom panel to switch between Structure (walls, slabs, fences), Furnish (sunbeds, firepit, pergola, kitchen island, planters, lanterns), and Zones (named outdoor areas). Drop items onto patios — they snap to the surface.',
  },
  {
    icon: 'lucide:sun',
    iconTint: 'text-amber-300',
    title: 'Set the mood',
    body:
      'The Mood dropdown bundles a time of day with a hero camera in one click. Or use Time of day on its own to flip between Day, Golden hour, Dusk, and Evening — the whole world recolors and the firepit and lanterns light up.',
  },
  {
    icon: 'lucide:clapperboard',
    iconTint: 'text-violet-300',
    title: 'Cinematic camera views',
    body:
      'The Views menu offers Showcase, Backyard reveal, Patio view, Poolside, Evening glow, and Walkthrough — each a hand-tuned camera shot you\'d see in a luxury listing.',
  },
  {
    icon: 'lucide:star',
    iconTint: 'text-amber-300',
    title: 'Present in Showcase Mode',
    body:
      'Press the sparkle button to enter Showcase. The UI fades, the camera glides into a hero angle, and (with autoplay on) it slowly orbits while time of day cycles — a magazine-cover loop you can leave running.',
  },
  {
    icon: 'lucide:check',
    iconTint: 'text-emerald-300',
    title: 'You\'re ready',
    body:
      'Re-open this tour any time from the Help button. Save is automatic — your space persists between visits.',
  },
]

export function TutorialOverlay() {
  const open = useEditor((s) => s.isTutorialOpen)
  const setOpen = useEditor((s) => s.setTutorialOpen)
  const isMobile = useIsMobile()
  const [step, setStep] = useState(0)

  const visibleSteps = STEPS.filter((s) =>
    isMobile ? !s.desktopOnly : !s.mobileOnly,
  )

  useEffect(() => {
    if (open) setStep(0)
  }, [open])

  const onClose = useCallback(() => {
    try {
      localStorage.setItem(TUTORIAL_DISMISSED_KEY, '1')
    } catch {
      // Treat localStorage failures as non-fatal
    }
    setOpen(false)
  }, [setOpen])

  if (!open) return null

  const current = visibleSteps[step]
  if (!current) {
    // Defensive — should never happen
    onClose()
    return null
  }

  const isLast = step === visibleSteps.length - 1

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[85] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      role="dialog"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-neutral-950/95 p-6 shadow-2xl">
        <button
          aria-label="Close tutorial"
          className="absolute top-3.5 right-3.5 flex h-7 w-7 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/8 hover:text-white"
          onClick={onClose}
          type="button"
        >
          <IconifyIcon height={14} icon="lucide:x" width={14} />
        </button>

        <div
          className={cn(
            'mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-black/30',
            current.iconTint,
          )}
        >
          <IconifyIcon height={22} icon={current.icon} width={22} />
        </div>

        <h2 className="font-semibold text-white text-xl">{current.title}</h2>
        <p className="mt-2 text-[13.5px] text-white/70 leading-relaxed">{current.body}</p>

        <div className="mt-6 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {visibleSteps.map((_, i) => (
              <button
                aria-label={`Go to step ${i + 1}`}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  i === step ? 'w-5 bg-white/85' : 'w-1.5 bg-white/25 hover:bg-white/45',
                )}
                key={i}
                onClick={() => setStep(i)}
                type="button"
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                className="rounded-lg border border-white/12 bg-white/4 px-3 py-1.5 text-[12.5px] text-white/85 transition-colors hover:bg-white/10"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                type="button"
              >
                Back
              </button>
            )}
            <button
              className="rounded-lg bg-white px-3.5 py-1.5 font-medium text-[12.5px] text-neutral-900 transition-colors hover:bg-white/90"
              onClick={() => {
                if (isLast) onClose()
                else setStep((s) => Math.min(visibleSteps.length - 1, s + 1))
              }}
              type="button"
            >
              {isLast ? 'Got it' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * On a fresh first visit, offer the tutorial *after* the starter picker
 * has been resolved (either by selecting a vibe or dismissing). This
 * sequence — pick the look first, then learn how to use it — feels more
 * inviting than dropping two modals on a cold visitor.
 *
 * If either the tutorial OR the picker has been dismissed before, this
 * component does nothing.
 */
export function TutorialAutoOpener() {
  const setOpen = useEditor((s) => s.setTutorialOpen)
  const isPickerOpen = useEditor((s) => s.isStarterPickerOpen)
  const isTutorialOpen = useEditor((s) => s.isTutorialOpen)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (isTutorialOpen) return
    // Only auto-show after picker has resolved (closed)
    if (isPickerOpen) return

    let dismissed = false
    try {
      dismissed = localStorage.getItem(TUTORIAL_DISMISSED_KEY) === '1'
    } catch {
      // Treat storage failures as "not dismissed"
    }
    if (dismissed) return

    // Has the picker resolved at least once? If the picker hasn't been
    // dismissed yet either, wait — picker comes first.
    let pickerDismissed = false
    try {
      pickerDismissed =
        localStorage.getItem('roses-outdoor-starter-picker-dismissed:v1') === '1'
    } catch {
      pickerDismissed = false
    }
    if (!pickerDismissed) return

    // Small delay so it feels intentional, not jumpy
    const t = setTimeout(() => setOpen(true), 700)
    return () => clearTimeout(t)
  }, [isPickerOpen, isTutorialOpen, setOpen])

  return null
}
