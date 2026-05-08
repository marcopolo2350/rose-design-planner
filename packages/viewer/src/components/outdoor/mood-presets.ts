import type { CameraPreset, TimeOfDay } from '../../store/use-viewer'

/**
 * Mood presets bundle a coherent atmosphere — time of day plus a hero
 * camera framing — into one click. They give the outdoor app a
 * "personalization" surface without requiring the user to fiddle with
 * each setting individually.
 *
 * Each mood is meant to evoke a different style of luxury outdoor
 * living: a daylit garden retreat, a resort poolside, a warm firepit
 * lounge, a moody modern evening. The user can flip between them and
 * watch the whole world reframe and recolor in one fluid transition.
 */

export type MoodId =
  | 'gardenRetreat'
  | 'resortPoolside'
  | 'firepitLounge'
  | 'modernEvening'

export type Mood = {
  id: MoodId
  label: string
  description: string
  timeOfDay: TimeOfDay
  cameraPreset: CameraPreset
  /** Iconify icon for the toolbar pill */
  icon: string
  /** Tailwind text color tint for the icon */
  tint: string
}

export const MOODS: Record<MoodId, Mood> = {
  gardenRetreat: {
    id: 'gardenRetreat',
    label: 'Garden retreat',
    description: 'Bright daylight, soft greens, framed by trees and shrubs.',
    timeOfDay: 'day',
    cameraPreset: 'reveal',
    icon: 'lucide:leaf',
    tint: 'text-emerald-300',
  },
  resortPoolside: {
    id: 'resortPoolside',
    label: 'Resort poolside',
    description: 'Golden-hour warmth at a low, water-skimming angle.',
    timeOfDay: 'goldenHour',
    cameraPreset: 'pool',
    icon: 'lucide:waves',
    tint: 'text-amber-300',
  },
  firepitLounge: {
    id: 'firepitLounge',
    label: 'Firepit lounge',
    description: 'Dusk warmth gathered around the fire — conversation light.',
    timeOfDay: 'dusk',
    cameraPreset: 'patio',
    icon: 'lucide:flame',
    tint: 'text-orange-300',
  },
  modernEvening: {
    id: 'modernEvening',
    label: 'Modern evening',
    description: 'Deep navy sky, fireflies, hero framing of the property.',
    timeOfDay: 'evening',
    cameraPreset: 'evening',
    icon: 'lucide:moon-star',
    tint: 'text-indigo-300',
  },
}

export const MOOD_ORDER: MoodId[] = [
  'gardenRetreat',
  'resortPoolside',
  'firepitLounge',
  'modernEvening',
]
