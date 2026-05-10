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
  // 1. WELCOME — set expectations, friendly tone
  {
    icon: 'lucide:sparkles',
    iconTint: 'text-amber-300',
    title: "Welcome to Rose's Outdoor Designs",
    body:
      "Design a luxury outdoor space — pool deck, firepit, kitchen, pergola, even a full estate — with no CAD knowledge required. This 30-second tour shows you everything.",
  },

  // 2. STARTERS — explain "Start from Starter" button
  {
    icon: 'lucide:layout-template',
    iconTint: 'text-emerald-300',
    title: 'Step 1 — Start from a designed space',
    body:
      'Click the green "Start from Starter" button at the top of the screen. Pick a vibe — Ultimate Estate, Garden retreat, Resort poolside, Firepit lounge — and you start with a fully composed scene as your editable copy. (You can always start from an empty canvas instead.)',
  },

  // 3. PROJECTS — Save Progress / My Projects / New Project / Reset
  {
    icon: 'lucide:save',
    iconTint: 'text-emerald-300',
    title: 'Step 2 — Save your design anytime',
    body:
      'The emerald "Save Progress" button (top toolbar) saves your current scene with a name. Open "Projects" right next to it to load earlier saves, start a New Project, or reset the current scene. Everything is stored locally on this device — no accounts, no cloud.',
  },

  // 4. EDITING — basic placement / catalog (desktop)
  {
    icon: 'lucide:hammer',
    iconTint: 'text-orange-300',
    title: 'Step 3 — Build, furnish, decorate',
    body:
      'Open the Plan / Catalog panel on the left. Pick a category — Structure (walls, slabs, fences), Furnish (sunbeds, firepit, pergola, kitchen, planters, lanterns) — then click in the scene to place. Items snap to the floor automatically. Click any placed item to select it; the side panel lets you edit it.',
    desktopOnly: true,
  },

  // 4b. EDITING — mobile
  {
    icon: 'lucide:hand',
    iconTint: 'text-orange-300',
    title: 'Step 3 — Build, furnish, decorate',
    body:
      'Tap the Plan tab at the bottom-left to open the Catalog. Tap a category, tap an item to pick it up, then tap the scene to place it. Tap any placed item to select it.',
    mobileOnly: true,
  },

  // 5. CAMERA — desktop controls
  {
    icon: 'ph:mouse-left-click-fill',
    iconTint: 'text-sky-300',
    title: 'Step 4 — Move the camera',
    body:
      'Hold SPACE + drag to pan. Right-click drag to orbit / rotate. Scroll wheel to zoom. The camera stays above the ground naturally.',
    desktopOnly: true,
  },

  // 5b. CAMERA — mobile (touch)
  {
    icon: 'lucide:hand',
    iconTint: 'text-sky-300',
    title: 'Step 4 — Move the camera',
    body:
      'One-finger drag to pan. Two-finger drag to rotate. Pinch to zoom. The floating star button (bottom-right) opens all your outdoor controls — Projects, Mood, Time of day, Cameras.',
    mobileOnly: true,
  },

  // 6. FLOORS — explicitly describe how to change a surface
  {
    icon: 'lucide:square',
    iconTint: 'text-amber-300',
    title: 'Step 5 — Change a floor or surface',
    body:
      'Click any patio / pool deck / driveway slab to select it. The right-side Properties panel shows the Material picker — pick Marble, Wood, Granite, Concrete, etc. The change appears instantly. (If you want to add a new patio, switch to Structure → Slab in the Plan panel.)',
  },

  // 7. MOOD + TIME OF DAY
  {
    icon: 'lucide:sun',
    iconTint: 'text-amber-300',
    title: 'Step 6 — Set the mood',
    body:
      'The Mood menu (top toolbar) bundles a time of day with a hero camera. Or open Time of day to flip between Day, Golden hour, Dusk, and Evening — the world recolors, lanterns ramp on, and the mansion glows from inside.',
  },

  // 8. SHOWCASE
  {
    icon: 'lucide:star',
    iconTint: 'text-amber-300',
    title: 'Step 7 — Present in Showcase Mode',
    body:
      "Press the sparkle button (Showcase) for the cinematic experience. The UI fades, the camera walks through 6 hand-directed shots — establishing wide, push-in, pool skim, rooftop reveal, aerial pull-back, hero settle — while time of day cycles. Magazine-cover footage you can leave running.",
  },

  // 9. WALKTHROUGH
  {
    icon: 'lucide:footprints',
    iconTint: 'text-emerald-300',
    title: 'Step 8 — Walk through your design',
    body:
      'Click the footprints icon (top toolbar) to enter Walkthrough — a first-person stroll through the space at human eye height. Use WASD to move, mouse to look around, Q/E to rise or descend, Shift to sprint. Press ESC to exit.',
    desktopOnly: true,
  },

  // 10. WRAP-UP
  {
    icon: 'lucide:check-circle-2',
    iconTint: 'text-emerald-300',
    title: "You're ready",
    body:
      'Open this tour any time from the question-mark Help button in the toolbar. Reload the page — your work persists. Have fun designing.',
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
