'use client'

import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import useViewer, { type TimeOfDay } from '../../store/use-viewer'

/**
 * ShowcaseAutoplay — when Showcase Mode + autoplay are on, slowly cycles
 * the time-of-day across day → goldenHour → dusk → evening → goldenHour
 * with each phase holding for ~12 seconds before advancing. The palettes
 * already cross-fade smoothly, so the transitions read as one continuous
 * cinematic presentation.
 *
 * Implementation lives in the viewer package (alongside the rest of the
 * outdoor experience layer) so it can be mounted by the Viewer without
 * needing a callback chain back to the editor.
 *
 * Pauses cleanly when:
 *  - Showcase Mode is off
 *  - Autoplay is off
 *  - The user manually changes time-of-day (we read the current value
 *    every frame so manual changes "rebase" the cycle)
 */

const PHASES: TimeOfDay[] = ['day', 'goldenHour', 'dusk', 'evening', 'goldenHour']
// Tuned for filming: a 30-second demo cuts past three palettes; longer
// holds let the eye absorb each mood and avoid the slideshow feel.
const PHASE_DURATION_SEC = 16

export function ShowcaseAutoplay() {
  const phaseElapsed = useRef(0)
  const lastObservedTimeOfDay = useRef<TimeOfDay | null>(null)

  useFrame((_, delta) => {
    const { showcaseMode, showcaseAutoplay, timeOfDay, setTimeOfDay } =
      useViewer.getState()
    if (!(showcaseMode && showcaseAutoplay)) {
      phaseElapsed.current = 0
      lastObservedTimeOfDay.current = null
      return
    }

    // If the user (or anything else) changed time-of-day under us, rebase
    if (lastObservedTimeOfDay.current !== timeOfDay) {
      lastObservedTimeOfDay.current = timeOfDay
      phaseElapsed.current = 0
    }

    phaseElapsed.current += delta
    if (phaseElapsed.current < PHASE_DURATION_SEC) return

    // Advance to the next phase in the loop
    const idx = PHASES.indexOf(timeOfDay)
    const nextIdx = idx === -1 ? 0 : (idx + 1) % PHASES.length
    const next = PHASES[nextIdx]!
    phaseElapsed.current = 0
    lastObservedTimeOfDay.current = next
    setTimeOfDay(next)
  })

  return null
}
