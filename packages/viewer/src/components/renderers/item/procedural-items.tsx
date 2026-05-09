'use client'

import type { ItemNode } from '@pascal-app/core'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { AdditiveBlending, MathUtils, type Mesh, type PointLight } from 'three'
import {
  abs,
  color as tslColor,
  cos,
  fract,
  mix,
  positionLocal,
  positionWorld,
  sin,
  smoothstep,
  time,
} from 'three/tsl'
import { MeshStandardNodeMaterial } from 'three/webgpu'
import { useNodeEvents } from '../../../hooks/use-node-events'
import useViewer from '../../../store/use-viewer'

// ─── Shared procedural materials ───────────────────────────────────────────
//
// These are created once per module and shared across all instances of an
// item type. Changing time-of-day or scene state doesn't require swapping
// materials; the TSL nodes evaluate per-fragment.

/** Wood-grain material: a base wood color modulated by horizontal stripes
 *  of varying density so posts/beams/slats read as planks instead of flat
 *  brown boxes. */
function makeWoodGrainMaterial(baseHex: string, accentHex: string) {
  const mat = new MeshStandardNodeMaterial({
    metalness: 0,
    roughness: 0.85,
  })
  // Use local position so each mesh's grain runs along its long axis
  const stripe = sin(positionLocal.y.mul(36)).mul(0.5).add(0.5)
  const stripe2 = sin(positionLocal.y.mul(11.3).add(positionLocal.x.mul(2.1))).mul(0.5).add(0.5)
  const grain = stripe.mul(0.55).add(stripe2.mul(0.45))
  // Subtle horizontal variation
  const lateral = sin(positionLocal.x.mul(2.7).add(positionLocal.z.mul(1.9))).mul(0.5).add(0.5)
  const variation = grain.mul(0.7).add(lateral.mul(0.3))
  const c = mix(tslColor(baseHex), tslColor(accentHex), variation.mul(0.55))
  mat.colorNode = c
  return mat
}

/** Stone-tile material with slight panel-line breakup — used for the
 *  outdoor-kitchen counter base and toe-kick. */
function makeStonePanelMaterial(baseHex: string, lineHex: string) {
  const mat = new MeshStandardNodeMaterial({
    metalness: 0.05,
    roughness: 0.78,
  })
  const lineX = abs(fract(positionLocal.x.mul(2.4)).sub(0.5))
  const lineY = abs(fract(positionLocal.y.mul(2.0)).sub(0.5))
  const line = smoothstep(0.49, 0.5, lineX.max(lineY))
  const c = mix(tslColor(baseHex), tslColor(lineHex), line.mul(0.45))
  mat.colorNode = c
  return mat
}

const WOOD_PERGOLA_POST = makeWoodGrainMaterial('#8c6a3e', '#5a3e1c')
const WOOD_PERGOLA_BEAM = makeWoodGrainMaterial('#7a5a32', '#4a3018')
const WOOD_PERGOLA_SLAT = makeWoodGrainMaterial('#876539', '#5e4220')
const WOOD_PLANTER = makeWoodGrainMaterial('#8a6a44', '#5a3a20')
const KITCHEN_BASE = makeStonePanelMaterial('#3d3d3d', '#2a2a2a')

/**
 * Procedural items — node assets with no GLB. The asset.src takes the
 * shape "proc://<id>" and the registry below maps that id to a small
 * React component that renders Three.js geometry directly. This lets
 * us ship "destination" content (firepit, pergola, outdoor kitchen)
 * without committing binary models to the repo.
 *
 * Each procedural item:
 *  - respects asset.dimensions for selection / spatial-grid checks
 *  - registers normal node events so it's selectable / movable
 *  - is fog-aware so atmospheric perspective still applies
 *  - reads time-of-day for evening-only effects (firepit glow)
 */

export const PROC_PREFIX = 'proc://'

export function isProceduralItemSrc(src: string | undefined | null): boolean {
  return typeof src === 'string' && src.startsWith(PROC_PREFIX)
}

export function getProceduralId(src: string): string {
  return src.slice(PROC_PREFIX.length)
}

// ─── Firepit ────────────────────────────────────────────────────────────────

function Firepit({ node }: { node: ItemNode }) {
  const handlers = useNodeEvents(node, 'item')
  const flameOuterRef = useRef<Mesh>(null!)
  const flameInnerRef = useRef<Mesh>(null!)
  const haloRef = useRef<Mesh>(null!)
  const emberRef = useRef<Mesh>(null!)
  const lightRef = useRef<PointLight>(null!)
  const timeOfDay = useViewer((s) => s.timeOfDay)

  // Cylinder bowl ~0.95m wide, 0.45m tall — fits a small group around it
  const baseRadius = 0.46
  const baseHeight = 0.45
  const innerRadius = 0.34

  useFrame((_, delta) => {
    const dt = MathUtils.clamp(delta * 6, 0, 1)

    // Fire intensity: low in day, high at evening — gives the firepit
    // emotional purpose tied to scene mood. Even at "day" we keep a
    // small reading so the firepit always looks lit (not a black bowl).
    const target =
      timeOfDay === 'evening'
        ? 1.4
        : timeOfDay === 'dusk'
          ? 1.0
          : timeOfDay === 'goldenHour'
            ? 0.55
            : 0.32

    if (lightRef.current) {
      lightRef.current.intensity = MathUtils.lerp(
        lightRef.current.intensity,
        target * 7.5,
        dt,
      )
    }

    if (flameOuterRef.current && flameInnerRef.current && emberRef.current && haloRef.current) {
      // Two-octave flicker for a livelier flame
      const t = performance.now()
      const f1 = 0.92 + Math.sin(t * 0.012) * 0.05 + Math.cos(t * 0.019) * 0.03
      const f2 = 0.94 + Math.sin(t * 0.027) * 0.04
      flameOuterRef.current.scale.set(f1, 0.88 + f1 * 0.18, f1)
      flameInnerRef.current.scale.set(f2, 0.82 + f2 * 0.22, f2)
      ;(emberRef.current.material as any).emissiveIntensity = MathUtils.lerp(
        (emberRef.current.material as any).emissiveIntensity ?? 1,
        target * 2.8 + 0.4,
        dt,
      )
      // Halo: a soft sprite that glows around the bowl, brighter at evening
      ;(haloRef.current.material as any).opacity = MathUtils.lerp(
        (haloRef.current.material as any).opacity ?? 0,
        target * 0.55,
        dt,
      )
    }
  })

  return (
    <group {...handlers}>
      {/* Stone bowl — slight taper for a more natural cast-stone look */}
      <mesh castShadow position={[0, baseHeight / 2, 0]} receiveShadow>
        <cylinderGeometry args={[baseRadius, baseRadius * 1.12, baseHeight, 32]} />
        <meshStandardMaterial color="#3a3633" metalness={0} roughness={0.92} />
      </mesh>
      {/* Lip — thin lighter ring on top edge */}
      <mesh position={[0, baseHeight - 0.01, 0]}>
        <cylinderGeometry args={[baseRadius + 0.02, baseRadius + 0.02, 0.04, 32, 1, true]} />
        <meshStandardMaterial color="#5a544f" metalness={0} roughness={0.8} side={2} />
      </mesh>
      {/* Inner ember bed — warm emissive */}
      <mesh ref={emberRef} position={[0, baseHeight - 0.03, 0]}>
        <cylinderGeometry args={[innerRadius, innerRadius, 0.08, 28]} />
        <meshStandardMaterial
          color="#1d0a04"
          emissive="#ff6420"
          emissiveIntensity={1.8}
          metalness={0.1}
          roughness={0.9}
        />
      </mesh>
      {/* Flame outer cone — orange */}
      <mesh
        ref={flameOuterRef}
        position={[0, baseHeight + 0.22, 0]}
        renderOrder={3}
      >
        <coneGeometry args={[0.22, 0.65, 16, 1, true]} />
        <meshStandardMaterial
          color="#ff8a3a"
          emissive="#ff7a28"
          emissiveIntensity={2.8}
          transparent
          opacity={0.82}
          depthWrite={false}
          blending={AdditiveBlending}
          metalness={0}
          roughness={1}
        />
      </mesh>
      {/* Flame inner cone — yellow core */}
      <mesh
        ref={flameInnerRef}
        position={[0, baseHeight + 0.18, 0]}
        renderOrder={4}
      >
        <coneGeometry args={[0.13, 0.42, 12, 1, true]} />
        <meshStandardMaterial
          color="#ffd76b"
          emissive="#ffd76b"
          emissiveIntensity={2.2}
          transparent
          opacity={0.85}
          depthWrite={false}
          blending={AdditiveBlending}
          metalness={0}
          roughness={1}
        />
      </mesh>
      {/* Soft halo — additive sprite-like sphere that fades in at dusk/evening */}
      <mesh ref={haloRef} position={[0, baseHeight + 0.25, 0]} renderOrder={2}>
        <sphereGeometry args={[1.1, 16, 12]} />
        <meshBasicMaterial
          color="#ff9a5a"
          transparent
          opacity={0}
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </mesh>
      {/* Warm point light — gates intensity by time of day for emotional impact */}
      <pointLight
        ref={lightRef}
        color="#ff9a4a"
        decay={2}
        distance={11}
        intensity={0}
        position={[0, baseHeight + 0.4, 0]}
      />
    </group>
  )
}

// ─── Pergola ────────────────────────────────────────────────────────────────

function Pergola({ node }: { node: ItemNode }) {
  const handlers = useNodeEvents(node, 'item')
  const [w, h, d] = node.asset.dimensions
  const timeOfDay = useViewer((s) => s.timeOfDay)

  // Default 4x2.6x4 pergola with 9 roof slats running along the Z axis.
  const postSize = 0.14
  const beamSize = 0.12
  const slatCount = 9
  const slatThickness = 0.06
  const slatHeight = 0.14

  const slats = useMemo(() => {
    const out: { z: number }[] = []
    const innerD = d - postSize
    for (let i = 0; i < slatCount; i++) {
      const t = i / (slatCount - 1)
      out.push({ z: -innerD / 2 + t * innerD })
    }
    return out
  }, [d])

  // Half-extents
  const halfW = w / 2
  const halfD = d / 2

  // Bistro-style string lights: 14 small bulbs along the long beams.
  // Their emissive intensity + small point lights ramp on at dusk/evening.
  const stringBulbCount = 14
  const stringBulbs = useMemo(() => {
    const out: { x: number }[] = []
    for (let i = 0; i < stringBulbCount; i++) {
      const t = (i + 0.5) / stringBulbCount
      out.push({ x: -halfW + t * w })
    }
    return out
  }, [w, halfW])

  const bulbsRef = useRef<Mesh[]>([])
  const lightsRef = useRef<PointLight[]>([])

  useFrame((_, delta) => {
    const dt = MathUtils.clamp(delta * 5, 0, 1)
    const target =
      timeOfDay === 'evening'
        ? 1.0
        : timeOfDay === 'dusk'
          ? 0.65
          : timeOfDay === 'goldenHour'
            ? 0.18
            : 0
    for (const b of bulbsRef.current) {
      if (!b) continue
      const m = b.material as any
      if (typeof m.emissiveIntensity === 'number') {
        m.emissiveIntensity = MathUtils.lerp(m.emissiveIntensity, target * 1.8 + 0.04, dt)
      }
    }
    // Center light is the brightest, two accent corners are softer
    if (lightsRef.current[0]) {
      lightsRef.current[0].intensity = MathUtils.lerp(
        lightsRef.current[0].intensity,
        target * 1.2,
        dt,
      )
    }
    if (lightsRef.current[1]) {
      lightsRef.current[1].intensity = MathUtils.lerp(
        lightsRef.current[1].intensity,
        target * 0.5,
        dt,
      )
    }
    if (lightsRef.current[2]) {
      lightsRef.current[2].intensity = MathUtils.lerp(
        lightsRef.current[2].intensity,
        target * 0.5,
        dt,
      )
    }
  })

  return (
    <group {...handlers}>
      {/* Four corner posts */}
      {[
        [-halfW + postSize / 2, halfD - postSize / 2],
        [halfW - postSize / 2, halfD - postSize / 2],
        [-halfW + postSize / 2, -halfD + postSize / 2],
        [halfW - postSize / 2, -halfD + postSize / 2],
      ].map(([px, pz], i) => (
        <mesh
          castShadow
          key={`post-${i}`}
          material={WOOD_PERGOLA_POST}
          position={[px!, h / 2, pz!]}
          receiveShadow
        >
          <boxGeometry args={[postSize, h, postSize]} />
        </mesh>
      ))}
      {/* Two long beams running X */}
      {[halfD - postSize / 2, -halfD + postSize / 2].map((z, i) => (
        <mesh
          castShadow
          key={`beam-x-${i}`}
          material={WOOD_PERGOLA_BEAM}
          position={[0, h - beamSize / 2, z]}
          receiveShadow
        >
          <boxGeometry args={[w, beamSize, beamSize]} />
        </mesh>
      ))}
      {/* Two short cross-beams */}
      {[halfW - postSize / 2, -halfW + postSize / 2].map((x, i) => (
        <mesh
          castShadow
          key={`beam-z-${i}`}
          material={WOOD_PERGOLA_BEAM}
          position={[x, h - beamSize / 2 - beamSize - 0.005, 0]}
          receiveShadow
        >
          <boxGeometry args={[beamSize, beamSize, d - postSize]} />
        </mesh>
      ))}
      {/* Slatted roof — runs along Z so each slat's long axis is X */}
      {slats.map((s, i) => (
        <mesh
          castShadow
          key={`slat-${i}`}
          material={WOOD_PERGOLA_SLAT}
          position={[0, h - beamSize / 2 - beamSize - slatHeight / 2 - 0.01, s.z]}
          receiveShadow
        >
          <boxGeometry args={[w - postSize, slatHeight, slatThickness]} />
        </mesh>
      ))}
      {/* String lights along both long beams — bistro-style row of bulbs.
          All bulbs are emissive-only; a SINGLE warm point light at the
          pergola's center is the actual illumination contribution. This
          keeps the WebGPU active-light budget low so heavy scenes still
          render reliably. */}
      {[halfD - postSize / 2, -halfD + postSize / 2].map((z) =>
        stringBulbs.map((b, i) => {
          const idx = stringBulbs.indexOf(b) + (z > 0 ? 0 : stringBulbCount)
          return (
            <mesh
              key={`bulb-${z.toFixed(2)}-${i}`}
              position={[b.x, h - beamSize - 0.02, z]}
              ref={(m) => {
                if (m) bulbsRef.current[idx] = m
              }}
            >
              <sphereGeometry args={[0.045, 8, 6]} />
              <meshStandardMaterial
                color="#fff5d6"
                emissive="#ffd285"
                emissiveIntensity={0}
                metalness={0}
                roughness={0.5}
              />
            </mesh>
          )
        }),
      )}
      {/* One central warm point light under the pergola — replaces the
          per-bulb light grid that ate the WebGPU light budget */}
      <pointLight
        ref={(l) => {
          if (l) lightsRef.current[0] = l
        }}
        color="#ffd9a0"
        decay={2}
        distance={Math.max(w, d) * 1.1}
        intensity={0}
        position={[0, h - beamSize, 0]}
      />
      {/* Two corner accent lights for evening warmth */}
      <pointLight
        ref={(l) => {
          if (l) lightsRef.current[1] = l
        }}
        color="#ffd9a0"
        decay={2}
        distance={2.6}
        intensity={0}
        position={[halfW * 0.6, h - beamSize, halfD * 0.6]}
      />
      <pointLight
        ref={(l) => {
          if (l) lightsRef.current[2] = l
        }}
        color="#ffd9a0"
        decay={2}
        distance={2.6}
        intensity={0}
        position={[-halfW * 0.6, h - beamSize, -halfD * 0.6]}
      />
    </group>
  )
}

// ─── Outdoor Kitchen Island ────────────────────────────────────────────────

function OutdoorKitchenIsland({ node }: { node: ItemNode }) {
  const handlers = useNodeEvents(node, 'item')
  const [w, h, d] = node.asset.dimensions

  // Layout assumes a long axis along W (default ~2.6m wide × 0.95m tall × 0.7m deep)
  const counterHeight = h * 0.95 // counter top sits at 95% of total height
  const grillWidth = 0.7
  const grillDepth = 0.55
  const grillHeight = 0.18

  return (
    <group {...handlers}>
      {/* Cabinet base — stone-panel material with subtle line breakup */}
      <mesh castShadow material={KITCHEN_BASE} position={[0, counterHeight / 2, 0]} receiveShadow>
        <boxGeometry args={[w, counterHeight, d]} />
      </mesh>
      {/* Counter top — light stone slab, slightly larger than the base */}
      <mesh
        castShadow
        position={[0, counterHeight + 0.025, 0]}
        receiveShadow
      >
        <boxGeometry args={[w + 0.06, 0.05, d + 0.05]} />
        <meshStandardMaterial color="#dcd5c8" metalness={0.08} roughness={0.5} />
      </mesh>
      {/* Counter top edge — tiny darker stripe along the front edge for a real-looking lip */}
      <mesh position={[0, counterHeight + 0.001, d / 2 + 0.025]}>
        <boxGeometry args={[w + 0.06, 0.04, 0.005]} />
        <meshStandardMaterial color="#aea49a" metalness={0.05} roughness={0.6} />
      </mesh>
      {/* Inset grill — dark metallic block on top */}
      <mesh
        castShadow
        position={[0, counterHeight + 0.05 + grillHeight / 2, 0]}
        receiveShadow
      >
        <boxGeometry args={[grillWidth, grillHeight, grillDepth]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.85} roughness={0.32} />
      </mesh>
      {/* Grill grates — thin black lines visible from above */}
      {[0, 1, 2, 3].map((i) => (
        <mesh
          key={`grate-${i}`}
          position={[
            0,
            counterHeight + 0.05 + grillHeight + 0.001,
            -grillDepth / 2 + 0.08 + (i * (grillDepth - 0.16)) / 3,
          ]}
        >
          <boxGeometry args={[grillWidth - 0.08, 0.005, 0.015]} />
          <meshStandardMaterial color="#3a3a3a" metalness={0.7} roughness={0.4} />
        </mesh>
      ))}
      {/* Cabinet doors — thin slats on the front */}
      {[-w / 4, w / 4].map((x, i) => (
        <mesh key={`door-${i}`} position={[x, counterHeight / 2, d / 2 + 0.005]}>
          <boxGeometry args={[w / 2 - 0.08, counterHeight - 0.12, 0.01]} />
          <meshStandardMaterial color="#252525" metalness={0.15} roughness={0.6} />
        </mesh>
      ))}
      {/* Door handles */}
      {[-w / 4, w / 4].map((x, i) => (
        <mesh key={`handle-${i}`} position={[x + 0.18, counterHeight - 0.18, d / 2 + 0.013]}>
          <boxGeometry args={[0.08, 0.012, 0.012]} />
          <meshStandardMaterial color="#9a9690" metalness={0.85} roughness={0.3} />
        </mesh>
      ))}
      {/* Toe-kick recess — thin dark line at the bottom */}
      <mesh position={[0, 0.04, d / 2 + 0.001]}>
        <boxGeometry args={[w - 0.04, 0.06, 0.01]} />
        <meshStandardMaterial color="#0a0a0a" metalness={0} roughness={1} />
      </mesh>
    </group>
  )
}

// ─── Planter Box ────────────────────────────────────────────────────────────

function PlanterBox({ node }: { node: ItemNode }) {
  const handlers = useNodeEvents(node, 'item')
  const [w, h, d] = node.asset.dimensions
  const boxHeight = h * 0.55
  const foliageRadius = Math.min(w, d) * 0.45

  return (
    <group {...handlers}>
      {/* Wooden box with TSL grain */}
      <mesh castShadow material={WOOD_PLANTER} position={[0, boxHeight / 2, 0]} receiveShadow>
        <boxGeometry args={[w, boxHeight, d]} />
      </mesh>
      {/* Soil cap — slightly inset darker top */}
      <mesh position={[0, boxHeight + 0.005, 0]}>
        <boxGeometry args={[w - 0.04, 0.02, d - 0.04]} />
        <meshStandardMaterial color="#2c1f12" metalness={0} roughness={1} />
      </mesh>
      {/* Main foliage — slightly squashed sphere for a hedge feel */}
      <mesh
        castShadow
        position={[0, boxHeight + foliageRadius * 0.78, 0]}
        receiveShadow
      >
        <sphereGeometry args={[foliageRadius, 14, 10]} />
        <meshStandardMaterial color="#587f3a" metalness={0} roughness={1} />
      </mesh>
      {/* Two small extra clumps for visual breakup */}
      <mesh
        castShadow
        position={[-foliageRadius * 0.55, boxHeight + foliageRadius * 0.6, foliageRadius * 0.3]}
      >
        <sphereGeometry args={[foliageRadius * 0.55, 10, 8]} />
        <meshStandardMaterial color="#6f9648" metalness={0} roughness={1} />
      </mesh>
      <mesh
        castShadow
        position={[foliageRadius * 0.5, boxHeight + foliageRadius * 0.55, -foliageRadius * 0.35]}
      >
        <sphereGeometry args={[foliageRadius * 0.5, 10, 8]} />
        <meshStandardMaterial color="#557a35" metalness={0} roughness={1} />
      </mesh>
    </group>
  )
}

// ─── Stepping-Stone Pathway ────────────────────────────────────────────────

function SteppingStone({ node }: { node: ItemNode }) {
  const handlers = useNodeEvents(node, 'item')
  const [w, h, d] = node.asset.dimensions
  return (
    <group {...handlers}>
      <mesh
        castShadow
        position={[0, h / 2, 0]}
        receiveShadow
      >
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color="#bfb8a8" metalness={0} roughness={0.95} />
      </mesh>
    </group>
  )
}

// ─── Mansion Block ──────────────────────────────────────────────────────────
//
// A self-contained luxury modern mansion rendered as one procedural item.
// asset.dimensions is the OUTER footprint of the main mass: [w, h, d]
// where h is the main floor's wall height. The component additionally
// builds:
//
//   - main mass (the box defined by dimensions) with marble walls
//     and a flat granite roof
//   - a glass-walled south facade with three vertical marble strips
//     framing two large emissive glass panels (the "rear elevation"
//     facing the pool deck)
//   - a setback second story 80% the width × 70% the depth, sitting on
//     top of the main roof, also with a glass south facade
//   - east + west wings 30% of main width × full main depth × 60% of
//     main height, attached at each long side
//   - a front-entry portico: two slim marble columns and a flat roof
//     slab framing the door
//   - glass railings around the rear roof terrace
//
// Glass material is emissive — at dusk/evening it ramps up so the
// mansion reads as "interior lights are on." This is how the south
// elevation gets its luxury-real-estate glow without burning point
// lights.

function GlassPanel({
  width,
  height,
  position,
  intensityRef,
}: {
  width: number
  height: number
  position: [number, number, number]
  intensityRef: React.MutableRefObject<{ glass: Mesh[] }>
}) {
  return (
    <mesh
      position={position}
      ref={(m) => {
        if (m) intensityRef.current.glass.push(m)
      }}
      renderOrder={2}
    >
      <boxGeometry args={[width, height, 0.06]} />
      <meshStandardMaterial
        color="#a8d4ff"
        emissive="#ffe8b8"
        emissiveIntensity={0.05}
        transparent
        opacity={0.78}
        depthWrite={false}
        metalness={0.4}
        roughness={0.12}
      />
    </mesh>
  )
}

function MansionBlock({ node }: { node: ItemNode }) {
  const handlers = useNodeEvents(node, 'item')
  const [w, h, d] = node.asset.dimensions
  const timeOfDay = useViewer((s) => s.timeOfDay)

  // Architecture parameters
  const wallThickness = 0.3
  const halfW = w / 2
  const halfD = d / 2

  // Setback (2nd story) parameters
  const setbackW = w * 0.78
  const setbackH = h * 0.55
  const setbackD = d * 0.7
  const setbackHalfW = setbackW / 2
  const setbackHalfD = setbackD / 2

  // Wing parameters
  const wingW = w * 0.32
  const wingH = h * 0.62
  const wingD = d
  const wingOffsetX = halfW + wingW / 2

  // Portico parameters
  const porticoColW = 0.35
  const porticoColH = h * 0.95
  const porticoSpan = 5

  // Track all glass meshes for the time-of-day ramp
  const refs = useRef<{ glass: Mesh[] }>({ glass: [] })
  // Reset on each render — refs collect during JSX evaluation
  refs.current.glass = []

  useFrame((_, delta) => {
    const dt = MathUtils.clamp(delta * 4, 0, 1)
    const target =
      timeOfDay === 'evening'
        ? 1.4
        : timeOfDay === 'dusk'
          ? 0.95
          : timeOfDay === 'goldenHour'
            ? 0.35
            : 0.08
    for (const m of refs.current.glass) {
      const mat = m.material as any
      if (typeof mat.emissiveIntensity === 'number') {
        mat.emissiveIntensity = MathUtils.lerp(mat.emissiveIntensity, target, dt)
      }
    }
  })

  // Glass-panel widths for main south facade — three marble strips at
  // x=±18..±14 + center, two glass panels between them.
  const stripW = w * 0.08 // 8% of width as a strip
  const glassOuter = (w - 2 * stripW - stripW) / 2 // two glass panels split the remaining width minus a center strip

  // Marble color for walls (matches library:wall-marble1 vibe)
  const marbleColor = '#dcd6c8'
  const stoneColor = '#3a3a3a'
  const woodTrimColor = '#604a30'

  // ── BUILD ──
  return (
    <group {...handlers}>
      {/* ── MAIN MASS ───────────────────────────────────────────────────── */}
      {/* Floor (interior, hidden under furnishings — but reads as a stone slab if camera dips low) */}
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <boxGeometry args={[w - wallThickness, 0.1, d - wallThickness]} />
        <meshStandardMaterial color="#bdb6a8" metalness={0.05} roughness={0.7} />
      </mesh>
      {/* Main flat roof — granite */}
      <mesh castShadow position={[0, h + 0.1, 0]} receiveShadow>
        <boxGeometry args={[w + 0.2, 0.2, d + 0.2]} />
        <meshStandardMaterial color={stoneColor} metalness={0.12} roughness={0.55} />
      </mesh>
      {/* North wall (back) — solid marble */}
      <mesh
        castShadow
        position={[0, h / 2, -halfD + wallThickness / 2]}
        receiveShadow
      >
        <boxGeometry args={[w, h, wallThickness]} />
        <meshStandardMaterial color={marbleColor} metalness={0.05} roughness={0.5} />
      </mesh>
      {/* East wall (interior side, only the parts not covered by wing) */}
      <mesh
        castShadow
        position={[halfW - wallThickness / 2, h / 2, 0]}
        receiveShadow
      >
        <boxGeometry args={[wallThickness, h, d]} />
        <meshStandardMaterial color={marbleColor} metalness={0.05} roughness={0.5} />
      </mesh>
      {/* West wall */}
      <mesh
        castShadow
        position={[-halfW + wallThickness / 2, h / 2, 0]}
        receiveShadow
      >
        <boxGeometry args={[wallThickness, h, d]} />
        <meshStandardMaterial color={marbleColor} metalness={0.05} roughness={0.5} />
      </mesh>
      {/* South wall — split into 3 marble strips with 2 glass panels between */}
      {/* Left strip (corner) */}
      <mesh
        castShadow
        position={[-halfW + stripW / 2, h / 2, halfD - wallThickness / 2]}
      >
        <boxGeometry args={[stripW, h, wallThickness]} />
        <meshStandardMaterial color={marbleColor} metalness={0.05} roughness={0.5} />
      </mesh>
      {/* Center strip */}
      <mesh
        castShadow
        position={[0, h / 2, halfD - wallThickness / 2]}
      >
        <boxGeometry args={[stripW, h, wallThickness]} />
        <meshStandardMaterial color={marbleColor} metalness={0.05} roughness={0.5} />
      </mesh>
      {/* Right strip */}
      <mesh
        castShadow
        position={[halfW - stripW / 2, h / 2, halfD - wallThickness / 2]}
      >
        <boxGeometry args={[stripW, h, wallThickness]} />
        <meshStandardMaterial color={marbleColor} metalness={0.05} roughness={0.5} />
      </mesh>
      {/* Glass panel — left half */}
      <GlassPanel
        height={h - 0.6}
        intensityRef={refs}
        position={[
          -halfW + stripW + glassOuter / 2,
          h / 2,
          halfD - wallThickness / 2,
        ]}
        width={glassOuter}
      />
      {/* Glass panel — right half */}
      <GlassPanel
        height={h - 0.6}
        intensityRef={refs}
        position={[
          halfW - stripW - glassOuter / 2,
          h / 2,
          halfD - wallThickness / 2,
        ]}
        width={glassOuter}
      />
      {/* Floor slab between glass and overhang — covered patio strip */}
      <mesh position={[0, 0.06, halfD + 0.4]} receiveShadow>
        <boxGeometry args={[w * 0.7, 0.04, 0.8]} />
        <meshStandardMaterial color="#aea49a" metalness={0.08} roughness={0.55} />
      </mesh>

      {/* ── SECOND STORY (set back) ─────────────────────────────────────── */}
      {/* Floor of setback (which IS the main roof's surface, just decorative) */}
      {/* North wall */}
      <mesh
        castShadow
        position={[0, h + 0.2 + setbackH / 2, -setbackHalfD + wallThickness / 2]}
        receiveShadow
      >
        <boxGeometry args={[setbackW, setbackH, wallThickness]} />
        <meshStandardMaterial color={marbleColor} metalness={0.05} roughness={0.5} />
      </mesh>
      {/* East wall */}
      <mesh
        castShadow
        position={[setbackHalfW - wallThickness / 2, h + 0.2 + setbackH / 2, 0]}
        receiveShadow
      >
        <boxGeometry args={[wallThickness, setbackH, setbackD]} />
        <meshStandardMaterial color={marbleColor} metalness={0.05} roughness={0.5} />
      </mesh>
      {/* West wall */}
      <mesh
        castShadow
        position={[-setbackHalfW + wallThickness / 2, h + 0.2 + setbackH / 2, 0]}
        receiveShadow
      >
        <boxGeometry args={[wallThickness, setbackH, setbackD]} />
        <meshStandardMaterial color={marbleColor} metalness={0.05} roughness={0.5} />
      </mesh>
      {/* South wall — 2 corner strips + 1 large glass panel */}
      <mesh
        castShadow
        position={[-setbackHalfW + stripW / 2, h + 0.2 + setbackH / 2, setbackHalfD - wallThickness / 2]}
      >
        <boxGeometry args={[stripW, setbackH, wallThickness]} />
        <meshStandardMaterial color={marbleColor} metalness={0.05} roughness={0.5} />
      </mesh>
      <mesh
        castShadow
        position={[setbackHalfW - stripW / 2, h + 0.2 + setbackH / 2, setbackHalfD - wallThickness / 2]}
      >
        <boxGeometry args={[stripW, setbackH, wallThickness]} />
        <meshStandardMaterial color={marbleColor} metalness={0.05} roughness={0.5} />
      </mesh>
      {/* Setback glass — one big panel */}
      <GlassPanel
        height={setbackH - 0.4}
        intensityRef={refs}
        position={[0, h + 0.2 + setbackH / 2, setbackHalfD - wallThickness / 2]}
        width={setbackW - 2 * stripW - 0.1}
      />
      {/* Setback flat roof */}
      <mesh
        castShadow
        position={[0, h + 0.2 + setbackH + 0.1, 0]}
        receiveShadow
      >
        <boxGeometry args={[setbackW + 0.2, 0.2, setbackD + 0.2]} />
        <meshStandardMaterial color={stoneColor} metalness={0.12} roughness={0.55} />
      </mesh>

      {/* ── EAST WING ──────────────────────────────────────────────────── */}
      {/* Floor */}
      <mesh position={[wingOffsetX, 0.05, 0]} receiveShadow>
        <boxGeometry args={[wingW - wallThickness, 0.1, wingD - wallThickness]} />
        <meshStandardMaterial color="#bdb6a8" metalness={0.05} roughness={0.7} />
      </mesh>
      {/* East wing roof */}
      <mesh castShadow position={[wingOffsetX, wingH + 0.1, 0]} receiveShadow>
        <boxGeometry args={[wingW + 0.2, 0.2, wingD + 0.2]} />
        <meshStandardMaterial color={stoneColor} metalness={0.12} roughness={0.55} />
      </mesh>
      {/* East wing east wall */}
      <mesh
        castShadow
        position={[wingOffsetX + wingW / 2 - wallThickness / 2, wingH / 2, 0]}
        receiveShadow
      >
        <boxGeometry args={[wallThickness, wingH, wingD]} />
        <meshStandardMaterial color={marbleColor} metalness={0.05} roughness={0.5} />
      </mesh>
      {/* East wing north wall */}
      <mesh
        castShadow
        position={[wingOffsetX, wingH / 2, -halfD + wallThickness / 2]}
        receiveShadow
      >
        <boxGeometry args={[wingW, wingH, wallThickness]} />
        <meshStandardMaterial color={marbleColor} metalness={0.05} roughness={0.5} />
      </mesh>
      {/* East wing south wall — strip + glass */}
      <mesh
        castShadow
        position={[wingOffsetX + wingW / 2 - stripW / 2, wingH / 2, halfD - wallThickness / 2]}
      >
        <boxGeometry args={[stripW, wingH, wallThickness]} />
        <meshStandardMaterial color={marbleColor} metalness={0.05} roughness={0.5} />
      </mesh>
      <GlassPanel
        height={wingH - 0.4}
        intensityRef={refs}
        position={[
          wingOffsetX - stripW / 2,
          wingH / 2,
          halfD - wallThickness / 2,
        ]}
        width={wingW - stripW - 0.1}
      />

      {/* ── WEST WING (mirror) ──────────────────────────────────────────── */}
      <mesh position={[-wingOffsetX, 0.05, 0]} receiveShadow>
        <boxGeometry args={[wingW - wallThickness, 0.1, wingD - wallThickness]} />
        <meshStandardMaterial color="#bdb6a8" metalness={0.05} roughness={0.7} />
      </mesh>
      <mesh castShadow position={[-wingOffsetX, wingH + 0.1, 0]} receiveShadow>
        <boxGeometry args={[wingW + 0.2, 0.2, wingD + 0.2]} />
        <meshStandardMaterial color={stoneColor} metalness={0.12} roughness={0.55} />
      </mesh>
      <mesh
        castShadow
        position={[-wingOffsetX - wingW / 2 + wallThickness / 2, wingH / 2, 0]}
        receiveShadow
      >
        <boxGeometry args={[wallThickness, wingH, wingD]} />
        <meshStandardMaterial color={marbleColor} metalness={0.05} roughness={0.5} />
      </mesh>
      <mesh
        castShadow
        position={[-wingOffsetX, wingH / 2, -halfD + wallThickness / 2]}
        receiveShadow
      >
        <boxGeometry args={[wingW, wingH, wallThickness]} />
        <meshStandardMaterial color={marbleColor} metalness={0.05} roughness={0.5} />
      </mesh>
      <mesh
        castShadow
        position={[-wingOffsetX - wingW / 2 + stripW / 2, wingH / 2, halfD - wallThickness / 2]}
      >
        <boxGeometry args={[stripW, wingH, wallThickness]} />
        <meshStandardMaterial color={marbleColor} metalness={0.05} roughness={0.5} />
      </mesh>
      <GlassPanel
        height={wingH - 0.4}
        intensityRef={refs}
        position={[
          -wingOffsetX + stripW / 2,
          wingH / 2,
          halfD - wallThickness / 2,
        ]}
        width={wingW - stripW - 0.1}
      />

      {/* ── FRONT ENTRY PORTICO ──────────────────────────────────────────── */}
      {/* Two slim columns flanking the door, set forward 1m from the south wall */}
      <mesh
        castShadow
        position={[-porticoSpan / 2, porticoColH / 2, halfD + 1]}
        receiveShadow
      >
        <boxGeometry args={[porticoColW, porticoColH, porticoColW]} />
        <meshStandardMaterial color={marbleColor} metalness={0.08} roughness={0.45} />
      </mesh>
      <mesh
        castShadow
        position={[porticoSpan / 2, porticoColH / 2, halfD + 1]}
        receiveShadow
      >
        <boxGeometry args={[porticoColW, porticoColH, porticoColW]} />
        <meshStandardMaterial color={marbleColor} metalness={0.08} roughness={0.45} />
      </mesh>
      {/* Portico flat roof connecting the columns to the main mass */}
      <mesh
        castShadow
        position={[0, porticoColH + 0.15, halfD + 0.55]}
        receiveShadow
      >
        <boxGeometry args={[porticoSpan + 1, 0.3, 1.6]} />
        <meshStandardMaterial color={woodTrimColor} metalness={0.05} roughness={0.6} />
      </mesh>

      {/* ── ROOF DECK GLASS RAILING ──────────────────────────────────────── */}
      {/* Glass railing on the south edge of the main roof (where the
          setback isn't covering — i.e. the strips on either side of the
          setback) */}
      <mesh
        position={[(halfW + setbackHalfW) / 2, h + 0.7, halfD - 0.1]}
      >
        <boxGeometry args={[(w - setbackW) / 2 - 0.4, 1.0, 0.04]} />
        <meshStandardMaterial
          color="#a8d4ff"
          emissive="#a8d4ff"
          emissiveIntensity={0.04}
          transparent
          opacity={0.35}
          depthWrite={false}
          metalness={0.3}
          roughness={0.1}
        />
      </mesh>
      <mesh
        position={[-(halfW + setbackHalfW) / 2, h + 0.7, halfD - 0.1]}
      >
        <boxGeometry args={[(w - setbackW) / 2 - 0.4, 1.0, 0.04]} />
        <meshStandardMaterial
          color="#a8d4ff"
          emissive="#a8d4ff"
          emissiveIntensity={0.04}
          transparent
          opacity={0.35}
          depthWrite={false}
          metalness={0.3}
          roughness={0.1}
        />
      </mesh>

      {/* ── EXTERIOR ARCHITECTURAL ACCENT LIGHTS ─────────────────────────── */}
      {/* One warm light over the front entry, one over the rear pool-facing
          facade. These are the only point lights the mansion contributes
          to the scene's dynamic-light budget — emissive glass does the
          heavy lifting for everything else. */}
      <pointLight
        color="#ffd9a0"
        decay={2}
        distance={Math.max(w, d) * 0.35}
        intensity={0}
        position={[0, porticoColH, halfD + 1.5]}
        ref={(l) => {
          if (l) {
            // ramp up at dusk/evening
            const ramp = () => {
              if (!l) return
              const t = timeOfDay
              l.intensity =
                t === 'evening'
                  ? 1.4
                  : t === 'dusk'
                    ? 0.9
                    : t === 'goldenHour'
                      ? 0.3
                      : 0.05
            }
            ramp()
          }
        }}
      />
    </group>
  )
}

// ─── Pool Shimmer ──────────────────────────────────────────────────────────

/** Animated additive shimmer plane sized to fit on top of a pool's water
 *  surface. asset.dimensions = [w, _, d] of the water polygon; the plane
 *  is rendered horizontal at y ≈ 0.001 above the placement point so it
 *  doesn't z-fight the water slab. The shimmer is a slow-time TSL ripple
 *  in HSL-warm-cool that reads as moving caustics under the water. */
function PoolShimmer({ node }: { node: ItemNode }) {
  const handlers = useNodeEvents(node, 'item')
  const [w, , d] = node.asset.dimensions

  const material = useMemo(() => {
    const mat = new MeshStandardNodeMaterial({
      transparent: true,
      depthWrite: false,
      metalness: 0.3,
      roughness: 0.18,
    })
    mat.blending = AdditiveBlending
    // Two layered sin waves at slightly different frequencies/speeds —
    // their interference reads as a real caustic ripple
    const wp = positionWorld
    const t = time.mul(0.6)
    const r1 = sin(wp.x.mul(2.4).add(t.mul(1.1))).mul(cos(wp.z.mul(2.0).sub(t.mul(0.9))))
    const r2 = sin(wp.x.mul(4.1).sub(t.mul(0.7))).mul(cos(wp.z.mul(3.7).add(t.mul(1.3))))
    const wave = r1.mul(0.5).add(0.5).mul(r2.mul(0.5).add(0.5))
    // Color: bright sky-blue highlight on pale base
    const c = mix(tslColor('#5fa3d8'), tslColor('#e8f4ff'), wave.mul(0.85))
    mat.colorNode = c
    // Opacity dips low — we don't want to wash out the underlying water,
    // just hint at light dancing on the surface
    mat.opacityNode = wave.mul(0.32).add(0.04)
    return mat
  }, [])

  return (
    <group {...handlers}>
      <mesh
        material={material}
        position={[0, 0.012, 0]}
        renderOrder={5}
        rotation-x={-Math.PI / 2}
      >
        <planeGeometry args={[w, d, 1, 1]} />
      </mesh>
    </group>
  )
}

// ─── Pool Coping ────────────────────────────────────────────────────────────

function PoolCoping({ node }: { node: ItemNode }) {
  const handlers = useNodeEvents(node, 'item')
  const [w, h, d] = node.asset.dimensions
  // Coping is a stone frame around a pool. asset.dimensions is the OUTER
  // edge size; we render four thin slabs at the perimeter, leaving the
  // inner rectangle hollow so the water slab shows through.
  const copingWidth = 0.45
  const halfW = w / 2
  const halfD = d / 2
  const innerW = Math.max(0.5, w - copingWidth * 2)
  const innerD = Math.max(0.5, d - copingWidth * 2)

  return (
    <group {...handlers}>
      {/* Top side (z = -halfD + copingWidth/2) */}
      <mesh position={[0, h / 2, -halfD + copingWidth / 2]} receiveShadow>
        <boxGeometry args={[w, h, copingWidth]} />
        <meshStandardMaterial color="#cfc7b6" metalness={0.05} roughness={0.55} />
      </mesh>
      {/* Bottom side */}
      <mesh position={[0, h / 2, halfD - copingWidth / 2]} receiveShadow>
        <boxGeometry args={[w, h, copingWidth]} />
        <meshStandardMaterial color="#cfc7b6" metalness={0.05} roughness={0.55} />
      </mesh>
      {/* Left side (z spans innerD between the top/bottom) */}
      <mesh
        position={[-halfW + copingWidth / 2, h / 2, 0]}
        receiveShadow
      >
        <boxGeometry args={[copingWidth, h, innerD]} />
        <meshStandardMaterial color="#cfc7b6" metalness={0.05} roughness={0.55} />
      </mesh>
      {/* Right side */}
      <mesh
        position={[halfW - copingWidth / 2, h / 2, 0]}
        receiveShadow
      >
        <boxGeometry args={[copingWidth, h, innerD]} />
        <meshStandardMaterial color="#cfc7b6" metalness={0.05} roughness={0.55} />
      </mesh>
    </group>
  )
}

// ─── Garden Lantern ────────────────────────────────────────────────────────

// Garden lantern: emissive-only by default. The bulb glows at dusk/evening
// via emissiveIntensity ramping with time of day, but it does NOT carry a
// per-instance point light. With scenes shipping 30+ lanterns, attaching a
// real point light to each one pushes the WebGPU forward shader past its
// active-light budget and the heavy hero scenes (Luxury Nighttime, Ultimate
// Estate) refuse to render. Atmospheric warm light comes from the
// time-of-day palette's hemisphere/fill/rim lights and from the few
// instances that DO carry point lights (firepit, pergola string lights).
function GardenLantern({ node }: { node: ItemNode }) {
  const handlers = useNodeEvents(node, 'item')
  const [, h] = node.asset.dimensions
  const lampRef = useRef<Mesh>(null!)
  const timeOfDay = useViewer((s) => s.timeOfDay)

  useFrame((_, delta) => {
    const dt = MathUtils.clamp(delta * 5, 0, 1)
    const target =
      timeOfDay === 'evening'
        ? 0.9
        : timeOfDay === 'dusk'
          ? 0.55
          : timeOfDay === 'goldenHour'
            ? 0.18
            : 0
    if (lampRef.current) {
      ;(lampRef.current.material as any).emissiveIntensity = MathUtils.lerp(
        (lampRef.current.material as any).emissiveIntensity ?? 0,
        target * 2.4 + 0.05,
        dt,
      )
    }
  })

  const stemHeight = h * 0.78
  return (
    <group {...handlers}>
      {/* Stake stem — dark metal */}
      <mesh castShadow position={[0, stemHeight / 2, 0]} receiveShadow>
        <cylinderGeometry args={[0.018, 0.018, stemHeight, 8]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.85} roughness={0.35} />
      </mesh>
      {/* Lamp head — emissive bulb, brighter to compensate for no point light */}
      <mesh ref={lampRef} position={[0, stemHeight + 0.06, 0]}>
        <sphereGeometry args={[0.075, 12, 8]} />
        <meshStandardMaterial
          color="#fff5d6"
          emissive="#ffe7a8"
          emissiveIntensity={0.05}
          metalness={0}
          roughness={0.4}
        />
      </mesh>
    </group>
  )
}

// ─── Registry ──────────────────────────────────────────────────────────────

const PROCEDURAL_REGISTRY: Record<
  string,
  React.FC<{ node: ItemNode }>
> = {
  firepit: Firepit,
  pergola: Pergola,
  'outdoor-kitchen-island': OutdoorKitchenIsland,
  'planter-box': PlanterBox,
  'stepping-stone': SteppingStone,
  'garden-lantern': GardenLantern,
  'pool-coping': PoolCoping,
  'pool-shimmer': PoolShimmer,
  'mansion-block': MansionBlock,
}

export const PROCEDURAL_ITEM_IDS = Object.keys(PROCEDURAL_REGISTRY)

export function ProceduralItem({ node }: { node: ItemNode }) {
  const id = getProceduralId(node.asset.src)
  const Component = PROCEDURAL_REGISTRY[id]
  if (!Component) {
    // Fall through to a wireframe box so the user sees something is wrong
    // without crashing the whole scene
    const [w, h, d] = node.asset.dimensions
    return (
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color="#888" wireframe />
      </mesh>
    )
  }
  return <Component node={node} />
}
