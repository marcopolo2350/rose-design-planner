'use client'

import type { CameraPreset, MoodId, TimeOfDay } from '@pascal-app/viewer'
import type { SceneGraph } from './scene'

export type StarterSceneId =
  | 'ultimateEstate'
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
  'mansion-block': {
    id: 'mansion-block',
    category: 'outdoor',
    name: 'Mansion',
    thumbnail: '/items/mansion-block/thumbnail.webp',
    src: 'proc://mansion-block',
    dimensions: [36, 7, 14],
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
  tesla: {
    id: 'tesla',
    category: 'outdoor',
    name: 'Tesla',
    thumbnail: '/items/tesla/thumbnail.webp',
    src: '/items/tesla/model.glb',
    dimensions: [2, 1.7, 5],
    offset: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    tags: ['floor', 'garage'],
  },
  'basket-hoop': {
    id: 'basket-hoop',
    category: 'outdoor',
    name: 'Basket Hoop',
    thumbnail: '/items/basket-hoop/thumbnail.webp',
    src: '/items/basket-hoop/model.glb',
    dimensions: [1.5, 3, 1],
    offset: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    tags: ['floor', 'sports'],
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

type WallSpec = {
  start: [number, number]
  end: [number, number]
  /** Wall height in meters (default 3m) */
  height?: number
  /** Wall thickness in meters (default 0.2m) */
  thickness?: number
  /** Library or legacy material preset ref */
  materialPreset?: string
}

type StarterSceneSpec = {
  id: StarterSceneId
  label: string
  description: string
  /** Square site half-size — final polygon is [-s,-s] to [s,s] */
  siteHalfSize: number
  slabs: SlabSpec[]
  items: ItemSpec[]
  /** Optional walls — used to construct the mansion silhouette in
   *  Ultimate Estate. Each wall is a 2-point segment with a height. */
  walls?: WallSpec[]
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
  // ── Ultimate Estate — the crown-jewel demo ─────────────────────────────
  // A massive evening hero scene built from every procedural item the
  // engine ships PLUS a real mansion silhouette: motor court with Tesla
  // in front of a 26m × 10m main residence with east + west wings and
  // flat roofs, then an infinity-edge pool with coping and shimmer,
  // pergola lounge, firepit circle, outdoor kitchen with dining for
  // eight, sport court, putting green, ringed perimeter of palms and
  // over thirty garden lanterns. Designed to be loaded directly into
  // Showcase Mode at evening so every light is glowing.
  ultimateEstate: {
    id: 'ultimateEstate',
    label: 'Ultimate Estate',
    description: 'A billionaire-tier evening estate — modern mansion, infinity pool, pergolas, firepit, kitchen, sport courts, motor court — every light glowing at once.',
    timeOfDay: 'evening',
    cameraPreset: 'showcase',
    icon: 'lucide:gem',
    tint: 'text-amber-300',
    siteHalfSize: 44,
    slabs: [
      // ── BASE LAWN — covers the whole property as manicured turf so no
      //    area reads as bare ground. Built zones are slabbed on top with
      //    elevation = 0.05 by default, which sits above this lawn (0.02). ──
      {
        polygon: [
          [-42, -42],
          [42, -42],
          [42, 38],
          [-42, 38],
        ],
        elevation: 0.02,
        material: {
          properties: {
            color: '#4f7a3a',
            roughness: 1,
            metalness: 0,
          },
        },
      },
      // ── Reflecting pool at motor court center — luxury hotel signature ──
      {
        polygon: [
          [-3, -26.5],
          [3, -26.5],
          [3, -23.5],
          [-3, -23.5],
        ],
        elevation: 0.06,
        material: {
          properties: {
            color: '#1a4f6d',
            roughness: 0.1,
            metalness: 0.6,
            opacity: 0.9,
            transparent: true,
          },
        },
      },
      // ── Motor court (south of mansion, where the driveway ends) ──
      // Sized to fit between the mansion's south face (z=-28) and the
      // driveway connection point (z=-22).
      {
        polygon: [
          [-9, -28],
          [9, -28],
          [9, -22],
          [-9, -22],
        ],
        materialPreset: 'library:wall-granite1',
      },
      // ── Driveway path (motor court → main level) ──
      {
        polygon: [
          [-2.5, -22],
          [2.5, -22],
          [2.5, -13],
          [-2.5, -13],
        ],
        materialPreset: 'library:wall-marble2',
      },
      // ── Main pool deck (centerpiece, huge) ──
      {
        polygon: [
          [-18, -13],
          [18, -13],
          [18, 11],
          [-18, 11],
        ],
        materialPreset: 'library:wall-marble2',
      },
      // ── Infinity-edge main pool ──
      {
        polygon: [
          [-7, -5],
          [7, -5],
          [7, 5],
          [-7, 5],
        ],
        elevation: 0.06,
        material: {
          properties: {
            color: '#1d6da8',
            roughness: 0.12,
            metalness: 0.5,
            opacity: 0.92,
            transparent: true,
          },
        },
      },
      // ── Spa / hot tub (deeper blue, hexagon-ish) at one end of pool ──
      {
        polygon: [
          [-12, -2.5],
          [-9.5, -3.5],
          [-8, -1.5],
          [-8.5, 1.5],
          [-10.5, 2.5],
          [-12.5, 1],
        ],
        elevation: 0.07,
        material: {
          properties: {
            color: '#0f4f78',
            roughness: 0.1,
            metalness: 0.55,
            opacity: 0.94,
            transparent: true,
          },
        },
      },
      // ── Tennis court (south of main deck) ──
      {
        polygon: [
          [-9, 14],
          [9, 14],
          [9, 26],
          [-9, 26],
        ],
        material: {
          properties: {
            color: '#3a6a4a',
            roughness: 0.95,
            metalness: 0,
          },
        },
      },
      // ── Putting green (west of tennis) ──
      {
        polygon: [
          [-22, 14],
          [-12, 14],
          [-12, 22],
          [-22, 22],
        ],
        material: {
          properties: {
            color: '#5c8a3a',
            roughness: 1,
            metalness: 0,
          },
        },
      },
      // ── Basketball half-court (east of tennis) ──
      {
        polygon: [
          [12, 14],
          [22, 14],
          [22, 22],
          [12, 22],
        ],
        material: {
          properties: {
            color: '#955a35',
            roughness: 0.9,
            metalness: 0,
          },
        },
      },
    ],
    items: [
      // ─── MAIN POOL (centerpiece) ────────────────────────────────────────
      // Stone coping wrapping the 14×10 water area
      { asset: 'pool-coping', position: [0, 0, 0], dimensions: [15, 0.12, 11] },
      // Caustic shimmer overlay sized to fit inside the coping
      { asset: 'pool-shimmer', position: [0, 0.07, 0], dimensions: [13.7, 0.02, 9.7] },
      // Sunbeds along the north long edge of the pool — 4 facing south
      { asset: 'sunbed', position: [-6, 0, -7], rotationY: 0 },
      { asset: 'sunbed', position: [-2, 0, -7], rotationY: 0 },
      { asset: 'sunbed', position: [2, 0, -7], rotationY: 0 },
      { asset: 'sunbed', position: [6, 0, -7], rotationY: 0 },
      { asset: 'patio-umbrella', position: [-4, 0, -7.5] },
      { asset: 'patio-umbrella', position: [4, 0, -7.5] },
      // Sunbeds along the south long edge — 4 facing north
      { asset: 'sunbed', position: [-6, 0, 7], rotationY: Math.PI },
      { asset: 'sunbed', position: [-2, 0, 7], rotationY: Math.PI },
      { asset: 'sunbed', position: [2, 0, 7], rotationY: Math.PI },
      { asset: 'sunbed', position: [6, 0, 7], rotationY: Math.PI },
      { asset: 'patio-umbrella', position: [-4, 0, 7.5] },
      { asset: 'patio-umbrella', position: [4, 0, 7.5] },

      // ─── EAST END: Pergola lounge with sofa + coffee table ──────────────
      { asset: 'pergola', position: [13, 0, 0] },
      { asset: 'sofa', position: [13, 0, 0], rotationY: -Math.PI / 2, scale: [1, 1, 1] },
      { asset: 'coffee-table', position: [13, 0, 1.6], scale: [0.6, 0.6, 0.6] },
      { asset: 'lounge-chair', position: [11.5, 0, 1.8], rotationY: -Math.PI / 4 },
      { asset: 'lounge-chair', position: [14.5, 0, 1.8], rotationY: -Math.PI * 0.75 },
      { asset: 'planter-box', position: [11, 0, -1.8] },
      { asset: 'planter-box', position: [15, 0, -1.8] },

      // ─── WEST END: Outdoor kitchen + grand dining ───────────────────────
      // Kitchen island
      { asset: 'outdoor-kitchen-island', position: [-15.5, 0, -8], rotationY: 0 },
      // Bar stool stand-ins (use small lounge chair scaled down — closest match)
      { asset: 'planter-box', position: [-13.5, 0, -8.2] },
      { asset: 'planter-box', position: [-17.5, 0, -8.2] },
      // Grand dining table for 8
      { asset: 'pergola', position: [-14, 0, 5] },
      { asset: 'dining-table', position: [-14, 0, 5], rotationY: Math.PI / 2 },
      { asset: 'dining-chair', position: [-15.7, 0, 5], rotationY: Math.PI / 2 },
      { asset: 'dining-chair', position: [-12.3, 0, 5], rotationY: -Math.PI / 2 },
      { asset: 'dining-chair', position: [-15, 0, 4], rotationY: 0 },
      { asset: 'dining-chair', position: [-13, 0, 4], rotationY: 0 },
      { asset: 'dining-chair', position: [-15, 0, 6], rotationY: Math.PI },
      { asset: 'dining-chair', position: [-13, 0, 6], rotationY: Math.PI },
      { asset: 'dining-chair', position: [-14.5, 0, 3], rotationY: 0 },
      { asset: 'dining-chair', position: [-13.5, 0, 7], rotationY: Math.PI },

      // ─── SOUTH-EAST: Firepit conversation circle ────────────────────────
      { asset: 'firepit', position: [14, 0, -8] },
      { asset: 'lounge-chair', position: [12.2, 0, -8], rotationY: -Math.PI / 2 },
      { asset: 'lounge-chair', position: [15.8, 0, -8], rotationY: Math.PI / 2 },
      { asset: 'lounge-chair', position: [14, 0, -9.8], rotationY: 0 },
      { asset: 'lounge-chair', position: [14, 0, -6.2], rotationY: Math.PI },
      { asset: 'planter-box', position: [11, 0, -10.5] },
      { asset: 'planter-box', position: [17, 0, -10.5] },

      // ─── SPA EDGE: Two flanking lounge chairs ──────────────────────────
      { asset: 'lounge-chair', position: [-10.5, 0, -5], rotationY: Math.PI / 6 },
      { asset: 'lounge-chair', position: [-13.5, 0, 4.5], rotationY: -Math.PI / 6 },

      // ─── MOTOR COURT (z=-22 to -28, in front of mansion's south face) ─
      { asset: 'tesla', position: [-3, 0, -25], rotationY: 0 },
      { asset: 'tesla', position: [3, 0, -25], rotationY: 0 },
      { asset: 'planter-box', position: [-7.5, 0, -23] },
      { asset: 'planter-box', position: [7.5, 0, -23] },
      { asset: 'palm', position: [-11, 0, -25], scale: [0.5, 0.5, 0.5] },
      { asset: 'palm', position: [11, 0, -25], scale: [0.5, 0.5, 0.5] },
      { asset: 'garden-lantern', position: [-8.5, 0, -22.5] },
      { asset: 'garden-lantern', position: [8.5, 0, -22.5] },

      // ─── DRIVEWAY PATH (motor court → main level) ──────────────────────
      { asset: 'stepping-stone', position: [0, 0, -21], scale: [1.3, 1, 1.3] },
      { asset: 'stepping-stone', position: [0, 0, -19], scale: [1.3, 1, 1.3] },
      { asset: 'stepping-stone', position: [0, 0, -17], scale: [1.3, 1, 1.3] },
      { asset: 'stepping-stone', position: [0, 0, -15], scale: [1.3, 1, 1.3] },
      { asset: 'garden-lantern', position: [-2.5, 0, -20] },
      { asset: 'garden-lantern', position: [2.5, 0, -18] },
      { asset: 'garden-lantern', position: [-2.5, 0, -16] },
      { asset: 'tree', position: [-5, 0, -19], scale: [0.6, 0.6, 0.6] },
      { asset: 'tree', position: [5, 0, -19], scale: [0.6, 0.6, 0.6] },
      { asset: 'fir-tree', position: [-6, 0, -16], scale: [1.1, 1.1, 1.1] },
      { asset: 'fir-tree', position: [6, 0, -16], scale: [1.1, 1.1, 1.1] },

      // ─── POOL DECK PERIMETER LANTERNS ───────────────────────────────────
      // North edge
      { asset: 'garden-lantern', position: [-15, 0, -12] },
      { asset: 'garden-lantern', position: [-9, 0, -12] },
      { asset: 'garden-lantern', position: [-3, 0, -12] },
      { asset: 'garden-lantern', position: [3, 0, -12] },
      { asset: 'garden-lantern', position: [9, 0, -12] },
      { asset: 'garden-lantern', position: [15, 0, -12] },
      // South edge
      { asset: 'garden-lantern', position: [-15, 0, 10] },
      { asset: 'garden-lantern', position: [-9, 0, 10] },
      { asset: 'garden-lantern', position: [-3, 0, 10] },
      { asset: 'garden-lantern', position: [3, 0, 10] },
      { asset: 'garden-lantern', position: [9, 0, 10] },
      { asset: 'garden-lantern', position: [15, 0, 10] },
      // West & east edges
      { asset: 'garden-lantern', position: [-17.5, 0, -2] },
      { asset: 'garden-lantern', position: [-17.5, 0, 2] },
      { asset: 'garden-lantern', position: [17.5, 0, -2] },
      { asset: 'garden-lantern', position: [17.5, 0, 2] },

      // ─── SPORT COURTS ───────────────────────────────────────────────────
      // Tennis court — corner lanterns
      { asset: 'garden-lantern', position: [-8.5, 0, 14.5] },
      { asset: 'garden-lantern', position: [8.5, 0, 14.5] },
      { asset: 'garden-lantern', position: [-8.5, 0, 25.5] },
      { asset: 'garden-lantern', position: [8.5, 0, 25.5] },
      // Basketball court — hoop + corner lights
      { asset: 'basket-hoop', position: [21, 0, 18] },
      { asset: 'garden-lantern', position: [12.5, 0, 14.5] },
      { asset: 'garden-lantern', position: [21.5, 0, 21.5] },
      // Putting green corners
      { asset: 'garden-lantern', position: [-21.5, 0, 14.5] },
      { asset: 'garden-lantern', position: [-12.5, 0, 21.5] },

      // ─── LANDSCAPING (palms + trees + bushes ringing the property) ─────
      // North (back) row
      { asset: 'palm', position: [-22, 0, -8], scale: [0.55, 0.55, 0.55] },
      { asset: 'palm', position: [22, 0, -8], scale: [0.55, 0.55, 0.55] },
      { asset: 'palm', position: [-26, 0, -2], scale: [0.5, 0.5, 0.5] },
      { asset: 'palm', position: [26, 0, -2], scale: [0.5, 0.5, 0.5] },
      // Middle row
      { asset: 'palm', position: [-26, 0, 6], scale: [0.5, 0.5, 0.5] },
      { asset: 'palm', position: [26, 0, 6], scale: [0.5, 0.5, 0.5] },
      // South perimeter
      { asset: 'palm', position: [-28, 0, 18], scale: [0.5, 0.5, 0.5] },
      { asset: 'palm', position: [28, 0, 18], scale: [0.5, 0.5, 0.5] },
      { asset: 'palm', position: [-28, 0, 28], scale: [0.5, 0.5, 0.5] },
      { asset: 'palm', position: [28, 0, 28], scale: [0.5, 0.5, 0.5] },
      // Distant trees for depth
      { asset: 'tree', position: [-30, 0, -12], scale: [0.6, 0.6, 0.6] },
      { asset: 'tree', position: [30, 0, -12], scale: [0.6, 0.6, 0.6] },
      { asset: 'fir-tree', position: [-32, 0, 0], scale: [1.4, 1.4, 1.4] },
      { asset: 'fir-tree', position: [32, 0, 0], scale: [1.4, 1.4, 1.4] },
      { asset: 'fir-tree', position: [-32, 0, 22], scale: [1.4, 1.4, 1.4] },
      { asset: 'fir-tree', position: [32, 0, 22], scale: [1.4, 1.4, 1.4] },
      // Bushes softening corners
      { asset: 'bush', position: [-19, 0, -13.5], scale: [0.7, 0.7, 0.7] },
      { asset: 'bush', position: [19, 0, -13.5], scale: [0.7, 0.7, 0.7] },
      { asset: 'bush', position: [-19, 0, 12], scale: [0.7, 0.7, 0.7] },
      { asset: 'bush', position: [19, 0, 12], scale: [0.7, 0.7, 0.7] },
      { asset: 'bush', position: [-12, 0, -34], scale: [0.6, 0.6, 0.6] },
      { asset: 'bush', position: [12, 0, -34], scale: [0.6, 0.6, 0.6] },

      // ── THE MANSION ─────────────────────────────────────────────────────
      // A modern luxury home rendered as a single procedural item that
      // builds the main mass + setback second story + east + west wings
      // + front-entry portico inline. The south facade has emissive
      // glass panels that glow at dusk/evening. Positioned so the
      // mansion's south face sits at z=-28 (just behind the motor court)
      // and its north face at z=-42.
      { asset: 'mansion-block', position: [0, 0, -35], dimensions: [36, 7, 14] },

      // ── ROOF DECK ITEMS (sit ON the main roof at y ≈ 7.2) ─────────────
      // Roof terrace lanterns spread across the rear roof edge (z=-28.5)
      { asset: 'garden-lantern', position: [-16, 7.2, -28.5] },
      { asset: 'garden-lantern', position: [-12, 7.2, -28.5] },
      { asset: 'garden-lantern', position: [12, 7.2, -28.5] },
      { asset: 'garden-lantern', position: [16, 7.2, -28.5] },
      // Roof terrace planters
      { asset: 'planter-box', position: [-15, 7.2, -31] },
      { asset: 'planter-box', position: [15, 7.2, -31] },
      // Two lounge chairs on the roof deck (rear-side, looking at pool)
      { asset: 'lounge-chair', position: [-3, 7.2, -29], rotationY: Math.PI },
      { asset: 'lounge-chair', position: [3, 7.2, -29], rotationY: Math.PI },

      // ── COVERED REAR PATIO ITEMS (between mansion and pool) ──────────
      // The south face of the mansion is at z=-28. Pool deck starts at
      // z=-13. So z=-22 to z=-13 is "rear patio" — outdoor connection.
      { asset: 'garden-lantern', position: [-14, 0, -16] },
      { asset: 'garden-lantern', position: [14, 0, -16] },

      // ── FOUNDATION PLANTINGS along the south facade of the mansion ──
      // Boxwood-row planters lining the base of the mansion's south wall
      // (mansion south face at z=-28; place planters just in front at z=-27.4)
      { asset: 'planter-box', position: [-15, 0, -27.4] },
      { asset: 'planter-box', position: [-12, 0, -27.4] },
      { asset: 'planter-box', position: [-9, 0, -27.4] },
      { asset: 'planter-box', position: [9, 0, -27.4] },
      { asset: 'planter-box', position: [12, 0, -27.4] },
      { asset: 'planter-box', position: [15, 0, -27.4] },
      // Bushes nestled at the wing corners
      { asset: 'bush', position: [-25, 0, -28], scale: [0.7, 0.7, 0.7] },
      { asset: 'bush', position: [25, 0, -28], scale: [0.7, 0.7, 0.7] },
      { asset: 'bush', position: [-22, 0, -23], scale: [0.6, 0.6, 0.6] },
      { asset: 'bush', position: [22, 0, -23], scale: [0.6, 0.6, 0.6] },

      // ── DRIVEWAY LANDSCAPING — palm-lined approach ────────────────────
      // The driveway path runs z=-22 to z=-13 (9m corridor x=-2.5..2.5).
      // Line each side with palms + lanterns for the "luxury arrival" feel.
      { asset: 'palm', position: [-4, 0, -20], scale: [0.4, 0.4, 0.4] },
      { asset: 'palm', position: [4, 0, -20], scale: [0.4, 0.4, 0.4] },
      { asset: 'palm', position: [-4, 0, -16], scale: [0.4, 0.4, 0.4] },
      { asset: 'palm', position: [4, 0, -16], scale: [0.4, 0.4, 0.4] },
      // Driveway lanterns
      { asset: 'garden-lantern', position: [-3.5, 0, -19] },
      { asset: 'garden-lantern', position: [3.5, 0, -17] },
      { asset: 'garden-lantern', position: [-3.5, 0, -15] },
      { asset: 'garden-lantern', position: [3.5, 0, -14] },
      // Boxwood hedges along the driveway
      { asset: 'planter-box', position: [-3.5, 0, -21] },
      { asset: 'planter-box', position: [3.5, 0, -21] },
      { asset: 'planter-box', position: [-3.5, 0, -13.5] },
      { asset: 'planter-box', position: [3.5, 0, -13.5] },

      // ── REAR-FACADE FOUNDATION PLANTINGS (mansion meets pool deck) ────
      // The south facade of the mansion needs landscaping too — a soft
      // band of bushes between the mansion and the pool deck.
      { asset: 'bush', position: [-17, 0, -25], scale: [0.55, 0.55, 0.55] },
      { asset: 'bush', position: [17, 0, -25], scale: [0.55, 0.55, 0.55] },

      // ─── LUXURY UPGRADE PASS ──────────────────────────────────────────
      // Everything below is the art-direction upgrade. Each block adds
      // landscaping density, zone transitions, lighting drama, or
      // furnished living moments.

      // ── PROPERTY-PERIMETER HEDGE ROWS (privacy buffer + visual frame) ──
      // Long stretched planter-boxes render as continuous boxwood hedges
      // because PlanterBox detects aspect-ratio > 1.6 and tiles foliage.
      // West perimeter — three segments (skipping where palms break the line)
      { asset: 'planter-box', position: [-30, 0, -32], dimensions: [1, 0.85, 6] },
      { asset: 'planter-box', position: [-30, 0, -22], dimensions: [1, 0.85, 6] },
      { asset: 'planter-box', position: [-30, 0, -12], dimensions: [1, 0.85, 6] },
      { asset: 'planter-box', position: [-30, 0, 5], dimensions: [1, 0.85, 8] },
      { asset: 'planter-box', position: [-30, 0, 26], dimensions: [1, 0.85, 8] },
      // East perimeter
      { asset: 'planter-box', position: [30, 0, -32], dimensions: [1, 0.85, 6] },
      { asset: 'planter-box', position: [30, 0, -22], dimensions: [1, 0.85, 6] },
      { asset: 'planter-box', position: [30, 0, -12], dimensions: [1, 0.85, 6] },
      { asset: 'planter-box', position: [30, 0, 5], dimensions: [1, 0.85, 8] },
      { asset: 'planter-box', position: [30, 0, 26], dimensions: [1, 0.85, 8] },
      // South perimeter (back of property, beyond mansion)
      { asset: 'planter-box', position: [-22, 0, -42], dimensions: [12, 0.85, 1] },
      { asset: 'planter-box', position: [-8, 0, -42], dimensions: [12, 0.85, 1] },
      { asset: 'planter-box', position: [8, 0, -42], dimensions: [12, 0.85, 1] },
      { asset: 'planter-box', position: [22, 0, -42], dimensions: [12, 0.85, 1] },
      // North perimeter (back of property, beyond sport courts)
      { asset: 'planter-box', position: [-22, 0, 30], dimensions: [12, 0.85, 1] },
      { asset: 'planter-box', position: [-8, 0, 30], dimensions: [12, 0.85, 1] },
      { asset: 'planter-box', position: [8, 0, 30], dimensions: [12, 0.85, 1] },
      { asset: 'planter-box', position: [22, 0, 30], dimensions: [12, 0.85, 1] },

      // ── DRIVEWAY HEDGE ROWS (luxury arrival corridor) ──────────────────
      { asset: 'planter-box', position: [-3.6, 0, -17.5], dimensions: [0.8, 0.85, 7] },
      { asset: 'planter-box', position: [3.6, 0, -17.5], dimensions: [0.8, 0.85, 7] },

      // ── MOTOR-COURT REFLECTING-POOL SURROUND ───────────────────────────
      // Stone coping ring around the entry water feature
      { asset: 'pool-coping', position: [0, 0, -25], dimensions: [6.4, 0.08, 3.4] },
      // Twin urns flanking the reflecting pool
      { asset: 'planter-box', position: [-4, 0, -25], scale: [0.85, 1.1, 0.85] },
      { asset: 'planter-box', position: [4, 0, -25], scale: [0.85, 1.1, 0.85] },
      // Welcome lanterns at reflecting-pool corners
      { asset: 'garden-lantern', position: [-3.4, 0, -23.2] },
      { asset: 'garden-lantern', position: [3.4, 0, -23.2] },
      { asset: 'garden-lantern', position: [-3.4, 0, -26.8] },
      { asset: 'garden-lantern', position: [3.4, 0, -26.8] },

      // ── DENSE LANDSCAPING — bush clusters at zone seams ────────────────
      // Pool deck NE corner cluster
      { asset: 'bush', position: [16.5, 0, -11.5], scale: [0.7, 0.7, 0.7] },
      { asset: 'bush', position: [17.5, 0, -10.5], scale: [0.55, 0.55, 0.55] },
      { asset: 'bush', position: [18.5, 0, -12], scale: [0.5, 0.5, 0.5] },
      // Pool deck NW corner cluster
      { asset: 'bush', position: [-16.5, 0, -11.5], scale: [0.7, 0.7, 0.7] },
      { asset: 'bush', position: [-17.5, 0, -10.5], scale: [0.55, 0.55, 0.55] },
      { asset: 'bush', position: [-18.5, 0, -12], scale: [0.5, 0.5, 0.5] },
      // Pool deck SE corner cluster
      { asset: 'bush', position: [16.5, 0, 12], scale: [0.7, 0.7, 0.7] },
      { asset: 'bush', position: [18, 0, 11], scale: [0.55, 0.55, 0.55] },
      { asset: 'bush', position: [19, 0, 12.5], scale: [0.5, 0.5, 0.5] },
      // Pool deck SW corner cluster
      { asset: 'bush', position: [-16.5, 0, 12], scale: [0.7, 0.7, 0.7] },
      { asset: 'bush', position: [-18, 0, 11], scale: [0.55, 0.55, 0.55] },
      { asset: 'bush', position: [-19, 0, 12.5], scale: [0.5, 0.5, 0.5] },
      // Tennis court sidelines
      { asset: 'bush', position: [-10.5, 0, 17], scale: [0.55, 0.55, 0.55] },
      { asset: 'bush', position: [10.5, 0, 17], scale: [0.55, 0.55, 0.55] },
      { asset: 'bush', position: [-10.5, 0, 23], scale: [0.5, 0.5, 0.5] },
      { asset: 'bush', position: [10.5, 0, 23], scale: [0.5, 0.5, 0.5] },
      // Putting green frame
      { asset: 'bush', position: [-23, 0, 16], scale: [0.55, 0.55, 0.55] },
      { asset: 'bush', position: [-23, 0, 20], scale: [0.5, 0.5, 0.5] },
      // Basketball court frame
      { asset: 'bush', position: [23, 0, 16], scale: [0.55, 0.55, 0.55] },
      { asset: 'bush', position: [23, 0, 20], scale: [0.5, 0.5, 0.5] },
      // South side (between motor court and pool deck) — frame the zone
      { asset: 'bush', position: [-13, 0, -19], scale: [0.55, 0.55, 0.55] },
      { asset: 'bush', position: [13, 0, -19], scale: [0.55, 0.55, 0.55] },
      { asset: 'bush', position: [-13, 0, -16], scale: [0.5, 0.5, 0.5] },
      { asset: 'bush', position: [13, 0, -16], scale: [0.5, 0.5, 0.5] },

      // ── ORNAMENTAL TREES adding mid-canopy depth ──────────────────────
      { asset: 'tree', position: [-25, 0, -15], scale: [0.7, 0.7, 0.7] },
      { asset: 'tree', position: [25, 0, -15], scale: [0.7, 0.7, 0.7] },
      { asset: 'tree', position: [-25, 0, 8], scale: [0.65, 0.65, 0.65] },
      { asset: 'tree', position: [25, 0, 8], scale: [0.65, 0.65, 0.65] },
      { asset: 'tree', position: [-26, 0, 24], scale: [0.6, 0.6, 0.6] },
      { asset: 'tree', position: [26, 0, 24], scale: [0.6, 0.6, 0.6] },
      // Far-back trees
      { asset: 'tree', position: [-18, 0, -39], scale: [0.55, 0.55, 0.55] },
      { asset: 'tree', position: [18, 0, -39], scale: [0.55, 0.55, 0.55] },
      { asset: 'tree', position: [-15, 0, 35], scale: [0.55, 0.55, 0.55] },
      { asset: 'tree', position: [15, 0, 35], scale: [0.55, 0.55, 0.55] },
      // Driveway entry trees
      { asset: 'tree', position: [-9, 0, -32], scale: [0.55, 0.55, 0.55] },
      { asset: 'tree', position: [9, 0, -32], scale: [0.55, 0.55, 0.55] },

      // ── ADDITIONAL PALMS — denser ring, varied scales ─────────────────
      { asset: 'palm', position: [-32, 0, -28], scale: [0.55, 0.55, 0.55] },
      { asset: 'palm', position: [32, 0, -28], scale: [0.55, 0.55, 0.55] },
      { asset: 'palm', position: [-36, 0, -20], scale: [0.5, 0.5, 0.5] },
      { asset: 'palm', position: [36, 0, -20], scale: [0.5, 0.5, 0.5] },
      { asset: 'palm', position: [-36, 0, 12], scale: [0.48, 0.48, 0.48] },
      { asset: 'palm', position: [36, 0, 12], scale: [0.48, 0.48, 0.48] },
      { asset: 'palm', position: [-36, 0, 24], scale: [0.46, 0.46, 0.46] },
      { asset: 'palm', position: [36, 0, 24], scale: [0.46, 0.46, 0.46] },
      // Motor court approach palms
      { asset: 'palm', position: [-7, 0, -29.5], scale: [0.42, 0.42, 0.42] },
      { asset: 'palm', position: [7, 0, -29.5], scale: [0.42, 0.42, 0.42] },

      // ── STEPPING-STONE PATHS connecting zones ──────────────────────────
      // Pool deck → Tennis court connector (north-south through the lawn)
      { asset: 'stepping-stone', position: [0, 0, 11.7], scale: [1.4, 1, 1.4] },
      { asset: 'stepping-stone', position: [0, 0, 12.5], scale: [1.4, 1, 1.4] },
      { asset: 'stepping-stone', position: [0, 0, 13.2], scale: [1.4, 1, 1.4] },
      // Pool deck → Putting green connector (west through the lawn)
      { asset: 'stepping-stone', position: [-19, 0, 13], scale: [1.2, 1, 1.2] },
      { asset: 'stepping-stone', position: [-21, 0, 13], scale: [1.2, 1, 1.2] },
      // Pool deck → Basketball court connector (east through the lawn)
      { asset: 'stepping-stone', position: [19, 0, 13], scale: [1.2, 1, 1.2] },
      { asset: 'stepping-stone', position: [21, 0, 13], scale: [1.2, 1, 1.2] },

      // ── LAWN-SIDE PERIMETER LANTERNS — soft glow at property edges ─────
      // West perimeter
      { asset: 'garden-lantern', position: [-29, 0, -36] },
      { asset: 'garden-lantern', position: [-29, 0, -28] },
      { asset: 'garden-lantern', position: [-29, 0, -19] },
      { asset: 'garden-lantern', position: [-29, 0, -8] },
      { asset: 'garden-lantern', position: [-29, 0, 1] },
      { asset: 'garden-lantern', position: [-29, 0, 11] },
      { asset: 'garden-lantern', position: [-29, 0, 22] },
      { asset: 'garden-lantern', position: [-29, 0, 30] },
      // East perimeter
      { asset: 'garden-lantern', position: [29, 0, -36] },
      { asset: 'garden-lantern', position: [29, 0, -28] },
      { asset: 'garden-lantern', position: [29, 0, -19] },
      { asset: 'garden-lantern', position: [29, 0, -8] },
      { asset: 'garden-lantern', position: [29, 0, 1] },
      { asset: 'garden-lantern', position: [29, 0, 11] },
      { asset: 'garden-lantern', position: [29, 0, 22] },
      { asset: 'garden-lantern', position: [29, 0, 30] },
      // South back (behind mansion)
      { asset: 'garden-lantern', position: [-15, 0, -41] },
      { asset: 'garden-lantern', position: [-5, 0, -41] },
      { asset: 'garden-lantern', position: [5, 0, -41] },
      { asset: 'garden-lantern', position: [15, 0, -41] },
      // North back (behind courts)
      { asset: 'garden-lantern', position: [-15, 0, 33] },
      { asset: 'garden-lantern', position: [-5, 0, 33] },
      { asset: 'garden-lantern', position: [5, 0, 33] },
      { asset: 'garden-lantern', position: [15, 0, 33] },

      // ── KITCHEN BAR STOOLS (small lounge chairs scaled down) ──────────
      // The outdoor kitchen island sits at [-15.5, 0, -8] facing south.
      // Bar stools line the south side facing the chefs.
      { asset: 'lounge-chair', position: [-16.5, 0, -7.1], rotationY: 0, scale: [0.4, 0.6, 0.4] },
      { asset: 'lounge-chair', position: [-15.5, 0, -7.1], rotationY: 0, scale: [0.4, 0.6, 0.4] },
      { asset: 'lounge-chair', position: [-14.5, 0, -7.1], rotationY: 0, scale: [0.4, 0.6, 0.4] },
      // Side prep planters with herbs
      { asset: 'planter-box', position: [-16.7, 0, -9.3], scale: [0.6, 0.7, 0.6] },
      { asset: 'planter-box', position: [-14.3, 0, -9.3], scale: [0.6, 0.7, 0.6] },

      // ── FIREPIT EXPANSION — more chairs, planter ring, extra warmth ───
      // Add 2 more chairs to make a 6-chair conversation circle
      { asset: 'lounge-chair', position: [12.6, 0, -10.0], rotationY: -Math.PI / 4 },
      { asset: 'lounge-chair', position: [15.4, 0, -10.0], rotationY: Math.PI / 4 },
      // Side tables
      { asset: 'coffee-table', position: [16.5, 0, -8], scale: [0.4, 0.4, 0.4] },
      { asset: 'coffee-table', position: [11.5, 0, -8], scale: [0.4, 0.4, 0.4] },
      // Planter ring around the firepit
      { asset: 'planter-box', position: [10, 0, -7], scale: [0.7, 0.7, 0.7] },
      { asset: 'planter-box', position: [18, 0, -7], scale: [0.7, 0.7, 0.7] },

      // ── PERGOLA LOUNGE EXPANSION (east end) ───────────────────────────
      // Side-table + extra chair to make the lounge feel populated
      { asset: 'coffee-table', position: [13, 0, -1.6], scale: [0.5, 0.5, 0.5] },
      { asset: 'lounge-chair', position: [11, 0, 0], rotationY: Math.PI / 2, scale: [0.85, 0.85, 0.85] },
      { asset: 'lounge-chair', position: [15, 0, 0], rotationY: -Math.PI / 2, scale: [0.85, 0.85, 0.85] },
      { asset: 'planter-box', position: [13, 0, -2.4], scale: [0.7, 0.85, 0.7] },

      // ── ROOF DECK FURNITURE — sky lounge moment ────────────────────────
      // Roof deck is at y ≈ 7.2; mansion is at z=-35 so roof spans z=-42..-28
      // Existing roof items: 2 lounge chairs at z=-29, lanterns at z=-28.5,
      // planters at z=-31. Add a coffee table + a sofa group at the front.
      { asset: 'coffee-table', position: [0, 7.2, -29.5], scale: [0.7, 0.7, 0.7] },
      { asset: 'sofa', position: [0, 7.2, -31], rotationY: 0, scale: [0.85, 0.85, 0.85] },
      { asset: 'planter-box', position: [-8, 7.2, -29] },
      { asset: 'planter-box', position: [8, 7.2, -29] },
      { asset: 'garden-lantern', position: [-6, 7.2, -29.5] },
      { asset: 'garden-lantern', position: [6, 7.2, -29.5] },

      // ── COURTYARD RECESSED LIGHTING — emissive lanterns flanking entry ──
      { asset: 'garden-lantern', position: [-1.5, 0, -27.6] },
      { asset: 'garden-lantern', position: [1.5, 0, -27.6] },
      { asset: 'garden-lantern', position: [-2.5, 0, -22.3] },
      { asset: 'garden-lantern', position: [2.5, 0, -22.3] },

      // ── SPA-SIDE PLANTERS ──────────────────────────────────────────────
      // Frame the hot tub with planters and a single lantern accent
      { asset: 'planter-box', position: [-13, 0, -4], scale: [0.7, 0.85, 0.7] },
      { asset: 'planter-box', position: [-13, 0, 4], scale: [0.7, 0.85, 0.7] },
      { asset: 'garden-lantern', position: [-13.5, 0, 0] },

      // ── DRIVEWAY-EDGE PERIMETER LANTERNS — arrival glow ───────────────
      { asset: 'garden-lantern', position: [-4.2, 0, -27] },
      { asset: 'garden-lantern', position: [4.2, 0, -27] },

      // ── SIDE-YARD SOFTENING — bushes between mansion wings & perimeter ─
      { asset: 'bush', position: [-26, 0, -34], scale: [0.6, 0.6, 0.6] },
      { asset: 'bush', position: [26, 0, -34], scale: [0.6, 0.6, 0.6] },
      { asset: 'bush', position: [-25, 0, -36], scale: [0.5, 0.5, 0.5] },
      { asset: 'bush', position: [25, 0, -36], scale: [0.5, 0.5, 0.5] },
      { asset: 'bush', position: [-21, 0, -38], scale: [0.55, 0.55, 0.55] },
      { asset: 'bush', position: [21, 0, -38], scale: [0.55, 0.55, 0.55] },

      // ── BACK-LAWN ORNAMENT — dense planted clusters between courts ────
      { asset: 'bush', position: [0, 0, 27.5], scale: [0.6, 0.6, 0.6] },
      { asset: 'bush', position: [-1.5, 0, 28.5], scale: [0.5, 0.5, 0.5] },
      { asset: 'bush', position: [1.5, 0, 28.5], scale: [0.5, 0.5, 0.5] },
      { asset: 'tree', position: [0, 0, 30], scale: [0.55, 0.55, 0.55] },
    ],
  },

  gardenRetreat: {
    id: 'gardenRetreat',
    label: 'Garden retreat',
    description: 'A private luxury garden — pergola lounge, layered planters, stepping path, and dining under the trees.',
    mood: 'gardenRetreat',
    siteHalfSize: 16,
    slabs: [
      // Base lawn — manicured turf covering the whole property so no
      // bare-ground reads. Built zones layer above on default 0.05 elevation.
      {
        polygon: [
          [-15, -15],
          [15, -15],
          [15, 15],
          [-15, 15],
        ],
        elevation: 0.02,
        material: {
          properties: {
            color: '#4f7a3a',
            roughness: 1,
            metalness: 0,
          },
        },
      },
      // Main wooden lounge patio (back/north)
      {
        polygon: [
          [-4, -8],
          [4, -8],
          [4, -3],
          [-4, -3],
        ],
        materialPreset: 'library:wall-wood1',
      },
      // Marble dining patio (south, smaller)
      {
        polygon: [
          [-3, 4],
          [3, 4],
          [3, 8],
          [-3, 8],
        ],
        materialPreset: 'library:wall-marble2',
      },
      // Stone paving stripe linking the two patios (path through the garden)
      {
        polygon: [
          [-1, -3],
          [1, -3],
          [1, 4],
          [-1, 4],
        ],
        materialPreset: 'library:wall-granite1',
      },
      // ── REFLECTING POOL — small water feature midway along the path ──
      // A koi-pond moment. Sits inset to the east of the path between the
      // two patios — gives the garden a contemplative center.
      {
        polygon: [
          [1.6, -1.5],
          [4.5, -1.5],
          [4.5, 2.5],
          [1.6, 2.5],
        ],
        elevation: 0.06,
        material: {
          properties: {
            color: '#1e4a36',
            roughness: 0.1,
            metalness: 0.55,
            opacity: 0.92,
            transparent: true,
          },
        },
      },
      // ── COZY FIREPIT NOOK — tucked into the west side ──
      // Small marble paver platform for an intimate fire moment.
      {
        polygon: [
          [-7, -1],
          [-3, -1],
          [-3, 3],
          [-7, 3],
        ],
        materialPreset: 'library:wall-granite1',
      },
    ],
    items: [
      // ── PERGOLA OVER THE LOUNGE PATIO ───────────────────────────────────
      { asset: 'pergola', position: [0, 0, -5.5] },
      // Lounge furniture under the pergola
      { asset: 'sofa', position: [0, 0, -5.5], rotationY: 0, scale: [0.95, 0.95, 0.95] },
      { asset: 'coffee-table', position: [0, 0, -4.2], scale: [0.7, 0.7, 0.7] },
      { asset: 'lounge-chair', position: [-2.6, 0, -5], rotationY: -Math.PI / 2.2 },
      { asset: 'lounge-chair', position: [2.6, 0, -5], rotationY: Math.PI / 2.2 },

      // ── DINING MOMENT (south marble patio) ──────────────────────────────
      { asset: 'dining-table', position: [0, 0, 6], rotationY: Math.PI / 2 },
      { asset: 'dining-chair', position: [-1.6, 0, 6], rotationY: Math.PI / 2 },
      { asset: 'dining-chair', position: [1.6, 0, 6], rotationY: -Math.PI / 2 },
      { asset: 'dining-chair', position: [0, 0, 4.8], rotationY: 0 },
      { asset: 'dining-chair', position: [0, 0, 7.2], rotationY: Math.PI },
      { asset: 'patio-umbrella', position: [0, 0, 6.2] },

      // ── STEPPING-STONE PATH connecting the two patios ──────────────────
      { asset: 'stepping-stone', position: [0, 0, -2.4], scale: [1.2, 1, 1.2] },
      { asset: 'stepping-stone', position: [0, 0, -1.4], scale: [1.2, 1, 1.2] },
      { asset: 'stepping-stone', position: [0, 0, -0.4], scale: [1.2, 1, 1.2] },
      { asset: 'stepping-stone', position: [0, 0, 0.6], scale: [1.2, 1, 1.2] },
      { asset: 'stepping-stone', position: [0, 0, 1.6], scale: [1.2, 1, 1.2] },
      { asset: 'stepping-stone', position: [0, 0, 2.6], scale: [1.2, 1, 1.2] },

      // ── LANTERNS framing the path and patios ────────────────────────────
      { asset: 'garden-lantern', position: [-1.5, 0, -1] },
      { asset: 'garden-lantern', position: [1.5, 0, 0.5] },
      { asset: 'garden-lantern', position: [-1.5, 0, 2] },
      { asset: 'garden-lantern', position: [1.5, 0, 3.5] },
      // Lounge patio corner lanterns
      { asset: 'garden-lantern', position: [-4.3, 0, -7.5] },
      { asset: 'garden-lantern', position: [4.3, 0, -7.5] },
      { asset: 'garden-lantern', position: [-4.3, 0, -3.3] },
      { asset: 'garden-lantern', position: [4.3, 0, -3.3] },
      // Dining patio corner lanterns
      { asset: 'garden-lantern', position: [-3.3, 0, 3.7] },
      { asset: 'garden-lantern', position: [3.3, 0, 3.7] },
      { asset: 'garden-lantern', position: [-3.3, 0, 8.3] },
      { asset: 'garden-lantern', position: [3.3, 0, 8.3] },

      // ── LAYERED PLANTERS at varied positions ────────────────────────────
      // Around lounge pergola
      { asset: 'planter-box', position: [-4.5, 0, -5.5] },
      { asset: 'planter-box', position: [4.5, 0, -5.5] },
      { asset: 'planter-box', position: [-3, 0, -2] },
      { asset: 'planter-box', position: [3, 0, -2] },
      // Along the path
      { asset: 'planter-box', position: [-2.4, 0, 0] },
      { asset: 'planter-box', position: [2.4, 0, 0] },
      // Around dining patio
      { asset: 'planter-box', position: [-3.5, 0, 5] },
      { asset: 'planter-box', position: [3.5, 0, 5] },
      { asset: 'planter-box', position: [-3.5, 0, 7.5] },
      { asset: 'planter-box', position: [3.5, 0, 7.5] },

      // ── DENSE LANDSCAPING (bushes + trees) ──────────────────────────────
      // Trees framing the property — multi-layer depth
      { asset: 'tree', position: [-12, 0, -12], scale: [0.7, 0.7, 0.7] },
      { asset: 'tree', position: [12, 0, -12], scale: [0.7, 0.7, 0.7] },
      { asset: 'tree', position: [-13, 0, 0], scale: [0.6, 0.6, 0.6] },
      { asset: 'tree', position: [13, 0, 0], scale: [0.6, 0.6, 0.6] },
      { asset: 'tree', position: [-13, 0, 11], scale: [0.55, 0.55, 0.55] },
      { asset: 'tree', position: [13, 0, 11], scale: [0.55, 0.55, 0.55] },
      // Fir trees for evergreen depth at the back
      { asset: 'fir-tree', position: [-9, 0, -13], scale: [1.4, 1.4, 1.4] },
      { asset: 'fir-tree', position: [9, 0, -13], scale: [1.4, 1.4, 1.4] },
      { asset: 'fir-tree', position: [0, 0, -14], scale: [1.6, 1.6, 1.6] },
      // Bushes — many, varied sizes for that "lush garden" density
      { asset: 'bush', position: [-7, 0, -8], scale: [0.85, 0.85, 0.85] },
      { asset: 'bush', position: [7, 0, -8], scale: [0.85, 0.85, 0.85] },
      { asset: 'bush', position: [-9, 0, -4], scale: [0.7, 0.7, 0.7] },
      { asset: 'bush', position: [9, 0, -4], scale: [0.7, 0.7, 0.7] },
      { asset: 'bush', position: [-10, 0, 4], scale: [0.65, 0.65, 0.65] },
      { asset: 'bush', position: [10, 0, 4], scale: [0.65, 0.65, 0.65] },
      { asset: 'bush', position: [-7, 0, 9], scale: [0.6, 0.6, 0.6] },
      { asset: 'bush', position: [7, 0, 9], scale: [0.6, 0.6, 0.6] },
      { asset: 'bush', position: [-5, 0, 10], scale: [0.55, 0.55, 0.55] },
      { asset: 'bush', position: [5, 0, 10], scale: [0.55, 0.55, 0.55] },
      // A few low-fence segments suggesting a garden border
      { asset: 'planter-box', position: [-12, 0, -7] },
      { asset: 'planter-box', position: [12, 0, -7] },
      { asset: 'planter-box', position: [-12, 0, 2] },
      { asset: 'planter-box', position: [12, 0, 2] },

      // ─── LUXURY UPGRADE PASS ──────────────────────────────────────────

      // ── REFLECTING POOL DRESSING — coping + water-edge planting ───────
      { asset: 'pool-coping', position: [3.05, 0, 0.5], dimensions: [3.1, 0.06, 4.2] },
      // Lily-pad / planted ring around the koi pond (planters at the corners)
      { asset: 'planter-box', position: [4.7, 0, -1.4], scale: [0.5, 0.7, 0.5] },
      { asset: 'planter-box', position: [4.7, 0, 2.4], scale: [0.5, 0.7, 0.5] },
      { asset: 'planter-box', position: [1.7, 0, -1.7], scale: [0.5, 0.7, 0.5] },
      { asset: 'planter-box', position: [1.7, 0, 2.7], scale: [0.5, 0.7, 0.5] },
      // A pair of small lanterns on the pond's east edge
      { asset: 'garden-lantern', position: [4.8, 0, 0] },
      { asset: 'garden-lantern', position: [4.8, 0, 1] },

      // ── INTIMATE FIREPIT NOOK (west marble platform) ───────────────────
      { asset: 'firepit', position: [-5, 0, 1] },
      { asset: 'lounge-chair', position: [-3.5, 0, 0.5], rotationY: -Math.PI / 2 },
      { asset: 'lounge-chair', position: [-6.5, 0, 0.5], rotationY: Math.PI / 2 },
      { asset: 'lounge-chair', position: [-5, 0, 2.4], rotationY: Math.PI },
      // Frame the nook with planters
      { asset: 'planter-box', position: [-7.3, 0, 0], scale: [0.7, 0.85, 0.7] },
      { asset: 'planter-box', position: [-7.3, 0, 2.5], scale: [0.7, 0.85, 0.7] },
      { asset: 'planter-box', position: [-2.7, 0, -1.3], scale: [0.6, 0.8, 0.6] },
      // Soft warm lanterns flanking the firepit nook
      { asset: 'garden-lantern', position: [-7.3, 0, 1.2] },
      { asset: 'garden-lantern', position: [-2.7, 0, 1.2] },

      // ── HEDGE ENCLOSURE — privacy wall around the whole garden ────────
      // Long stretched planter-boxes render as continuous boxwood hedges
      // (PlanterBox detects aspect-ratio > 1.6 and tiles foliage).
      // North hedge (back of property)
      { asset: 'planter-box', position: [-7.5, 0, -14], dimensions: [9, 0.85, 0.8] },
      { asset: 'planter-box', position: [3, 0, -14], dimensions: [10, 0.85, 0.8] },
      // South hedge
      { asset: 'planter-box', position: [-9, 0, 13], dimensions: [11, 0.85, 0.8] },
      { asset: 'planter-box', position: [4.5, 0, 13], dimensions: [9, 0.85, 0.8] },
      // East hedge
      { asset: 'planter-box', position: [13.5, 0, -7], dimensions: [0.8, 0.85, 12] },
      { asset: 'planter-box', position: [13.5, 0, 7], dimensions: [0.8, 0.85, 10] },
      // West hedge
      { asset: 'planter-box', position: [-13.5, 0, -7], dimensions: [0.8, 0.85, 12] },
      { asset: 'planter-box', position: [-13.5, 0, 7], dimensions: [0.8, 0.85, 10] },

      // ── PATH-EDGE LANDSCAPING — denser bushes lining the walk ─────────
      { asset: 'bush', position: [-2, 0, -2.4], scale: [0.45, 0.45, 0.45] },
      { asset: 'bush', position: [-1.6, 0, 1], scale: [0.4, 0.4, 0.4] },
      { asset: 'bush', position: [-1.6, 0, 3], scale: [0.4, 0.4, 0.4] },
      { asset: 'bush', position: [1.4, 0, -2.5], scale: [0.45, 0.45, 0.45] },

      // ── SECOND-LAYER PLANTING — varied trees + shrub clusters ────────
      // Closer-in ornamental layer between hedge wall and patios
      { asset: 'tree', position: [-11, 0, -4], scale: [0.55, 0.55, 0.55] },
      { asset: 'tree', position: [11, 0, -4], scale: [0.55, 0.55, 0.55] },
      { asset: 'tree', position: [-11, 0, 7], scale: [0.5, 0.5, 0.5] },
      { asset: 'tree', position: [11, 0, 7], scale: [0.5, 0.5, 0.5] },
      // Background firs for evergreen depth
      { asset: 'fir-tree', position: [-12, 0, 11], scale: [1.3, 1.3, 1.3] },
      { asset: 'fir-tree', position: [12, 0, 11], scale: [1.3, 1.3, 1.3] },
      // Dense bush clusters at hedge corners
      { asset: 'bush', position: [-12, 0, -10], scale: [0.7, 0.7, 0.7] },
      { asset: 'bush', position: [-10, 0, -11.5], scale: [0.55, 0.55, 0.55] },
      { asset: 'bush', position: [12, 0, -10], scale: [0.7, 0.7, 0.7] },
      { asset: 'bush', position: [10, 0, -11.5], scale: [0.55, 0.55, 0.55] },
      { asset: 'bush', position: [-12, 0, 10], scale: [0.6, 0.6, 0.6] },
      { asset: 'bush', position: [12, 0, 10], scale: [0.6, 0.6, 0.6] },
      // Mid-layer bushes between trees
      { asset: 'bush', position: [-9, 0, 1], scale: [0.55, 0.55, 0.55] },
      { asset: 'bush', position: [9, 0, 1], scale: [0.55, 0.55, 0.55] },
      { asset: 'bush', position: [-9, 0, 6], scale: [0.5, 0.5, 0.5] },
      { asset: 'bush', position: [9, 0, 6], scale: [0.5, 0.5, 0.5] },

      // ── EAST GARDEN PATH — flagstones to the reflecting pool ──────────
      { asset: 'stepping-stone', position: [1.4, 0, -3.5], scale: [1.1, 1, 1.1] },
      { asset: 'stepping-stone', position: [2.0, 0, -3.0], scale: [1.1, 1, 1.1] },
      { asset: 'stepping-stone', position: [2.6, 0, -2.5], scale: [1.1, 1, 1.1] },

      // ── WEST GARDEN PATH — flagstones to the firepit nook ─────────────
      { asset: 'stepping-stone', position: [-1.4, 0, -2.4], scale: [1.1, 1, 1.1] },
      { asset: 'stepping-stone', position: [-2.0, 0, -1.8], scale: [1.1, 1, 1.1] },
      { asset: 'stepping-stone', position: [-2.6, 0, -1.2], scale: [1.1, 1, 1.1] },

      // ── PERIMETER LANTERNS — glow ring at hedge level ─────────────────
      { asset: 'garden-lantern', position: [-12.5, 0, -10] },
      { asset: 'garden-lantern', position: [-12.5, 0, -2] },
      { asset: 'garden-lantern', position: [-12.5, 0, 6] },
      { asset: 'garden-lantern', position: [-12.5, 0, 11] },
      { asset: 'garden-lantern', position: [12.5, 0, -10] },
      { asset: 'garden-lantern', position: [12.5, 0, -2] },
      { asset: 'garden-lantern', position: [12.5, 0, 6] },
      { asset: 'garden-lantern', position: [12.5, 0, 11] },
      { asset: 'garden-lantern', position: [-8, 0, -13] },
      { asset: 'garden-lantern', position: [0, 0, -13] },
      { asset: 'garden-lantern', position: [8, 0, -13] },
      { asset: 'garden-lantern', position: [-8, 0, 12] },
      { asset: 'garden-lantern', position: [0, 0, 12] },
      { asset: 'garden-lantern', position: [8, 0, 12] },

      // ── ENTRY ARCH planter pair — frame the south entrance ────────────
      { asset: 'planter-box', position: [-3.5, 0, 9.5], scale: [0.8, 1.1, 0.8] },
      { asset: 'planter-box', position: [3.5, 0, 9.5], scale: [0.8, 1.1, 0.8] },
      { asset: 'palm', position: [-5, 0, 10], scale: [0.32, 0.32, 0.32] },
      { asset: 'palm', position: [5, 0, 10], scale: [0.32, 0.32, 0.32] },
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
        materialPreset: 'library:wall-marble2',
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
        materialPreset: 'library:wall-granite1',
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
        materialPreset: 'library:wall-marble1',
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
        materialPreset: 'library:wall-granite1',
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
        materialPreset: 'library:wall-marble2',
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
        materialPreset: 'library:wall-marble2',
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
  'ultimateEstate',
  'luxuryNighttime',
  'resortPoolside',
  'outdoorKitchen',
  'firepitLounge',
  'modernEvening',
  'gardenRetreat',
  'compactBackyard',
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
  const wallIds = (spec.walls ?? []).map(() => makeId('wall'))

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
    children: [...slabIds, ...itemIds, ...wallIds],
  }

  ;(spec.walls ?? []).forEach((wall, i) => {
    const wId = wallIds[i]!
    nodes[wId] = {
      object: 'node',
      id: wId,
      type: 'wall',
      parentId: levelId,
      visible: true,
      metadata: {},
      start: wall.start,
      end: wall.end,
      height: wall.height ?? 3,
      thickness: wall.thickness ?? 0.2,
      frontSide: 'unknown',
      backSide: 'unknown',
      children: [],
      ...(wall.materialPreset ? { materialPreset: wall.materialPreset } : {}),
    }
  })

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
