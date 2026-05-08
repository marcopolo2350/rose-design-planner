'use client'

import type { MoodId } from '@pascal-app/viewer'
import type { SceneGraph } from './scene'

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
}

type ItemSpec = {
  asset: keyof typeof ASSETS
  position: [number, number, number]
  rotationY?: number
  scale?: [number, number, number]
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
  id: MoodId
  label: string
  description: string
  /** Square site half-size — final polygon is [-s,-s] to [s,s] */
  siteHalfSize: number
  slabs: SlabSpec[]
  items: ItemSpec[]
}

// ── The four starter scenes ────────────────────────────────────────────────

const SCENES: Record<MoodId, StarterSceneSpec> = {
  gardenRetreat: {
    id: 'gardenRetreat',
    label: 'Garden retreat',
    description: 'Layered greenery framing a quiet wooden patio.',
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
            color: '#3a92cc',
            roughness: 0.18,
            metalness: 0.35,
            opacity: 0.92,
            transparent: true,
          },
        },
      },
    ],
    items: [
      // Palms framing the deck corners
      { asset: 'palm', position: [-8, 0, -6], scale: [0.55, 0.55, 0.55] },
      { asset: 'palm', position: [8, 0, -6], scale: [0.55, 0.55, 0.55] },
      { asset: 'palm', position: [-8, 0, 6], scale: [0.55, 0.55, 0.55] },
      { asset: 'palm', position: [8, 0, 6], scale: [0.55, 0.55, 0.55] },
      // Sunbeds along one side of the pool, all facing the water
      { asset: 'sunbed', position: [-5.5, 0, -3.5], rotationY: Math.PI / 2 },
      { asset: 'sunbed', position: [-5.5, 0, -1.5], rotationY: Math.PI / 2 },
      { asset: 'sunbed', position: [-5.5, 0, 0.5], rotationY: Math.PI / 2 },
      { asset: 'sunbed', position: [-5.5, 0, 2.5], rotationY: Math.PI / 2 },
      // Patio umbrellas between sunbeds for shade
      { asset: 'patio-umbrella', position: [-6, 0, -2.5] },
      { asset: 'patio-umbrella', position: [-6, 0, 1.5] },
      // A second pair facing back across the pool
      { asset: 'sunbed', position: [5.5, 0, -1], rotationY: -Math.PI / 2 },
      { asset: 'sunbed', position: [5.5, 0, 1], rotationY: -Math.PI / 2 },
    ],
  },

  firepitLounge: {
    id: 'firepitLounge',
    label: 'Firepit lounge',
    description: 'Stone patio with a tight circle of seating around the fire.',
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
      // Fire stand-in — small coffee table at center with fire material
      // (no firepit GLB exists; the small dark cylinder reads ok at
      //  dusk lighting, and adding a firepit-glow point light is future
      //  work.)
      { asset: 'coffee-table', position: [0, 0, 0], scale: [0.55, 0.55, 0.55] },
      // Conversation circle — 4 lounge chairs facing inward
      { asset: 'lounge-chair', position: [0, 0, -2.7], rotationY: 0 },
      { asset: 'lounge-chair', position: [2.7, 0, 0], rotationY: -Math.PI / 2 },
      { asset: 'lounge-chair', position: [0, 0, 2.7], rotationY: Math.PI },
      { asset: 'lounge-chair', position: [-2.7, 0, 0], rotationY: Math.PI / 2 },
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
}

export const STARTER_SCENE_ORDER: MoodId[] = [
  'gardenRetreat',
  'resortPoolside',
  'firepitLounge',
  'modernEvening',
]

export type StarterSceneSummary = {
  id: MoodId
  label: string
  description: string
}

export function getStarterSceneSummary(id: MoodId): StarterSceneSummary {
  const spec = SCENES[id]
  return { id: spec.id, label: spec.label, description: spec.description }
}

// ── Builder: turn a spec into a SceneGraph with fresh IDs ─────────────────

export function buildStarterScene(id: MoodId): SceneGraph {
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
        dimensions: asset.dimensions,
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
