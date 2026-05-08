# Rose's Outdoor Designs

**A cinematic outdoor-living visualizer.** Luxury backyard scenes you can audition, transform, and present — with cross-fading time-of-day, hand-tuned hero camera shots, an autoplay Showcase mode, and a procedural-item engine that ships destination pieces (firepit, pergola, outdoor kitchen, pool with caustic shimmer) inline.

[**Open the live app →**](https://marcopolo2350.github.io/roses-outdoor-designs/)

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Built on Pascal](https://img.shields.io/badge/built%20on-Pascal%20editor-2a78b8)](https://github.com/pascalorg/editor)

---

## What it feels like

Open the app, and the first thing you see is a vibe picker — _Garden retreat, Resort poolside, Firepit lounge, Outdoor kitchen, Compact backyard, Modern evening, Luxury nighttime_. Pick one and you land **inside a designed space** with the right lighting and a hero camera shot already framing the property. Hit the sparkle button to enter Showcase: the UI fades, the camera slowly orbits, and time-of-day cycles through day → golden hour → dusk → evening on a 16-second loop. The firepit warms, lanterns bloom on, the pool surface shimmers, fireflies start to appear.

It's not a CAD tool. It's a backyard you can sit inside.

## 30-second demo flow

| Time | What happens |
|---|---|
| 0:00–0:03 | Picker open → click **Luxury nighttime**. |
| 0:03–0:07 | Scene loads. Evening palette settles. Camera glides to the hero angle (Showcase Reveal). |
| 0:07–0:14 | Click **Showcase** (sparkle button). UI fades. Slow orbit reveals pool shimmer, firepit, ringed lanterns. |
| 0:14–0:20 | Autoplay advances → golden hour. Whole world warms across one breath. |
| 0:20–0:26 | → dusk. Lanterns and firepit dial up. Fireflies fade in. |
| 0:26–0:30 | → evening. Hold final frame on the pergola lounge with bistro string lights glowing. |

Recommended capture: OBS / ScreenStudio at 1440×900, 60fps, sidebar collapsed.

## Hero scenes (best for screenshots)

1. **Luxury Nighttime** — pool with stone coping & caustic shimmer, firepit corner with halo, 11 garden lanterns ringing the deck, pergola lounge under string lights.
2. **Resort Poolside** — coping-wrapped pool, palms framing four corners, aligned sunbeds with umbrellas, planters punctuating the deck.
3. **Outdoor Kitchen** — pergola overhead, kitchen island with stone counter and grill grates, dining for six, planters flanking, lanterns at the corners.
4. **Firepit Lounge** — octagonal stone patio, conversation circle of lounge chairs, real animated firepit at the center, four corner lanterns.
5. **Modern Evening** — clean marble patio under deep navy sky, palms silhouetted, minimal sunbeds.
6. **Garden Retreat** — wooden patio framed by trees and bushes, lounge chairs and coffee table.
7. **Compact Backyard** — stepping-stone path leading into a firepit corner with planters along the back fence.

## Controls

**Desktop**

| Action | Control |
|---|---|
| Pan | Hold Space + Left-drag |
| Rotate | Right-drag |
| Zoom | Scroll |
| Open vibe picker | Toolbar → **Starters** |
| Set mood (atmosphere bundle) | Toolbar → **Mood** |
| Time of day | Toolbar → **Day** pill (left-click menu, right-click cycles) |
| Camera preset | Toolbar → **Views** |
| Showcase Mode | Toolbar → sparkle button |
| How to use | Toolbar → **?** |

**Mobile (<768px)** — tap the floating sparkle button at right edge for the full Outdoor sheet (Mood, Time, Camera, Starters, Showcase, Help).

## What's under the hood

- **Atmosphere system** — sky dome, fog, hemisphere/rim/fill lights, tone-mapping exposure, and a 96-firefly particle system, all cross-fading on a shared time-of-day palette.
- **Procedural-item engine** — `proc://` items render Three.js geometry inline (no GLB), shipping firepit, pergola, outdoor kitchen island, planter box, stepping stone, garden lantern, pool coping, and pool shimmer. TSL-driven materials add wood grain and panel breakup without textures.
- **7 starter scenes** — pre-composed luxury layouts paired with a Mood (time-of-day + hero camera).
- **Showcase Mode** — UI fades, camera dollies into a hero hero angle, autoplay slowly orbits + cycles time of day on a 16-second hold per phase.
- **Mobile bottom sheet** — phones get a floating action button → bottom sheet with Mood, Time, Camera, Starters, Showcase, Help.
- **In-app tutorial** — 8-step walkthrough auto-opens on first run after the picker is resolved; re-openable via Help.

---

## Repository Architecture

This is a Turborepo monorepo with three main packages:

```
editor-v2/
├── apps/
│   └── editor/          # Next.js application
├── packages/
│   ├── core/            # Schema definitions, state management, systems
│   └── viewer/          # 3D rendering components
```

### Separation of Concerns

| Package | Responsibility |
|---------|---------------|
| **@pascal-app/core** | Node schemas, scene state (Zustand), systems (geometry generation), spatial queries, event bus |
| **@pascal-app/viewer** | 3D rendering via React Three Fiber, default camera/controls, post-processing |
| **apps/editor** | UI components, tools, custom behaviors, editor-specific systems |

The **viewer** renders the scene with sensible defaults. The **editor** extends it with interactive tools, selection management, and editing capabilities.

### Stores

Each package has its own Zustand store for managing state:

| Store | Package | Responsibility |
|-------|---------|----------------|
| `useScene` | `@pascal-app/core` | Scene data: nodes, root IDs, dirty nodes, CRUD operations. Persisted to IndexedDB with undo/redo via Zundo. |
| `useViewer` | `@pascal-app/viewer` | Viewer state: current selection (building/level/zone IDs), level display mode (stacked/exploded/solo), camera mode. |
| `useEditor` | `apps/editor` | Editor state: active tool, structure layer visibility, panel states, editor-specific preferences. |

**Access patterns:**

```typescript
// Subscribe to state changes (React component)
const nodes = useScene((state) => state.nodes)
const levelId = useViewer((state) => state.selection.levelId)
const activeTool = useEditor((state) => state.tool)

// Access state outside React (callbacks, systems)
const node = useScene.getState().nodes[id]
useViewer.getState().setSelection({ levelId: 'level_123' })
```

---

## Core Concepts

### Nodes

Nodes are the data primitives that describe the 3D scene. All nodes extend `BaseNode`:

```typescript
BaseNode {
  id: string              // Auto-generated with type prefix (e.g., "wall_abc123")
  type: string            // Discriminator for type-safe handling
  parentId: string | null // Parent node reference
  visible: boolean
  camera?: Camera         // Optional saved camera position
  metadata?: JSON         // Arbitrary metadata (e.g., { isTransient: true })
}
```

**Node Hierarchy:**

```
Site
└── Building
    └── Level
        ├── Wall → Item (doors, windows)
        ├── Slab
        ├── Ceiling → Item (lights)
        ├── Roof
        ├── Zone
        ├── Scan (3D reference)
        └── Guide (2D reference)
```

Nodes are stored in a **flat dictionary** (`Record<id, Node>`), not a nested tree. Parent-child relationships are defined via `parentId` and `children` arrays.

---

### Scene State (Zustand Store)

The scene is managed by a Zustand store in `@pascal-app/core`:

```typescript
useScene.getState() = {
  nodes: Record<id, AnyNode>,  // All nodes
  rootNodeIds: string[],       // Top-level nodes (sites)
  dirtyNodes: Set<string>,     // Nodes pending system updates

  createNode(node, parentId),
  updateNode(id, updates),
  deleteNode(id),
}
```

**Middleware:**
- **Persist** - Saves to IndexedDB (excludes transient nodes)
- **Temporal** (Zundo) - Undo/redo with 50-step history

---

### Scene Registry

The registry maps node IDs to their Three.js objects for fast lookup:

```typescript
sceneRegistry = {
  nodes: Map<id, Object3D>,    // ID → 3D object
  byType: {
    wall: Set<id>,
    item: Set<id>,
    zone: Set<id>,
    // ...
  }
}
```

Renderers register their refs using the `useRegistry` hook:

```tsx
const ref = useRef<Mesh>(null!)
useRegistry(node.id, 'wall', ref)
```

This allows systems to access 3D objects directly without traversing the scene graph.

---

### Node Renderers

Renderers are React components that create Three.js objects for each node type:

```
SceneRenderer
└── NodeRenderer (dispatches by type)
    ├── BuildingRenderer
    ├── LevelRenderer
    ├── WallRenderer
    ├── SlabRenderer
    ├── ZoneRenderer
    ├── ItemRenderer
    └── ...
```

**Pattern:**
1. Renderer creates a placeholder mesh/group
2. Registers it with `useRegistry`
3. Systems update geometry based on node data

Example (simplified):
```tsx
const WallRenderer = ({ node }) => {
  const ref = useRef<Mesh>(null!)
  useRegistry(node.id, 'wall', ref)

  return (
    <mesh ref={ref}>
      <boxGeometry args={[0, 0, 0]} />  {/* Replaced by WallSystem */}
      <meshStandardMaterial />
      {node.children.map(id => <NodeRenderer key={id} nodeId={id} />)}
    </mesh>
  )
}
```

---

### Systems

Systems are React components that run in the render loop (`useFrame`) to update geometry and transforms. They process **dirty nodes** marked by the store.

**Core Systems (in `@pascal-app/core`):**

| System | Responsibility |
|--------|---------------|
| `WallSystem` | Generates wall geometry with mitering and CSG cutouts for doors/windows |
| `SlabSystem` | Generates floor geometry from polygons |
| `CeilingSystem` | Generates ceiling geometry |
| `RoofSystem` | Generates roof geometry |
| `ItemSystem` | Positions items on walls, ceilings, or floors (slab elevation) |

**Viewer Systems (in `@pascal-app/viewer`):**

| System | Responsibility |
|--------|---------------|
| `LevelSystem` | Handles level visibility and vertical positioning (stacked/exploded/solo modes) |
| `ScanSystem` | Controls 3D scan visibility |
| `GuideSystem` | Controls guide image visibility |

**Processing Pattern:**
```typescript
useFrame(() => {
  for (const id of dirtyNodes) {
    const obj = sceneRegistry.nodes.get(id)
    const node = useScene.getState().nodes[id]

    // Update geometry, transforms, etc.
    updateGeometry(obj, node)

    dirtyNodes.delete(id)
  }
})
```

---

### Dirty Nodes

When a node changes, it's marked as **dirty** in `useScene.getState().dirtyNodes`. Systems check this set each frame and only recompute geometry for dirty nodes.

```typescript
// Automatic: createNode, updateNode, deleteNode mark nodes dirty
useScene.getState().updateNode(wallId, { thickness: 0.2 })
// → wallId added to dirtyNodes
// → WallSystem regenerates geometry next frame
// → wallId removed from dirtyNodes
```

**Manual marking:**
```typescript
useScene.getState().dirtyNodes.add(wallId)
```

---

### Event Bus

Inter-component communication uses a typed event emitter (mitt):

```typescript
// Node events
emitter.on('wall:click', (event) => { ... })
emitter.on('item:enter', (event) => { ... })
emitter.on('zone:context-menu', (event) => { ... })

// Grid events (background)
emitter.on('grid:click', (event) => { ... })

// Event payload
NodeEvent {
  node: AnyNode
  position: [x, y, z]
  localPosition: [x, y, z]
  normal?: [x, y, z]
  stopPropagation: () => void
}
```

---

### Spatial Grid Manager

Handles collision detection and placement validation:

```typescript
spatialGridManager.canPlaceOnFloor(levelId, position, dimensions, rotation)
spatialGridManager.canPlaceOnWall(wallId, t, height, dimensions)
spatialGridManager.getSlabElevationAt(levelId, x, z)
```

Used by item placement tools to validate positions and calculate slab elevations.

---

## Editor Architecture

The editor extends the viewer with:

### Tools

Tools are activated via the toolbar and handle user input for specific operations:

- **SelectTool** - Selection and manipulation
- **WallTool** - Draw walls
- **ZoneTool** - Create zones
- **ItemTool** - Place furniture/fixtures
- **SlabTool** - Create floor slabs

### Selection Manager

The editor uses a custom selection manager with hierarchical navigation:

```
Site → Building → Level → Zone → Items
```

Each depth level has its own selection strategy for hover/click behavior.

### Editor-Specific Systems

- `ZoneSystem` - Controls zone visibility based on level mode
- Custom camera controls with node focusing

---

## Data Flow

```
User Action (click, drag)
       ↓
Tool Handler
       ↓
useScene.createNode() / updateNode()
       ↓
Node added/updated in store
Node marked dirty
       ↓
React re-renders NodeRenderer
useRegistry() registers 3D object
       ↓
System detects dirty node (useFrame)
Updates geometry via sceneRegistry
Clears dirty flag
```

---

## Technology Stack

- **React 19** + **Next.js 16**
- **Three.js** (WebGPU renderer)
- **React Three Fiber** + **Drei**
- **Zustand** (state management)
- **Zod** (schema validation)
- **Zundo** (undo/redo)
- **three-bvh-csg** (Boolean geometry operations)
- **Turborepo** (monorepo management)
- **Bun** (package manager)

---

## Getting Started

### Development

Run the development server from the **root directory** to enable hot reload for all packages:

```bash
# Install dependencies
bun install

# Run development server (builds packages + starts editor with watch mode)
bun dev

# This will:
# 1. Build @pascal-app/core and @pascal-app/viewer
# 2. Start watching both packages for changes
# 3. Start the Next.js editor dev server
# Open http://localhost:3000
```

**Important:** Always run `bun dev` from the root directory to ensure the package watchers are running. This enables hot reload when you edit files in `packages/core/src/` or `packages/viewer/src/`.

### Building for Production

```bash
# Build all packages
turbo build

# Build specific package
turbo build --filter=@pascal-app/core
```

### Publishing Packages

```bash
# Build packages
turbo build --filter=@pascal-app/core --filter=@pascal-app/viewer

# Publish to npm
npm publish --workspace=@pascal-app/core --access public
npm publish --workspace=@pascal-app/viewer --access public
```

---

## Key Files

| Path | Description |
|------|-------------|
| `packages/core/src/schema/` | Node type definitions (Zod schemas) |
| `packages/core/src/store/use-scene.ts` | Scene state store |
| `packages/core/src/hooks/scene-registry/` | 3D object registry |
| `packages/core/src/systems/` | Geometry generation systems |
| `packages/viewer/src/components/renderers/` | Node renderers |
| `packages/viewer/src/components/viewer/` | Main Viewer component |
| `apps/editor/components/tools/` | Editor tools |
| `apps/editor/store/` | Editor-specific state |

---

## Contributors

<a href="https://github.com/Aymericr"><img src="https://avatars.githubusercontent.com/u/4444492?v=4" width="60" height="60" alt="Aymeric Rabot" style="border-radius:50%"></a>
<a href="https://github.com/wass08"><img src="https://avatars.githubusercontent.com/u/6551176?v=4" width="60" height="60" alt="Wassim Samad" style="border-radius:50%"></a>

---

<a href="https://trendshift.io/repositories/23831" target="_blank"><img src="https://trendshift.io/api/badge/repositories/23831" alt="pascalorg/editor | Trendshift" width="250" height="55"/></a>
