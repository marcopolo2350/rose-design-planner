'use client'

import type { CameraPreset, MoodId, TimeOfDay } from '@pascal-app/viewer'
import type { SceneGraph } from './scene'

export type StarterSceneId =
  | 'gardenRetreat'
  | 'resortPoolside'
  | 'firepitLounge'
  | 'modernEvening'
  | 'outdoorKitchen'
  | 'compactBackyard'
  | 'luxuryNighttime'

/**
 * Starter scenes — pre-composed backyard layouts the user can load to
 * begin from a designed starting point rather than an empty plot. Each
 * scene is paired with a Mood preset so atmosphere matches composition.
 *
 * Scenes use only the existing outdoor catalog assets (trees, fences,
 * sunbeds, palms, patio umbrellas) plus furniture pieces that read as
 * outdoor (lounge chair, coffee table) so we don't ship broken model
 * references. No new GLBs required.
 *
 * Each builder generates fresh node IDs every call so the same scene
 * can be loaded multiple times without ID collisions.
 */

const ID_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz'

function makeId(prefix: string): string {
  let s = ''
  for (let i = 0; i < 16; i++) {
    s += ID_ALPHABET[Math.floor(Math.random() * ID_ALPHABET.length)]
  }
  return `${prefix}_${s}`
}

// ── Catalog entries duplicated here so the scene builder is self-contained ──

type CatalogAsset = {
  id: string
  category: string
  name: string
  thumbnail: string
  src: string
  dimensions: [number, number, number]
  offset: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
  tags?: string[]
}

const ASSETS: Record<string, CatalogAsset> = {
  bush: {
    id: 'bush',
    category: 'outdoor',
    name: 'Bush',
    thumbnail: '/items/bush/thumbnail.webp',
    src: '/items/bush/model.glb',
    dimensions: [3, 1.1, 1],
    offset: [-0.14, 0.01, -0.13],
    rotation: [0, 0, 0],
    scale: [0.96, 0.96, 0.96],
    tags: ['vegetation'],
  },
  'fir-tree': {
    id: 'fir-tree',
    category: 'outdoor',
    name: 'Fir',
    thumbnail: '/items/fir-tree/thumbnail.webp',
    src: '/items/fir-tree/model.glb',
    dimensions: [0.5, 3, 0.5],
    offset: [-0.01, 0.05, -0.07],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    tags: ['vegetation'],
  },
  tree: {
    id: 'tree',
    category: 'outdoor',
    name: 'Tree',
    thumbnail: '/items/tree/thumbnail.webp',
    src: '/items/tree/model.glb',
    dimensions: [1, 5, 1],
    offset: [-0.02, 0.17, -0.04],
    rotation: [0, 0, 0],
    scale: [0.65, 0.65, 0.65],
    tags: ['vegetation'],
  },
  palm: {
    id: 'palm',
    category: 'outdoor',
    name: 'Palm',
    thumbnail: '/items/palm/thumbnail.webp',
    src: '/items/palm/model.glb',
    dimensions: [1, 4.5, 1],
    offset: [0, 0, 0.02],
    rotation: [0, 0, 0],
    scale: [0.37, 0.37, 0.37],
    tags: ['vegetation'],
  },
  sunbed: {
    id: 'sunbed',
    category: 'outdoor',
    name: 'Sunbed',
    thumbnail: '/items/sunbed/thumbnail.webp',
    src: '/items/sunbed/model.glb',
    dimensions: [1, 1.2, 1.5],
    offset: [0, 0.04, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    tags: ['leisure', 'seating', 'floor'],
  },
  'patio-umbrella': {
    id: 'patio-umbrella',
    category: 'outdoor',
    name: 'Patio Umbrella',
    thumbnail: '/items/patio-umbrella/thumbnail.webp',
    src: '/items/patio-umbrella/model.glb',
    dimensions: [0.5, 3.7, 0.5],
    offset: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    tags: ['leisure', 'floor'],
  },
  'lounge-chair': {
    id: 'lounge-chair',
    category: 'furniture',
    name: 'Lounge Chair',
    thumbnail: '/items/lounge-chair/thumbnail.webp',
    src: '/items/lounge-chair/model.glb',
    dimensions: [1, 1.1, 1.5],
    offset: [0, 0, 0.09],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    tags: ['floor', 'seating'],
  },
  'coffee-table': {
    id: 'coffee-table',
    category: 'furniture',
    name: 'Coffee Table',
    thumbnail: '/items/coffee-table/thumbnail.webp',
    src: '/items/coffee-table/model.glb',
    dimensions: [2, 0.4, 1.5],
    offset: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    tags: ['floor', 'table'],
  },
  // Procedural items — rendered inline by the viewer's ItemRenderer when
  // it sees the proc:// src. Dimensions match the catalog entries so
  // selection bounds and spatial-grid checks behave normally.
  firepit: {
    id: 'firepit',
    category: 'outdoor',
    name: 'Fire Pit',
    thumbnail: '/items/firepit/thumbnail.webp',
    src: 'proc://firepit',
    dimensions: [0.95, 0.85, 0.95],
    offset: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    tags: ['leisure', 'floor', 'lighting'],
  },
  pergola: {
    id: 'pergola',
    category: 'outdoor',
    name: 'Pergola',
    thumbnail: '/items/pergola/thumbnail.webp',
    src: 'proc://pergola',
    dimensions: [4, 2.6, 4],
    offset: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    tags: ['structure', 'floor'],
  },
  'outdoor-kitchen-island': {
    id: 'outdoor-kitchen-island',
    category: 'outdoor',
    name: 'Outdoor Kitchen',
    thumbnail: '/items/outdoor-kitchen-island/thumbnail.webp',
    src: 'proc://outdoor-kitchen-island',
    dimensions: [2.6, 0.95, 0.7],
    offset: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    tags: ['leisure', 'floor', 'kitchen'],
  },
  'planter-box': {
    id: 'planter-box',
    category: 'outdoor',
    name: 'Planter Box',
    thumbnail: '/items/planter-box/thumbnail.webp',
    src: 'proc://planter-box',
    dimensions: [0.7, 0.85, 0.7],
    offset: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    tags: ['vegetation', 'floor'],
  },
  'stepping-stone': {
    id: 'stepping-stone',
    category: 'outdoor',
    name: 'Stepping Stone',
    thumbnail: '/items/stepping-stone/thumbnail.webp',
    src: 'proc://stepping-stone',
    dimensions: [0.55, 0.05, 0.4],
    offset: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    tags: ['floor', 'pathing'],
  },
  'garden-lantern': {
    id: 'garden-lantern',
    category: 'outdoor',
    name: 'Garden Lantern',
    thumbnail: '/items/garden-lantern/thumbnail.webp',
    src: 'proc://garden-lantern',
    dimensions: [0.18, 0.55, 0.18],
    offset: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    tags: ['lighting', 'floor'],
  },
  'pool-coping': {
    id: 'pool-coping',
    category: 'outdoor',
    name: 'Pool Coping',
    thumbnail: '/items/pool-coping/thumbnail.webp',
    src: 'proc://pool-coping',
    dimensions: [7, 0.06, 5],
    offset: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    tags: ['structure', 'floor'],
  },
  'pool-shimmer': {
    id: 'pool-shimmer',
    category: 'outdoor',
    name: 'Pool Shimmer',
    thumbnail: '/items/pool-shimmer/thumbnail.webp',
    src: 'proc://pool-shimmer',
    dimensions: [6, 0.02, 4],
    offset: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    tags: ['structure', 'floor'],
  },
  'dining-chair': {
    id: 'dining-chair',
    category: 'furniture',
    name: 'Dining Chair',
    thumbnail: '/items/dining-chair/thumbnail.webp',
    src: '/items/dining-chair/model.glb',
    dimensions: [0.5, 1, 0.5],
    offset: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    tags: ['floor', 'seating'],
  },
  'dining-table': {
    id: 'dining-table',
    category: 'furniture',
    name: 'Dining Table',
    thumbnail: '/items/dining-table/thumbnail.webp',
    src: '/items/dining-table/model.glb',
    dimensions: [2.5, 0.8, 1],
    offset: [0, 0, -0.01],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    tags: ['floor', 'table'],
  },
  sofa: {
    id: 'sofa',
    category: 'furniture',
    name: 'Sofa',
    thumbnail: '/items/sofa/thumbnail.webp',
    src: '/items/sofa/model.glb',
    dimensions: [2.5, 0.8, 1.5],
    offset: [0, 0, 0.04],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    tags: ['floor', 'seating'],
  },
}

type ItemSpec = {
  asset: keyof typeof ASSETS
  position: [number, number, number]
  rotationY?: number
  scale?: [number, number, number]
  /** Override the asset's default dimensions for this placement (e.g. a
   *  pool-coping sized to wrap a specific water polygon). */
  dimensions?: [number, number, number]
}

type SlabSpec = {
  /** [x, z] polygon points (closed loop) */
  polygon: [number, number][]
  materialPreset?: 'wood' | 'concrete' | 'tile' | 'marble' | 'brick'
  /** Slab elevation; default 0.05 */
  elevation?: number
  /** Optional custom material override (e.g., for water surfaces) */
  material?: {
    properties?: {
      color?: string
      roughness?: number
      metalness?: number
      opacity?: number
      transparent?: boolean
    }
  }
}

type StarterSceneSpec = {
  id: StarterSceneId
  label: string
  description: string
  /** Square site half-size — final polygon is [-s,-s] to [s,s] */
  siteHalfSize: number
  slabs: SlabSpec[]
  items: ItemSpec[]
  /** Atmosphere to apply when this scene loads — keyed by mood id when
   *  available, else explicit time-of-day + camera preset */
  mood?: MoodId
  timeOfDay?: TimeOfDay
  cameraPreset?: CameraPreset
  /** Optional iconify icon override for menus when no mood is bound */
  icon?: string
  /** Optional accent color tint */
  tint?: string
}

// ── The starter scenes ────────────────────────────────────────────────────

const SCENES: Record<StarterSceneId, StarterSceneSpec> = {
  gardenRetreat: {
    id: 'gardenRetreat',
    label: 'Garden retreat',
    description: 'Layered greenery framing a quiet wooden patio.',
    mood: 'gardenRetreat',
    siteHalfSize: 12,
    slabs: [
      // Wooden patio toward the back of the property
      {
        polygon: [
          [-3, -7],
          [3, -7],
          [3, -3],
          [-3, -3],
        ],
        materialPreset: 'wood',
      },
    ],
    items: [
      // Trees framing the back corners
      { asset: 'tree', position: [-9, 0, -9] },
      { asset: 'tree', position: [9, 0, -9] },
      // Fir trees mid-back for layered depth
      { asset: 'fir-tree', position: [-7, 0, -10], scale: [1.2, 1.2, 1.2] },
      { asset: 'fir-tree', position: [7, 0, -10], scale: [1.2, 1.2, 1.2] },
      // Bushes along the patio edge — soft green border
      { asset: 'bush', position: [-5, 0, -3], scale: [0.7, 0.7, 0.7] },
      { asset: 'bush', position: [5, 0, -3], scale: [0.7, 0.7, 0.7] },
      { asset: 'bush', position: [-2, 0, -8], scale: [0.6, 0.6, 0.6] },
      { asset: 'bush', position: [2, 0, -8], scale: [0.6, 0.6, 0.6] },
      // A lounge moment on the patio
      { asset: 'lounge-chair', position: [-1.2, 0, -5], rotationY: 0 },
      { asset: 'lounge-chair', position: [1.2, 0, -5], rotationY: 0 },
      { asset: 'coffee-table', position: [0, 0, -4], scale: [0.6, 0.6, 0.6] },
    ],
  },

  resortPoolside: {
    id: 'resortPoolside',
    label: 'Resort poolside',
    description: 'A sun-bleached pool deck with palms and aligned sunbeds.',
    mood: 'resortPoolside',
    siteHalfSize: 14,
    slabs: [
      // Pool deck — large tile slab
      {
        polygon: [
          [-7, -5],
          [7, -5],
          [7, 5],
          [-7, 5],
        ],
        materialPreset: 'tile',
      },
      // Pool — translucent blue water surface, slightly inset
      {
        polygon: [
          [-4, -3],
          [4, -3],
          [4, 3],
          [-4, 3],
        ],
        elevation: 0.06,
        material: {
          properties: {
            color: '#2f86c2',
            roughness: 0.14,
            metalness: 0.45,
            opacity: 0.92,
            transparent: true,
          },
        },
      },
    ],
    items: [
      // Pool coping — stone frame around the water (sized 8.6×6.6 to wrap
      // an 8×6 water area with a ~30cm trim). Slightly raised so it reads
      // as a stone cap rather than a paint stripe.
      { asset: 'pool-coping', position: [0, 0, 0], dimensions: [8.6, 0.1, 6.6] },
      // Pool shimmer — animated caustic-ripple overlay sized to fit
      // INSIDE the coping inner edge (≈ 7.7 × 5.7).
      { asset: 'pool-shimmer', position: [0, 0.07, 0], dimensions: [7.7, 0.02, 5.7] },
      // Palms framing the deck corners
      { asset: 'palm', position: [-8, 0, -6], scale: [0.55, 0.55, 0.55] },
      { asset: 'palm', position: [8, 0, -6], scale: [0.55, 0.55, 0.55] },
      { asset: 'palm', position: [-8, 0, 6], scale: [0.55, 0.55, 0.55] },
      { asset: 'palm', position: [8, 0, 6], scale: [0.55, 0.55, 0.55] },
      // Sunbeds along one side of the pool, all facing the water
      { asset: 'sunbed', position: [-5.6, 0, -3.5], rotationY: Math.PI / 2 },
      { asset: 'sunbed', position: [-5.6, 0, -1.5], rotationY: Math.PI / 2 },
      { asset: 'sunbed', position: [-5.6, 0, 0.5], rotationY: Math.PI / 2 },
      { asset: 'sunbed', position: [-5.6, 0, 2.5], rotationY: Math.PI / 2 },
      // Patio umbrellas between sunbeds for shade
      { asset: 'patio-umbrella', position: [-6.1, 0, -2.5] },
      { asset: 'patio-umbrella', position: [-6.1, 0, 1.5] },
      // A second pair facing back across the pool
      { asset: 'sunbed', position: [5.6, 0, -1], rotationY: -Math.PI / 2 },
      { asset: 'sunbed', position: [5.6, 0, 1], rotationY: -Math.PI / 2 },
      // Planters punctuating the deck edges
      { asset: 'planter-box', position: [-5.5, 0, 4.4] },
      { asset: 'planter-box', position: [5.5, 0, 4.4] },
      { asset: 'planter-box', position: [-5.5, 0, -4.4] },
      { asset: 'planter-box', position: [5.5, 0, -4.4] },
      // Lanterns along the deck edge — light up at dusk/evening
      { asset: 'garden-lantern', position: [-6.5, 0, 4.7] },
      { asset: 'garden-lantern', position: [-2.5, 0, 4.7] },
      { asset: 'garden-lantern', position: [2.5, 0, 4.7] },
      { asset: 'garden-lantern', position: [6.5, 0, 4.7] },
    ],
  },

  firepitLounge: {
    id: 'firepitLounge',
    label: 'Firepit lounge',
    description: 'Stone patio with a tight circle of seating around the fire.',
    mood: 'firepitLounge',
    siteHalfSize: 11,
    slabs: [
      // Octagon-ish stone patio (8 vertices for a soft circle feel)
      {
        polygon: [
          [-3.5, -1.5],
          [-1.5, -3.5],
          [1.5, -3.5],
          [3.5, -1.5],
          [3.5, 1.5],
          [1.5, 3.5],
          [-1.5, 3.5],
          [-3.5, 1.5],
        ],
        materialPreset: 'concrete',
      },
    ],
    items: [
      // The real firepit — stone bowl, ember bed, animated flame, and a
      // warm point light that ramps with time of day.
      { asset: 'firepit', position: [0, 0, 0] },
      // Conversation circle — 4 lounge chairs facing inward
      { asset: 'lounge-chair', position: [0, 0, -2.7], rotationY: 0 },
      { asset: 'lounge-chair', position: [2.7, 0, 0], rotationY: -Math.PI / 2 },
      { asset: 'lounge-chair', position: [0, 0, 2.7], rotationY: Math.PI },
      { asset: 'lounge-chair', position: [-2.7, 0, 0], rotationY: Math.PI / 2 },
      // Garden lanterns at the patio corners — light up at dusk/evening
      { asset: 'garden-lantern', position: [-3.5, 0, -3.5] },
      { asset: 'garden-lantern', position: [3.5, 0, -3.5] },
      { asset: 'garden-lantern', position: [-3.5, 0, 3.5] },
      { asset: 'garden-lantern', position: [3.5, 0, 3.5] },
      // Bushes ringing the patio for cozy enclosure
      { asset: 'bush', position: [-5.5, 0, -5.5], scale: [0.8, 0.8, 0.8] },
      { asset: 'bush', position: [5.5, 0, -5.5], scale: [0.8, 0.8, 0.8] },
      { asset: 'bush', position: [-5.5, 0, 5.5], scale: [0.8, 0.8, 0.8] },
      { asset: 'bush', position: [5.5, 0, 5.5], scale: [0.8, 0.8, 0.8] },
      // Trees at the far back for layered depth at dusk
      { asset: 'tree', position: [-7, 0, -8], scale: [0.55, 0.55, 0.55] },
      { asset: 'tree', position: [7, 0, -8], scale: [0.55, 0.55, 0.55] },
      { asset: 'fir-tree', position: [0, 0, -9], scale: [1.4, 1.4, 1.4] },
    ],
  },

  modernEvening: {
    id: 'modernEvening',
    label: 'Modern evening',
    description: 'A clean rectangular patio under deep evening sky.',
    mood: 'modernEvening',
    siteHalfSize: 13,
    slabs: [
      // Marble-tile main patio — wide, low, modern
      {
        polygon: [
          [-5, -3.5],
          [5, -3.5],
          [5, 3.5],
          [-5, 3.5],
        ],
        materialPreset: 'marble',
      },
    ],
    items: [
      // Two palms framing the entry to the patio
      { asset: 'palm', position: [-6.5, 0, -5], scale: [0.5, 0.5, 0.5] },
      { asset: 'palm', position: [6.5, 0, -5], scale: [0.5, 0.5, 0.5] },
      // Minimal sunbeds — just two, parallel
      { asset: 'sunbed', position: [-2, 0, 0], rotationY: 0 },
      { asset: 'sunbed', position: [2, 0, 0], rotationY: 0 },
      // One central umbrella
      { asset: 'patio-umbrella', position: [0, 0, 0] },
      // Trees as distant background silhouettes
      { asset: 'tree', position: [-8, 0, -9], scale: [0.5, 0.5, 0.5] },
      { asset: 'tree', position: [8, 0, -9], scale: [0.5, 0.5, 0.5] },
      { asset: 'fir-tree', position: [-4, 0, -10], scale: [1.1, 1.1, 1.1] },
      { asset: 'fir-tree', position: [4, 0, -10], scale: [1.1, 1.1, 1.1] },
    ],
  },

  // ── New scenes leveraging procedural items ──────────────────────────────

  outdoorKitchen: {
    id: 'outdoorKitchen',
    label: 'Outdoor kitchen',
    description: 'Entertaining island under a pergola with dining for six.',
    timeOfDay: 'goldenHour',
    cameraPreset: 'patio',
    icon: 'lucide:utensils',
    tint: 'text-orange-300',
    siteHalfSize: 14,
    slabs: [
      // Patio under the pergola — wide stone deck
      {
        polygon: [
          [-5, -4],
          [5, -4],
          [5, 4],
          [-5, 4],
        ],
        materialPreset: 'concrete',
      },
    ],
    items: [
      // Pergola covering the dining area
      { asset: 'pergola', position: [0, 0, 1.5] },
      // Outdoor kitchen island anchoring the back of the patio
      { asset: 'outdoor-kitchen-island', position: [0, 0, -3.2] },
      // Dining table and chairs under the pergola
      { asset: 'dining-table', position: [0, 0, 1.5], rotationY: Math.PI / 2 },
      { asset: 'dining-chair', position: [-1.6, 0, 1.5], rotationY: Math.PI / 2 },
      { asset: 'dining-chair', position: [1.6, 0, 1.5], rotationY: -Math.PI / 2 },
      { asset: 'dining-chair', position: [-0.7, 0, 0.4], rotationY: 0 },
      { asset: 'dining-chair', position: [0.7, 0, 0.4], rotationY: 0 },
      { asset: 'dining-chair', position: [-0.7, 0, 2.6], rotationY: Math.PI },
      { asset: 'dining-chair', position: [0.7, 0, 2.6], rotationY: Math.PI },
      // Planter boxes flanking the kitchen island
      { asset: 'planter-box', position: [-2.0, 0, -3.4] },
      { asset: 'planter-box', position: [2.0, 0, -3.4] },
      // Lanterns for evening glow
      { asset: 'garden-lantern', position: [-4.5, 0, -3.5] },
      { asset: 'garden-lantern', position: [4.5, 0, -3.5] },
      { asset: 'garden-lantern', position: [-4.5, 0, 3.5] },
      { asset: 'garden-lantern', position: [4.5, 0, 3.5] },
      // Trees framing the property
      { asset: 'tree', position: [-9, 0, -6], scale: [0.55, 0.55, 0.55] },
      { asset: 'tree', position: [9, 0, -6], scale: [0.55, 0.55, 0.55] },
      { asset: 'fir-tree', position: [-7, 0, -10], scale: [1.3, 1.3, 1.3] },
      { asset: 'fir-tree', position: [7, 0, -10], scale: [1.3, 1.3, 1.3] },
    ],
  },

  compactBackyard: {
    id: 'compactBackyard',
    label: 'Compact backyard',
    description: 'A clever small lot — patio, firepit, planters, no wasted space.',
    timeOfDay: 'day',
    cameraPreset: 'reveal',
    icon: 'lucide:square-stack',
    tint: 'text-sky-300',
    siteHalfSize: 8,
    slabs: [
      // Compact stone patio
      {
        polygon: [
          [-3, -2],
          [3, -2],
          [3, 2.5],
          [-3, 2.5],
        ],
        materialPreset: 'tile',
      },
    ],
    items: [
      // Stepping-stone path leading to the patio from the bottom of the yard
      { asset: 'stepping-stone', position: [0, 0, 5] },
      { asset: 'stepping-stone', position: [0, 0, 4.2] },
      { asset: 'stepping-stone', position: [0, 0, 3.4] },
      { asset: 'stepping-stone', position: [0, 0, 2.8] },
      // Firepit with two lounge chairs facing it
      { asset: 'firepit', position: [0, 0, -1.2] },
      { asset: 'lounge-chair', position: [-1.5, 0, -1.2], rotationY: Math.PI / 2 },
      { asset: 'lounge-chair', position: [1.5, 0, -1.2], rotationY: -Math.PI / 2 },
      // Planter row along the back fence
      { asset: 'planter-box', position: [-2.4, 0, -2.4] },
      { asset: 'planter-box', position: [-0.8, 0, -2.4] },
      { asset: 'planter-box', position: [0.8, 0, -2.4] },
      { asset: 'planter-box', position: [2.4, 0, -2.4] },
      // Lanterns lining the path
      { asset: 'garden-lantern', position: [-1.0, 0, 4.6] },
      { asset: 'garden-lantern', position: [1.0, 0, 3.4] },
      { asset: 'garden-lantern', position: [-1.0, 0, 2.0] },
      // Bushes softening the corners
      { asset: 'bush', position: [-3.2, 0, 1.8], scale: [0.5, 0.5, 0.5] },
      { asset: 'bush', position: [3.2, 0, 1.8], scale: [0.5, 0.5, 0.5] },
      // A single fir tree as the visual anchor at the back
      { asset: 'fir-tree', position: [3.5, 0, -3.5], scale: [1.1, 1.1, 1.1] },
    ],
  },

  luxuryNighttime: {
    id: 'luxuryNighttime',
    label: 'Luxury nighttime',
    description: 'Pool, pergola, firepit, lanterns — the full evening showcase.',
    timeOfDay: 'evening',
    cameraPreset: 'evening',
    icon: 'lucide:star',
    tint: 'text-violet-300',
    siteHalfSize: 16,
    slabs: [
      // Main pool deck
      {
        polygon: [
          [-7, -4],
          [7, -4],
          [7, 6],
          [-7, 6],
        ],
        materialPreset: 'tile',
      },
      // Pool — translucent water at slightly higher elevation so the
      // surface reads above the deck
      {
        polygon: [
          [-4, -2.5],
          [4, -2.5],
          [4, 2.5],
          [-4, 2.5],
        ],
        elevation: 0.06,
        material: {
          properties: {
            color: '#1d6da8',
            roughness: 0.12,
            metalness: 0.5,
            opacity: 0.93,
            transparent: true,
          },
        },
      },
    ],
    items: [
      // Pool coping — stone frame wrapping the 8×5 water area
      { asset: 'pool-coping', position: [0, 0, 0], dimensions: [8.6, 0.1, 5.6] },
      // Pool shimmer — caustic-ripple overlay inside the coping
      { asset: 'pool-shimmer', position: [0, 0.07, 0], dimensions: [7.7, 0.02, 4.7] },
      // Pergola lounge area at the back of the deck
      { asset: 'pergola', position: [0, 0, 5] },
      { asset: 'sofa', position: [0, 0, 5], rotationY: Math.PI / 2, scale: [0.95, 0.95, 0.95] },
      { asset: 'lounge-chair', position: [-2, 0, 5.2], rotationY: -Math.PI / 2 },
      { asset: 'lounge-chair', position: [2, 0, 5.2], rotationY: Math.PI / 2 },
      // Firepit moment off to the side of the pool
      { asset: 'firepit', position: [-5.6, 0, 0] },
      { asset: 'lounge-chair', position: [-5.6, 0, -1.6], rotationY: 0 },
      { asset: 'lounge-chair', position: [-5.6, 0, 1.6], rotationY: Math.PI },
      // Sunbeds along the far side of the pool
      { asset: 'sunbed', position: [5.6, 0, -1.5], rotationY: -Math.PI / 2 },
      { asset: 'sunbed', position: [5.6, 0, 0.5], rotationY: -Math.PI / 2 },
      { asset: 'sunbed', position: [5.6, 0, 2.5], rotationY: -Math.PI / 2 },
      // Garden lanterns ringing the pool deck — the night-glow chorus
      { asset: 'garden-lantern', position: [-6.5, 0, -3.5] },
      { asset: 'garden-lantern', position: [-3, 0, -3.5] },
      { asset: 'garden-lantern', position: [0, 0, -3.5] },
      { asset: 'garden-lantern', position: [3, 0, -3.5] },
      { asset: 'garden-lantern', position: [6.5, 0, -3.5] },
      { asset: 'garden-lantern', position: [-6.5, 0, 5.5] },
      { asset: 'garden-lantern', position: [-3, 0, 5.5] },
      { asset: 'garden-lantern', position: [3, 0, 5.5] },
      { asset: 'garden-lantern', position: [6.5, 0, 5.5] },
      // Lantern next to firepit grouping
      { asset: 'garden-lantern', position: [-5.6, 0, -2.8] },
      { asset: 'garden-lantern', position: [-5.6, 0, 2.8] },
      // Planters along the pergola edge & at deck corners
      { asset: 'planter-box', position: [-2.4, 0, 6.8] },
      { asset: 'planter-box', position: [2.4, 0, 6.8] },
      { asset: 'planter-box', position: [-6.8, 0, -3.7] },
      { asset: 'planter-box', position: [6.8, 0, -3.7] },
      // Palms framing the property
      { asset: 'palm', position: [-9, 0, -5], scale: [0.55, 0.55, 0.55] },
      { asset: 'palm', position: [9, 0, -5], scale: [0.55, 0.55, 0.55] },
      { asset: 'palm', position: [-9, 0, 7], scale: [0.55, 0.55, 0.55] },
      { asset: 'palm', position: [9, 0, 7], scale: [0.55, 0.55, 0.55] },
    ],
  },
}

export const STARTER_SCENE_ORDER: StarterSceneId[] = [
  'gardenRetreat',
  'resortPoolside',
  'firepitLounge',
  'modernEvening',
  'outdoorKitchen',
  'compactBackyard',
  'luxuryNighttime',
]

export type StarterSceneSummary = {
  id: StarterSceneId
  label: string
  description: string
  mood?: MoodId
  timeOfDay?: TimeOfDay
  cameraPreset?: CameraPreset
  icon?: string
  tint?: string
}

export function getStarterSceneSummary(id: StarterSceneId): StarterSceneSummary {
  const spec = SCENES[id]
  return {
    id: spec.id,
    label: spec.label,
    description: spec.description,
    mood: spec.mood,
    timeOfDay: spec.timeOfDay,
    cameraPreset: spec.cameraPreset,
    icon: spec.icon,
    tint: spec.tint,
  }
}

// ── Builder: turn a spec into a SceneGraph with fresh IDs ─────────────────

export function buildStarterScene(id: StarterSceneId): SceneGraph {
  const spec = SCENES[id]

  const siteId = makeId('site')
  const buildingId = makeId('building')
  const levelId = makeId('level')

  const half = spec.siteHalfSize
  const sitePolygon: [number, number][] = [
    [-half, -half],
    [half, -half],
    [half, half],
    [-half, half],
  ]

  const slabIds = spec.slabs.map(() => makeId('slab'))
  const itemIds = spec.items.map(() => makeId('item'))

  const nodes: Record<string, unknown> = {}

  nodes[siteId] = {
    object: 'node',
    id: siteId,
    type: 'site',
    parentId: null,
    visible: true,
    metadata: { starterScene: id },
    polygon: { type: 'polygon', points: sitePolygon },
    children: [buildingId],
  }

  nodes[buildingId] = {
    object: 'node',
    id: buildingId,
    type: 'building',
    parentId: siteId,
    visible: true,
    metadata: {},
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    children: [levelId],
  }

  nodes[levelId] = {
    object: 'node',
    id: levelId,
    type: 'level',
    parentId: buildingId,
    visible: true,
    metadata: {},
    level: 0,
    children: [...slabIds, ...itemIds],
  }

  spec.slabs.forEach((slab, i) => {
    const sId = slabIds[i]!
    nodes[sId] = {
      object: 'node',
      id: sId,
      type: 'slab',
      parentId: levelId,
      visible: true,
      metadata: {},
      polygon: slab.polygon,
      holes: [],
      holeMetadata: [],
      elevation: slab.elevation ?? 0.05,
      autoFromWalls: false,
      ...(slab.materialPreset ? { materialPreset: slab.materialPreset } : {}),
      ...(slab.material ? { material: slab.material } : {}),
    }
  })

  spec.items.forEach((item, i) => {
    const iId = itemIds[i]!
    const asset = ASSETS[item.asset]!
    nodes[iId] = {
      object: 'node',
      id: iId,
      type: 'item',
      parentId: levelId,
      visible: true,
      metadata: {},
      position: item.position,
      rotation: [0, item.rotationY ?? 0, 0],
      scale: item.scale ?? [1, 1, 1],
      children: [],
      asset: {
        id: asset.id,
        category: asset.category,
        name: asset.name,
        thumbnail: asset.thumbnail,
        src: asset.src,
        dimensions: item.dimensions ?? asset.dimensions,
        offset: asset.offset,
        rotation: asset.rotation,
        scale: asset.scale,
        tags: asset.tags ?? [],
      },
    }
  })

  return {
    nodes,
    rootNodeIds: [siteId],
  }
}

export const STARTER_SCENES = SCENES

/**
 * Resolve the time-of-day + camera preset that should accompany a starter
 * scene. Mood-bound scenes inherit from MOODS; new scenes specify their
 * atmosphere directly via timeOfDay + cameraPreset fields.
 */
export function getStarterSceneAtmosphere(id: StarterSceneId): {
  timeOfDay?: TimeOfDay
  cameraPreset?: CameraPreset
  mood?: MoodId
} {
  const spec = SCENES[id]
  if (spec.mood) {
    return { mood: spec.mood }
  }
  return {
    timeOfDay: spec.timeOfDay,
    cameraPreset: spec.cameraPreset,
  }
}
