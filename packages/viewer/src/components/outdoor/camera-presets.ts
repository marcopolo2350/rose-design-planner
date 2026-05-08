import type { CameraPreset } from '../../store/use-viewer'

export type CameraShot = {
  id: CameraPreset
  label: string
  description: string
  /** [posX, posY, posZ, targetX, targetY, targetZ] */
  shot: [number, number, number, number, number, number]
  /**
   * Optional preferred time-of-day so triggering this preset feels
   * cohesive (e.g. "Evening" preset fades to evening lighting).
   */
  preferredTimeOfDay?: 'day' | 'goldenHour' | 'dusk' | 'evening'
}

const k = 1.0

/**
 * Cinematic camera presets tuned for outdoor scenes. Distances are in
 * world units (meters). Heights aim for a comfortable third-person feel —
 * not too close, not aerial, framing the backyard naturally.
 */
export const CAMERA_PRESETS: Record<CameraPreset, CameraShot> = {
  showcase: {
    id: 'showcase',
    label: 'Showcase',
    description: 'A floating hero angle that frames the whole scene.',
    shot: [22 * k, 14 * k, 24 * k, 0, 1.2, 0],
    preferredTimeOfDay: 'goldenHour',
  },
  reveal: {
    id: 'reveal',
    label: 'Backyard reveal',
    description: 'Approaches from above and behind, like opening a door to the yard.',
    shot: [-9 * k, 8 * k, 18 * k, 2, 1.0, -2],
    preferredTimeOfDay: 'day',
  },
  patio: {
    id: 'patio',
    label: 'Patio view',
    description: 'A relaxed seated-eye-level view onto the patio.',
    shot: [6 * k, 2.0 * k, 12 * k, 0, 1.0, 0],
    preferredTimeOfDay: 'day',
  },
  pool: {
    id: 'pool',
    label: 'Poolside',
    description: 'Low-slung angle skimming the pool surface for that resort feel.',
    shot: [11 * k, 1.4 * k, 10 * k, -1, 0.6, -2],
    preferredTimeOfDay: 'goldenHour',
  },
  evening: {
    id: 'evening',
    label: 'Evening glow',
    description: 'Warm golden-hour-into-evening framing with fireflies.',
    shot: [16 * k, 4.5 * k, 18 * k, 0, 1.0, 0],
    preferredTimeOfDay: 'evening',
  },
  walkthrough: {
    id: 'walkthrough',
    label: 'Walkthrough',
    description: 'Eye-level perspective for first-person exploration.',
    shot: [6 * k, 1.6 * k, 10 * k, 0, 1.6, 0],
    preferredTimeOfDay: 'day',
  },
}

export const CAMERA_PRESET_ORDER: CameraPreset[] = [
  'showcase',
  'reveal',
  'patio',
  'pool',
  'evening',
  'walkthrough',
]
