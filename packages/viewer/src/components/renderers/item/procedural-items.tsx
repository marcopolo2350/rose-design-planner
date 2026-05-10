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

  // When the planter is stretched along one axis (w/d ratio > 1.6) we
  // render it as a hedge row — multiple foliage clumps tiled along the
  // long axis so it reads as continuous greenery rather than a giant
  // single ball. Aspect-ratio-driven; same component, no new asset.
  const longAxis = w >= d ? 'x' : 'z'
  const longLen = Math.max(w, d)
  const shortLen = Math.min(w, d)
  const aspect = longLen / shortLen
  const isHedgeRow = aspect >= 1.6
  const clumpRadius = shortLen * 0.55
  const clumpCount = isHedgeRow ? Math.max(2, Math.round(longLen / (clumpRadius * 1.5))) : 1

  const greens = ['#587f3a', '#6f9648', '#557a35', '#4d6f30', '#7da257']

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
      {isHedgeRow ? (
        <>
          {/* Continuous hedge — N overlapping clumps along the long axis.
              Each clump has independent jitter on radius, height, lateral
              offset and color so the silhouette never reads as a regular
              row of spheres. Deterministic pseudo-random per (i, longLen)
              so hedges are stable across re-renders. */}
          {Array.from({ length: clumpCount }, (_, i) => {
            const t = clumpCount === 1 ? 0.5 : i / (clumpCount - 1)
            const offset = (t - 0.5) * (longLen - clumpRadius * 0.6)
            // Three independent pseudo-random phases per clump
            const p1 = ((i * 1.137 + longLen * 0.071) % 1 + 1) % 1
            const p2 = ((i * 0.683 + longLen * 0.213) % 1 + 1) % 1
            const p3 = ((i * 1.911 + longLen * 0.107) % 1 + 1) % 1
            // Lateral wobble (perp to the hedge axis)
            const wobble = (p2 - 0.5) * shortLen * 0.18
            const cx = longAxis === 'x' ? offset : wobble
            const cz = longAxis === 'z' ? offset : wobble
            // Radius + height variation
            const r = clumpRadius * (0.86 + p1 * 0.32)
            const yLift = (p3 - 0.5) * clumpRadius * 0.22
            const colorIdx = (i + Math.floor(p1 * 7) + Math.floor(p3 * 3)) % greens.length
            return (
              <mesh
                castShadow
                key={`hedge-${i}`}
                position={[cx, boxHeight + r * 0.78 + yLift, cz]}
                receiveShadow
              >
                <sphereGeometry args={[r, 12, 9]} />
                <meshStandardMaterial color={greens[colorIdx]} metalness={0} roughness={1} />
              </mesh>
            )
          })}
          {/* TOP-OF-HEDGE TUFTS — small accent clumps at varied heights
              break up the silhouette so the hedge reads organic, not
              like a row of identical balls. Density scales with length. */}
          {clumpCount >= 3
            ? Array.from({ length: Math.max(2, Math.floor(clumpCount * 0.7)) }, (_, i) => {
                const tuftCount = Math.max(2, Math.floor(clumpCount * 0.7))
                const t = (i + 1) / (tuftCount + 1)
                const p1 = ((i * 2.317 + longLen * 0.193) % 1 + 1) % 1
                const p2 = ((i * 1.787 + longLen * 0.319) % 1 + 1) % 1
                const offset = (t - 0.5) * longLen * 0.92 + (p1 - 0.5) * clumpRadius * 0.4
                const lateralJitter = (p2 - 0.5) * shortLen * 0.35
                const cx = longAxis === 'x' ? offset : lateralJitter
                const cz = longAxis === 'z' ? offset : lateralJitter
                const tuftR = clumpRadius * (0.32 + p1 * 0.22)
                const yLift = clumpRadius * (0.95 + p2 * 0.32)
                return (
                  <mesh
                    castShadow
                    key={`hedge-tuft-${i}`}
                    position={[cx, boxHeight + yLift, cz]}
                  >
                    <sphereGeometry args={[tuftR, 8, 6]} />
                    <meshStandardMaterial
                      color={greens[(i + 2 + Math.floor(p1 * 5)) % greens.length]}
                      metalness={0}
                      roughness={1}
                    />
                  </mesh>
                )
              })
            : null}
          {/* SIDE TUFTS — tiny clumps spilling over the planter edge so
              the box doesn't read as a hard rectangle */}
          {clumpCount >= 2
            ? Array.from({ length: Math.max(2, Math.floor(clumpCount * 0.5)) }, (_, i) => {
                const sideCount = Math.max(2, Math.floor(clumpCount * 0.5))
                const t = (i + 0.5) / sideCount
                const offset = (t - 0.5) * longLen * 0.85
                const side = i % 2 === 0 ? 1 : -1
                const p1 = ((i * 0.917 + longLen * 0.413) % 1 + 1) % 1
                const cx = longAxis === 'x' ? offset : side * shortLen * (0.45 + p1 * 0.1)
                const cz = longAxis === 'z' ? offset : side * shortLen * (0.45 + p1 * 0.1)
                return (
                  <mesh
                    castShadow
                    key={`hedge-side-${i}`}
                    position={[
                      longAxis === 'x' ? cx : cx,
                      boxHeight + clumpRadius * (0.4 + p1 * 0.2),
                      longAxis === 'z' ? cz : cz,
                    ]}
                  >
                    <sphereGeometry args={[clumpRadius * (0.3 + p1 * 0.18), 7, 6]} />
                    <meshStandardMaterial
                      color={greens[(i + 4) % greens.length]}
                      metalness={0}
                      roughness={1}
                    />
                  </mesh>
                )
              })
            : null}

          {/* BETWEEN-CLUMP FILLER — small irregular shapes nestled between
              main clumps to break up the rhythm of repeated spheres. Each
              one is small, low, and positioned so it spans the gap. */}
          {clumpCount >= 4
            ? Array.from({ length: clumpCount - 1 }, (_, i) => {
                const t = (i + 0.5) / clumpCount
                const offset = (t - 0.5) * (longLen - clumpRadius * 0.6)
                const p1 = ((i * 1.547 + longLen * 0.293) % 1 + 1) % 1
                const p2 = ((i * 0.823 + longLen * 0.587) % 1 + 1) % 1
                // Skip ~30% of fillers for irregular spacing
                if (p1 > 0.7) return null
                const lateral = (p2 - 0.5) * shortLen * 0.25
                const cx = longAxis === 'x' ? offset : lateral
                const cz = longAxis === 'z' ? offset : lateral
                return (
                  <mesh
                    castShadow
                    key={`hedge-fill-${i}`}
                    position={[cx, boxHeight + clumpRadius * (0.55 + p1 * 0.15), cz]}
                  >
                    <sphereGeometry args={[clumpRadius * (0.42 + p2 * 0.15), 8, 6]} />
                    <meshStandardMaterial
                      color={greens[(i + 1 + Math.floor(p1 * 7)) % greens.length]}
                      metalness={0}
                      roughness={1}
                    />
                  </mesh>
                )
              })
            : null}

          {/* BASE-OF-HEDGE GRASS TUFTS — small ornamental-grass clumps
              at the base of the hedge breaking the planter-meets-ground
              line. Slightly different green than the hedge itself. */}
          {clumpCount >= 3
            ? Array.from({ length: Math.max(3, Math.floor(clumpCount * 0.6)) }, (_, i) => {
                const grassCount = Math.max(3, Math.floor(clumpCount * 0.6))
                const t = (i + 0.5) / grassCount
                const offset = (t - 0.5) * longLen * 0.92
                const side = i % 2 === 0 ? 1 : -1
                const p1 = ((i * 1.319 + longLen * 0.721) % 1 + 1) % 1
                const p2 = ((i * 2.103 + longLen * 0.131) % 1 + 1) % 1
                // Skip ~25% for irregular density
                if (p1 > 0.75) return null
                const cx =
                  longAxis === 'x'
                    ? offset
                    : side * shortLen * (0.5 + p1 * 0.15)
                const cz =
                  longAxis === 'z'
                    ? offset
                    : side * shortLen * (0.5 + p1 * 0.15)
                const grassR = clumpRadius * (0.18 + p2 * 0.12)
                // Render 2-3 small overlapping spheres per tuft for a fluffy look
                return (
                  <group
                    key={`hedge-grass-${i}`}
                    position={[cx, boxHeight + grassR * 0.5, cz]}
                  >
                    <mesh castShadow>
                      <sphereGeometry args={[grassR, 6, 5]} />
                      <meshStandardMaterial
                        color="#7da256"
                        metalness={0}
                        roughness={1}
                      />
                    </mesh>
                    <mesh
                      castShadow
                      position={[grassR * 0.4, grassR * 0.3, grassR * 0.2]}
                    >
                      <sphereGeometry args={[grassR * 0.7, 5, 4]} />
                      <meshStandardMaterial
                        color="#90b86a"
                        metalness={0}
                        roughness={1}
                      />
                    </mesh>
                    <mesh
                      castShadow
                      position={[-grassR * 0.35, grassR * 0.2, -grassR * 0.25]}
                    >
                      <sphereGeometry args={[grassR * 0.65, 5, 4]} />
                      <meshStandardMaterial
                        color="#6f9648"
                        metalness={0}
                        roughness={1}
                      />
                    </mesh>
                  </group>
                )
              })
            : null}
        </>
      ) : (
        <>
          {/* Single bush — original look for square planters */}
          <mesh
            castShadow
            position={[0, boxHeight + clumpRadius * 0.78, 0]}
            receiveShadow
          >
            <sphereGeometry args={[clumpRadius, 14, 10]} />
            <meshStandardMaterial color="#587f3a" metalness={0} roughness={1} />
          </mesh>
          <mesh
            castShadow
            position={[-clumpRadius * 0.55, boxHeight + clumpRadius * 0.6, clumpRadius * 0.3]}
          >
            <sphereGeometry args={[clumpRadius * 0.55, 10, 8]} />
            <meshStandardMaterial color="#6f9648" metalness={0} roughness={1} />
          </mesh>
          <mesh
            castShadow
            position={[clumpRadius * 0.5, boxHeight + clumpRadius * 0.55, -clumpRadius * 0.35]}
          >
            <sphereGeometry args={[clumpRadius * 0.5, 10, 8]} />
            <meshStandardMaterial color="#557a35" metalness={0} roughness={1} />
          </mesh>
        </>
      )}
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
  mullionCount = 0,
}: {
  width: number
  height: number
  position: [number, number, number]
  intensityRef: React.MutableRefObject<{ glass: Mesh[] }>
  /** Number of vertical dividers to render across the glass — 0 means a
   *  single uninterrupted pane, 3 splits it into 4 panels with mullions */
  mullionCount?: number
}) {
  const mullionThickness = 0.08
  return (
    <group position={position}>
      <mesh
        ref={(m) => {
          if (m) intensityRef.current.glass.push(m)
        }}
        renderOrder={2}
      >
        <boxGeometry args={[width, height, 0.05]} />
        <meshStandardMaterial
          color="#a8d4ff"
          emissive="#ffe8b8"
          emissiveIntensity={0.05}
          transparent
          opacity={0.74}
          depthWrite={false}
          metalness={0.45}
          roughness={0.1}
        />
      </mesh>
      {/* Vertical mullion bars cutting the glass into panes */}
      {Array.from({ length: mullionCount }, (_, i) => {
        const t = (i + 1) / (mullionCount + 1)
        const x = -width / 2 + t * width
        return (
          <mesh key={`mullion-${i}`} position={[x, 0, 0.03]}>
            <boxGeometry args={[mullionThickness, height, 0.06]} />
            <meshStandardMaterial color="#1f1f1f" metalness={0.6} roughness={0.4} />
          </mesh>
        )
      })}
      {/* Horizontal mullion at mid-height for taller panels */}
      {height > 3 ? (
        <mesh position={[0, 0, 0.03]}>
          <boxGeometry args={[width, mullionThickness, 0.06]} />
          <meshStandardMaterial color="#1f1f1f" metalness={0.6} roughness={0.4} />
        </mesh>
      ) : null}
      {/* Frame around the glass — top + bottom */}
      <mesh position={[0, height / 2, 0.04]}>
        <boxGeometry args={[width, mullionThickness, 0.07]} />
        <meshStandardMaterial color="#1f1f1f" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0, -height / 2, 0.04]}>
        <boxGeometry args={[width, mullionThickness, 0.07]} />
        <meshStandardMaterial color="#1f1f1f" metalness={0.6} roughness={0.4} />
      </mesh>
    </group>
  )
}

function MansionBlock({ node }: { node: ItemNode }) {
  const handlers = useNodeEvents(node, 'item')
  const [w, h, d] = node.asset.dimensions
  const timeOfDay = useViewer((s) => s.timeOfDay)

  // ── ARCHITECTURE PARAMETERS ────────────────────────────────────────────
  const halfW = w / 2
  const halfD = d / 2
  const wallThickness = 0.3

  // Foundation plinth (dark stone band wrapping the entire footprint)
  const plinthH = 0.5
  const plinthOversize = 0.4

  // Roof overhang (cantilevered projection from each roof line)
  const roofOverhang = 1.2
  const roofThickness = 0.35

  // Roof parapet (rim wall around the roof edge — modern flat-roof signature)
  const parapetH = 0.35

  // Setback (2nd story) — sits on top of main, slightly smaller
  const setbackW = w * 0.7
  const setbackH = h * 0.55
  const setbackD = d * 0.65
  const setbackHalfW = setbackW / 2
  const setbackHalfD = setbackD / 2
  const setbackY0 = h + plinthH + roofThickness // base elevation of setback

  // Wings — asymmetric (east bigger than west)
  const eastWingW = w * 0.36
  const eastWingD = d * 1.05
  const eastWingH = h * 0.62
  const eastOffsetX = halfW + eastWingW / 2

  const westWingW = w * 0.28
  const westWingD = d * 0.95
  const westWingH = h * 0.58
  const westOffsetX = halfW + westWingW / 2 // west wing offset (we'll negate)

  // Recessed entry — south wall has a 6m × 2m recess at the center
  const recessW = w * 0.18
  const recessDepth = 1.6

  // Material colors
  const marbleColor = '#dcd6c8'
  const stoneColor = '#3a3a3a'
  const plinthColor = '#2a2a2a'
  const woodTrimColor = '#5d3f1e'
  const woodPanelColor = '#7a5a32'

  // Track meshes for time-of-day ramps
  const refs = useRef<{ glass: Mesh[]; entryLight: PointLight | null }>({
    glass: [],
    entryLight: null,
  })
  refs.current.glass = []

  useFrame((_, delta) => {
    const dt = MathUtils.clamp(delta * 4, 0, 1)
    const targetGlass =
      timeOfDay === 'evening'
        ? 1.5
        : timeOfDay === 'dusk'
          ? 1.0
          : timeOfDay === 'goldenHour'
            ? 0.35
            : 0.08
    for (const m of refs.current.glass) {
      const mat = m.material as any
      if (typeof mat.emissiveIntensity === 'number') {
        mat.emissiveIntensity = MathUtils.lerp(mat.emissiveIntensity, targetGlass, dt)
      }
    }
    if (refs.current.entryLight) {
      const targetLight =
        timeOfDay === 'evening'
          ? 1.6
          : timeOfDay === 'dusk'
            ? 1.0
            : timeOfDay === 'goldenHour'
              ? 0.3
              : 0.05
      refs.current.entryLight.intensity = MathUtils.lerp(
        refs.current.entryLight.intensity,
        targetLight,
        dt,
      )
    }
  })

  // ── HELPER COMPONENTS ──────────────────────────────────────────────────

  /** Marble wall section with a horizontal wood trim band at given y */
  const marbleSection = (
    key: string,
    args: [number, number, number],
    position: [number, number, number],
    woodBandY?: number,
  ) => (
    <group key={key}>
      <mesh castShadow position={position} receiveShadow>
        <boxGeometry args={args} />
        <meshStandardMaterial color={marbleColor} metalness={0.06} roughness={0.45} />
      </mesh>
      {woodBandY !== undefined ? (
        <mesh
          position={[
            position[0],
            woodBandY,
            position[2] + (args[2] > args[0] ? 0 : 0.04 * Math.sign(position[2] || 1)),
          ]}
        >
          <boxGeometry args={[args[0] + 0.06, 0.18, args[2] + 0.06]} />
          <meshStandardMaterial color={woodTrimColor} metalness={0.05} roughness={0.7} />
        </mesh>
      ) : null}
    </group>
  )

  /** Cantilevered roof slab with overhang on all sides */
  const roof = (
    key: string,
    rw: number,
    rd: number,
    yPos: number,
    cx = 0,
    cz = 0,
  ) => (
    <mesh
      castShadow
      key={key}
      position={[cx, yPos + roofThickness / 2, cz]}
      receiveShadow
    >
      <boxGeometry args={[rw + roofOverhang * 2, roofThickness, rd + roofOverhang * 2]} />
      <meshStandardMaterial color={stoneColor} metalness={0.15} roughness={0.55} />
    </mesh>
  )

  /** Cylindrical column */
  const column = (key: string, x: number, y: number, z: number, height: number) => (
    <mesh castShadow key={key} position={[x, y + height / 2, z]} receiveShadow>
      <cylinderGeometry args={[0.18, 0.22, height, 16]} />
      <meshStandardMaterial color={marbleColor} metalness={0.08} roughness={0.4} />
    </mesh>
  )

  // ── BUILD THE MANSION ──────────────────────────────────────────────────
  return (
    <group {...handlers}>
      {/* ┌─────────────────────────────────────────────────────────────────┐ */}
      {/* │  FOUNDATION PLINTH — dark stone wraps the entire base          │ */}
      {/* └─────────────────────────────────────────────────────────────────┘ */}
      <mesh castShadow position={[0, plinthH / 2, 0]} receiveShadow>
        <boxGeometry args={[w + plinthOversize, plinthH, d + plinthOversize]} />
        <meshStandardMaterial color={plinthColor} metalness={0.1} roughness={0.7} />
      </mesh>
      {/* East wing plinth */}
      <mesh
        castShadow
        position={[eastOffsetX, plinthH / 2, (eastWingD - d) / 2]}
        receiveShadow
      >
        <boxGeometry args={[eastWingW + plinthOversize, plinthH, eastWingD + plinthOversize]} />
        <meshStandardMaterial color={plinthColor} metalness={0.1} roughness={0.7} />
      </mesh>
      {/* West wing plinth */}
      <mesh
        castShadow
        position={[-westOffsetX, plinthH / 2, (westWingD - d) / 2]}
        receiveShadow
      >
        <boxGeometry args={[westWingW + plinthOversize, plinthH, westWingD + plinthOversize]} />
        <meshStandardMaterial color={plinthColor} metalness={0.1} roughness={0.7} />
      </mesh>

      {/* ┌─────────────────────────────────────────────────────────────────┐ */}
      {/* │  MAIN MASS — ground floor (y = plinthH..plinthH+h)             │ */}
      {/* └─────────────────────────────────────────────────────────────────┘ */}
      {/* North wall (back) */}
      <mesh
        castShadow
        position={[0, plinthH + h / 2, -halfD + wallThickness / 2]}
        receiveShadow
      >
        <boxGeometry args={[w, h, wallThickness]} />
        <meshStandardMaterial color={marbleColor} metalness={0.06} roughness={0.45} />
      </mesh>
      {/* East wall (interior side, where it meets the wing) */}
      <mesh
        castShadow
        position={[halfW - wallThickness / 2, plinthH + h / 2, 0]}
        receiveShadow
      >
        <boxGeometry args={[wallThickness, h, d]} />
        <meshStandardMaterial color={marbleColor} metalness={0.06} roughness={0.45} />
      </mesh>
      {/* West wall */}
      <mesh
        castShadow
        position={[-halfW + wallThickness / 2, plinthH + h / 2, 0]}
        receiveShadow
      >
        <boxGeometry args={[wallThickness, h, d]} />
        <meshStandardMaterial color={marbleColor} metalness={0.06} roughness={0.45} />
      </mesh>
      {/* North wall horizontal wood trim band */}
      <mesh position={[0, plinthH + h * 0.55, -halfD + wallThickness / 2 + 0.04]}>
        <boxGeometry args={[w, 0.16, 0.06]} />
        <meshStandardMaterial color={woodTrimColor} metalness={0.05} roughness={0.7} />
      </mesh>

      {/* ── SOUTH WALL with recessed entry ──────────────────────────────── */}
      {/* The south wall has 5 vertical sections: 2 outer marble corners,
          2 glass panels with mullions, and a recessed entry alcove in the middle */}
      {/* Left marble corner pier */}
      <mesh
        castShadow
        position={[-halfW + 1.2, plinthH + h / 2, halfD - wallThickness / 2]}
        receiveShadow
      >
        <boxGeometry args={[2.4, h, wallThickness]} />
        <meshStandardMaterial color={marbleColor} metalness={0.06} roughness={0.45} />
      </mesh>
      {/* Wood-clad accent strip on the left corner pier (south side) */}
      <mesh position={[-halfW + 0.4, plinthH + h / 2, halfD - wallThickness / 2 + 0.08]}>
        <boxGeometry args={[0.6, h - 0.4, 0.08]} />
        <meshStandardMaterial color={woodPanelColor} metalness={0.05} roughness={0.7} />
      </mesh>
      {/* Right marble corner pier */}
      <mesh
        castShadow
        position={[halfW - 1.2, plinthH + h / 2, halfD - wallThickness / 2]}
        receiveShadow
      >
        <boxGeometry args={[2.4, h, wallThickness]} />
        <meshStandardMaterial color={marbleColor} metalness={0.06} roughness={0.45} />
      </mesh>
      {/* Wood-clad strip on right corner */}
      <mesh position={[halfW - 0.4, plinthH + h / 2, halfD - wallThickness / 2 + 0.08]}>
        <boxGeometry args={[0.6, h - 0.4, 0.08]} />
        <meshStandardMaterial color={woodPanelColor} metalness={0.05} roughness={0.7} />
      </mesh>

      {/* Center entry recess — 3 walls forming an alcove set back into the south facade */}
      {/* Recess back wall (faces south) */}
      <mesh
        castShadow
        position={[0, plinthH + h / 2, halfD - recessDepth - wallThickness / 2]}
        receiveShadow
      >
        <boxGeometry args={[recessW, h, wallThickness]} />
        <meshStandardMaterial color={marbleColor} metalness={0.06} roughness={0.45} />
      </mesh>
      {/* Recess left side wall */}
      <mesh
        castShadow
        position={[-recessW / 2 + wallThickness / 2, plinthH + h / 2, halfD - recessDepth / 2]}
        receiveShadow
      >
        <boxGeometry args={[wallThickness, h, recessDepth]} />
        <meshStandardMaterial color={marbleColor} metalness={0.06} roughness={0.45} />
      </mesh>
      {/* Recess right side wall */}
      <mesh
        castShadow
        position={[recessW / 2 - wallThickness / 2, plinthH + h / 2, halfD - recessDepth / 2]}
        receiveShadow
      >
        <boxGeometry args={[wallThickness, h, recessDepth]} />
        <meshStandardMaterial color={marbleColor} metalness={0.06} roughness={0.45} />
      </mesh>
      {/* Recess overhead beam (above the entry, structural) */}
      <mesh
        position={[0, plinthH + h - 0.2, halfD - recessDepth / 2]}
      >
        <boxGeometry args={[recessW + 0.2, 0.4, recessDepth + 0.2]} />
        <meshStandardMaterial color={woodTrimColor} metalness={0.05} roughness={0.6} />
      </mesh>
      {/* Door — large dark glass front door inside the recess */}
      <mesh position={[0, plinthH + (h - 0.4) / 2 + 0.2, halfD - recessDepth - wallThickness / 2 + 0.04]}>
        <boxGeometry args={[recessW * 0.7, h - 0.6, 0.06]} />
        <meshStandardMaterial
          color="#1a2a3a"
          emissive="#3a5a8a"
          emissiveIntensity={0.04}
          metalness={0.7}
          roughness={0.1}
          transparent
          opacity={0.85}
        />
      </mesh>

      {/* Glass panels flanking the recess */}
      {/* Glass panel left (between left corner pier and recess) */}
      <GlassPanel
        height={h - 0.4}
        intensityRef={refs}
        mullionCount={3}
        position={[
          -halfW / 2 - 0.6,
          plinthH + h / 2,
          halfD - wallThickness / 2,
        ]}
        width={(halfW - 2.4) - recessW / 2 - 0.4}
      />
      {/* Glass panel right */}
      <GlassPanel
        height={h - 0.4}
        intensityRef={refs}
        mullionCount={3}
        position={[
          halfW / 2 + 0.6,
          plinthH + h / 2,
          halfD - wallThickness / 2,
        ]}
        width={(halfW - 2.4) - recessW / 2 - 0.4}
      />

      {/* ── MAIN ROOF — cantilevered overhang ──────────────────────────── */}
      {roof('main-roof', w, d, plinthH + h)}

      {/* Wood facia (warm trim) under the south overhang — characteristic
          of modern luxury homes */}
      <mesh
        position={[0, plinthH + h + roofThickness / 2, halfD + roofOverhang - 0.05]}
      >
        <boxGeometry args={[w + roofOverhang * 1.6, roofThickness, 0.1]} />
        <meshStandardMaterial color={woodPanelColor} metalness={0.06} roughness={0.65} />
      </mesh>

      {/* ┌─────────────────────────────────────────────────────────────────┐ */}
      {/* │  SECOND-STORY SETBACK with cantilevered balcony                │ */}
      {/* └─────────────────────────────────────────────────────────────────┘ */}
      {/* North wall */}
      <mesh
        castShadow
        position={[0, setbackY0 + setbackH / 2, -setbackHalfD + wallThickness / 2]}
        receiveShadow
      >
        <boxGeometry args={[setbackW, setbackH, wallThickness]} />
        <meshStandardMaterial color={marbleColor} metalness={0.06} roughness={0.45} />
      </mesh>
      {/* East wall */}
      <mesh
        castShadow
        position={[setbackHalfW - wallThickness / 2, setbackY0 + setbackH / 2, 0]}
        receiveShadow
      >
        <boxGeometry args={[wallThickness, setbackH, setbackD]} />
        <meshStandardMaterial color={marbleColor} metalness={0.06} roughness={0.45} />
      </mesh>
      {/* West wall */}
      <mesh
        castShadow
        position={[-setbackHalfW + wallThickness / 2, setbackY0 + setbackH / 2, 0]}
        receiveShadow
      >
        <boxGeometry args={[wallThickness, setbackH, setbackD]} />
        <meshStandardMaterial color={marbleColor} metalness={0.06} roughness={0.45} />
      </mesh>
      {/* South face — small marble corners + 1 large mullion-divided glass */}
      <mesh
        castShadow
        position={[-setbackHalfW + 0.6, setbackY0 + setbackH / 2, setbackHalfD - wallThickness / 2]}
      >
        <boxGeometry args={[1.2, setbackH, wallThickness]} />
        <meshStandardMaterial color={marbleColor} metalness={0.06} roughness={0.45} />
      </mesh>
      <mesh
        castShadow
        position={[setbackHalfW - 0.6, setbackY0 + setbackH / 2, setbackHalfD - wallThickness / 2]}
      >
        <boxGeometry args={[1.2, setbackH, wallThickness]} />
        <meshStandardMaterial color={marbleColor} metalness={0.06} roughness={0.45} />
      </mesh>
      <GlassPanel
        height={setbackH - 0.3}
        intensityRef={refs}
        mullionCount={4}
        position={[0, setbackY0 + setbackH / 2, setbackHalfD - wallThickness / 2]}
        width={setbackW - 2.6}
      />

      {/* Cantilevered balcony slab — projects 1.5m past the south face,
          full setback width. This is the visual signature of modern
          luxury — a floating tier. */}
      <mesh
        castShadow
        position={[0, setbackY0 - 0.05, setbackHalfD + 0.75]}
        receiveShadow
      >
        <boxGeometry args={[setbackW + 0.4, 0.15, 1.6]} />
        <meshStandardMaterial color={stoneColor} metalness={0.12} roughness={0.55} />
      </mesh>
      {/* Setback balcony — rich architectural rail (top cap + posts +
          glass infill + bottom trim). Front + both sides. */}
      {(() => {
        const setBalY = setbackY0
        const setBalRailH = 1.05
        const railTopH = 0.06
        const railBottomH = 0.05
        const postW = 0.05
        const baseProps = { color: '#a98654', metalness: 0.6, roughness: 0.32 }

        // Front rail (along the balcony's south edge)
        const frontZ = setbackHalfD + 1.5
        const frontW = setbackW + 0.3
        const frontPostCount = Math.max(4, Math.round(frontW / 0.85))

        // Side rails
        const sBackZ = setbackHalfD + 0.02
        const sFrontZ = frontZ - 0.04
        const sideLen = Math.abs(sFrontZ - sBackZ)
        const sCenterZ = (sBackZ + sFrontZ) / 2
        const sidePostCount = Math.max(2, Math.round(sideLen / 0.85))

        return (
          <group>
            {/* FRONT RAIL */}
            <mesh position={[0, setBalY + setBalRailH + railTopH / 2 + 0.05, frontZ]}>
              <boxGeometry args={[frontW, railTopH, 0.08]} />
              <meshStandardMaterial {...baseProps} />
            </mesh>
            <mesh position={[0, setBalY + railBottomH / 2 + 0.07, frontZ]}>
              <boxGeometry args={[frontW, railBottomH, 0.08]} />
              <meshStandardMaterial {...baseProps} />
            </mesh>
            <mesh position={[0, setBalY + setBalRailH / 2 + 0.1, frontZ]}>
              <boxGeometry args={[frontW - postW * 2, setBalRailH - 0.16, 0.03]} />
              <meshStandardMaterial
                color="#cce4ff"
                transparent
                opacity={0.28}
                depthWrite={false}
                metalness={0.35}
                roughness={0.08}
              />
            </mesh>
            {Array.from({ length: frontPostCount }, (_, i) => {
              const t = i / (frontPostCount - 1)
              const px = -frontW / 2 + t * frontW
              return (
                <mesh
                  key={`set-bal-fp-${i}`}
                  position={[px, setBalY + setBalRailH / 2 + 0.1, frontZ]}
                >
                  <boxGeometry args={[postW, setBalRailH, 0.08]} />
                  <meshStandardMaterial {...baseProps} />
                </mesh>
              )
            })}

            {/* SIDE RAILS */}
            {[-1, 1].map((s) => {
              const sx = (setbackW / 2 + 0.15) * s
              return (
                <group key={`set-bal-side-${s}`}>
                  <mesh position={[sx, setBalY + setBalRailH + railTopH / 2 + 0.05, sCenterZ]}>
                    <boxGeometry args={[0.08, railTopH, sideLen]} />
                    <meshStandardMaterial {...baseProps} />
                  </mesh>
                  <mesh position={[sx, setBalY + railBottomH / 2 + 0.07, sCenterZ]}>
                    <boxGeometry args={[0.08, railBottomH, sideLen]} />
                    <meshStandardMaterial {...baseProps} />
                  </mesh>
                  <mesh position={[sx, setBalY + setBalRailH / 2 + 0.1, sCenterZ]}>
                    <boxGeometry args={[0.03, setBalRailH - 0.16, sideLen - postW * 2]} />
                    <meshStandardMaterial
                      color="#cce4ff"
                      transparent
                      opacity={0.28}
                      depthWrite={false}
                      metalness={0.35}
                      roughness={0.08}
                    />
                  </mesh>
                  {Array.from({ length: sidePostCount }, (_, i) => {
                    const t = i / (sidePostCount - 1)
                    const pz = sBackZ + t * (sFrontZ - sBackZ)
                    return (
                      <mesh
                        key={`set-bal-sp-${s}-${i}`}
                        position={[sx, setBalY + setBalRailH / 2 + 0.1, pz]}
                      >
                        <boxGeometry args={[0.08, setBalRailH, postW]} />
                        <meshStandardMaterial {...baseProps} />
                      </mesh>
                    )
                  })}
                </group>
              )
            })}
            {/* Bronze trim band under the cantilevered slab */}
            <mesh position={[0, setbackY0 - 0.13, setbackHalfD + 0.75]}>
              <boxGeometry args={[setbackW + 0.44, 0.06, 1.66]} />
              <meshStandardMaterial color="#a98654" metalness={0.6} roughness={0.32} />
            </mesh>
          </group>
        )
      })()}

      {/* Setback roof with overhang */}
      {roof('setback-roof', setbackW, setbackD, setbackY0 + setbackH)}

      {/* ┌─────────────────────────────────────────────────────────────────┐ */}
      {/* │  ROOF DECK PERGOLA — small structure on top of the setback roof │ */}
      {/* └─────────────────────────────────────────────────────────────────┘ */}
      {(() => {
        const pergolaY = setbackY0 + setbackH + roofThickness
        const pergolaW = setbackW * 0.5
        const pergolaD = setbackD * 0.6
        const pergolaH = 2.4
        const cornerSize = 0.12
        return (
          <group>
            {/* Four corner posts */}
            {[
              [-pergolaW / 2 + cornerSize / 2, -pergolaD / 2 + cornerSize / 2],
              [pergolaW / 2 - cornerSize / 2, -pergolaD / 2 + cornerSize / 2],
              [-pergolaW / 2 + cornerSize / 2, pergolaD / 2 - cornerSize / 2],
              [pergolaW / 2 - cornerSize / 2, pergolaD / 2 - cornerSize / 2],
            ].map(([px, pz], i) => (
              <mesh
                castShadow
                key={`pp-${i}`}
                position={[px!, pergolaY + pergolaH / 2, pz!]}
              >
                <boxGeometry args={[cornerSize, pergolaH, cornerSize]} />
                <meshStandardMaterial color={woodTrimColor} metalness={0.05} roughness={0.65} />
              </mesh>
            ))}
            {/* Top frame and 5 slats */}
            {[-pergolaD / 2, pergolaD / 2].map((z, i) => (
              <mesh key={`pf-${i}`} position={[0, pergolaY + pergolaH - 0.05, z]}>
                <boxGeometry args={[pergolaW, 0.1, 0.1]} />
                <meshStandardMaterial color={woodTrimColor} metalness={0.05} roughness={0.65} />
              </mesh>
            ))}
            {Array.from({ length: 5 }, (_, i) => {
              const t = (i + 0.5) / 5
              const z = -pergolaD / 2 + t * pergolaD
              return (
                <mesh key={`ps-${i}`} position={[0, pergolaY + pergolaH - 0.15, z]}>
                  <boxGeometry args={[pergolaW - 0.1, 0.1, 0.05]} />
                  <meshStandardMaterial color={woodPanelColor} metalness={0.05} roughness={0.65} />
                </mesh>
              )
            })}
          </group>
        )
      })()}

      {/* ┌─────────────────────────────────────────────────────────────────┐ */}
      {/* │  EAST WING — bigger than west, asymmetric                       │ */}
      {/* └─────────────────────────────────────────────────────────────────┘ */}
      {/* East wing east wall */}
      <mesh
        castShadow
        position={[
          eastOffsetX + eastWingW / 2 - wallThickness / 2,
          plinthH + eastWingH / 2,
          (eastWingD - d) / 2,
        ]}
        receiveShadow
      >
        <boxGeometry args={[wallThickness, eastWingH, eastWingD]} />
        <meshStandardMaterial color={marbleColor} metalness={0.06} roughness={0.45} />
      </mesh>
      {/* East wing north wall */}
      <mesh
        castShadow
        position={[
          eastOffsetX,
          plinthH + eastWingH / 2,
          (eastWingD - d) / 2 - eastWingD / 2 + wallThickness / 2,
        ]}
        receiveShadow
      >
        <boxGeometry args={[eastWingW, eastWingH, wallThickness]} />
        <meshStandardMaterial color={marbleColor} metalness={0.06} roughness={0.45} />
      </mesh>
      {/* East wing south wall — 1 marble corner + 1 large glass */}
      <mesh
        castShadow
        position={[
          eastOffsetX + eastWingW / 2 - 0.6,
          plinthH + eastWingH / 2,
          (eastWingD - d) / 2 + eastWingD / 2 - wallThickness / 2,
        ]}
      >
        <boxGeometry args={[1.2, eastWingH, wallThickness]} />
        <meshStandardMaterial color={marbleColor} metalness={0.06} roughness={0.45} />
      </mesh>
      <GlassPanel
        height={eastWingH - 0.3}
        intensityRef={refs}
        mullionCount={3}
        position={[
          eastOffsetX - 0.6,
          plinthH + eastWingH / 2,
          (eastWingD - d) / 2 + eastWingD / 2 - wallThickness / 2,
        ]}
        width={eastWingW - 1.2 - 0.1}
      />
      {/* Wood-clad accent on east wing east wall */}
      <mesh
        position={[
          eastOffsetX + eastWingW / 2 - wallThickness / 2 + 0.04,
          plinthH + eastWingH / 2,
          (eastWingD - d) / 2,
        ]}
      >
        <boxGeometry args={[0.05, eastWingH - 0.4, eastWingD - 1]} />
        <meshStandardMaterial color={woodPanelColor} metalness={0.05} roughness={0.7} />
      </mesh>
      {/* East wing roof */}
      {roof(
        'east-roof',
        eastWingW,
        eastWingD,
        plinthH + eastWingH,
        eastOffsetX,
        (eastWingD - d) / 2,
      )}

      {/* ┌─────────────────────────────────────────────────────────────────┐ */}
      {/* │  WEST WING — smaller, asymmetric                                │ */}
      {/* └─────────────────────────────────────────────────────────────────┘ */}
      <mesh
        castShadow
        position={[
          -westOffsetX - westWingW / 2 + wallThickness / 2,
          plinthH + westWingH / 2,
          (westWingD - d) / 2,
        ]}
        receiveShadow
      >
        <boxGeometry args={[wallThickness, westWingH, westWingD]} />
        <meshStandardMaterial color={marbleColor} metalness={0.06} roughness={0.45} />
      </mesh>
      <mesh
        castShadow
        position={[
          -westOffsetX,
          plinthH + westWingH / 2,
          (westWingD - d) / 2 - westWingD / 2 + wallThickness / 2,
        ]}
        receiveShadow
      >
        <boxGeometry args={[westWingW, westWingH, wallThickness]} />
        <meshStandardMaterial color={marbleColor} metalness={0.06} roughness={0.45} />
      </mesh>
      <mesh
        castShadow
        position={[
          -westOffsetX - westWingW / 2 + 0.6,
          plinthH + westWingH / 2,
          (westWingD - d) / 2 + westWingD / 2 - wallThickness / 2,
        ]}
      >
        <boxGeometry args={[1.2, westWingH, wallThickness]} />
        <meshStandardMaterial color={marbleColor} metalness={0.06} roughness={0.45} />
      </mesh>
      <GlassPanel
        height={westWingH - 0.3}
        intensityRef={refs}
        mullionCount={3}
        position={[
          -westOffsetX + 0.6,
          plinthH + westWingH / 2,
          (westWingD - d) / 2 + westWingD / 2 - wallThickness / 2,
        ]}
        width={westWingW - 1.2 - 0.1}
      />
      {roof(
        'west-roof',
        westWingW,
        westWingD,
        plinthH + westWingH,
        -westOffsetX,
        (westWingD - d) / 2,
      )}

      {/* ┌─────────────────────────────────────────────────────────────────┐ */}
      {/* │  FRONT ENTRY — 4 cylindrical columns + portico roof             │ */}
      {/* └─────────────────────────────────────────────────────────────────┘ */}
      {/* Four cylindrical marble columns at the front edge of the entry,
          1.2m forward of the south face */}
      {[-3.5, -1.2, 1.2, 3.5].map((x) =>
        column(`col-${x}`, x, plinthH, halfD + 1.2, h - 0.4),
      )}
      {/* Portico roof — wood-tone slab spanning between the columns and
          the south facade, with overhang */}
      <mesh
        castShadow
        position={[0, plinthH + h - 0.15, halfD + 0.6]}
        receiveShadow
      >
        <boxGeometry args={[8, 0.3, 1.6]} />
        <meshStandardMaterial color={woodTrimColor} metalness={0.05} roughness={0.6} />
      </mesh>
      {/* Three pendant lights under the portico — emissive spheres
          ramping with time of day */}
      {[-2.5, 0, 2.5].map((x, i) => (
        <mesh
          key={`pendant-${i}`}
          position={[x, plinthH + h - 0.5, halfD + 0.6]}
          ref={(m) => {
            if (m) refs.current.glass.push(m)
          }}
        >
          <sphereGeometry args={[0.12, 12, 8]} />
          <meshStandardMaterial
            color="#fff5d6"
            emissive="#ffd285"
            emissiveIntensity={0.08}
            metalness={0}
            roughness={0.4}
          />
        </mesh>
      ))}

      {/* ┌─────────────────────────────────────────────────────────────────┐ */}
      {/* │  ARCHITECTURAL ACCENT LIGHT                                     │ */}
      {/* └─────────────────────────────────────────────────────────────────┘ */}
      <pointLight
        color="#ffd9a0"
        decay={2}
        distance={Math.max(w, d) * 0.35}
        intensity={0}
        position={[0, plinthH + h - 0.3, halfD + 1]}
        ref={(l) => {
          if (l) refs.current.entryLight = l
        }}
      />

      {/* ┌─────────────────────────────────────────────────────────────────┐ */}
      {/* │  INTERIOR PRESENCE — silhouette furniture + room glow cards     │ */}
      {/* │                                                                 │ */}
      {/* │  Behind each glass panel we place a "room card" (dim emissive  │ */}
      {/* │  back wall) plus simplified silhouette furniture. At evening  │ */}
      {/* │  the cards ramp up via the existing glass refs so the mansion  │ */}
      {/* │  reads as occupied. None of these meshes cast shadows or use   │ */}
      {/* │  point lights — they're emissive primitives only.              │ */}
      {/* └─────────────────────────────────────────────────────────────────┘ */}
      {(() => {
        // Helper — emissive back-wall plane that "represents" a lit interior.
        // Pushes itself onto the glass refs so it picks up time-of-day
        // emissive ramping along with the actual glass panes.
        const RoomCard = ({
          position,
          width,
          height,
          warm = '#ffd285',
          baseColor = '#7a5a3a',
        }: {
          position: [number, number, number]
          width: number
          height: number
          warm?: string
          baseColor?: string
        }) => (
          <mesh
            position={position}
            ref={(m) => {
              if (m) refs.current.glass.push(m)
            }}
          >
            <boxGeometry args={[width, height, 0.06]} />
            <meshStandardMaterial
              color={baseColor}
              emissive={warm}
              emissiveIntensity={0.04}
              metalness={0}
              roughness={0.7}
            />
          </mesh>
        )

        // Helper — simple silhouette material (dark, picks up some warm glow)
        const sil = {
          color: '#1a1a1a',
          metalness: 0.15,
          roughness: 0.6,
        }
        const woodSil = {
          color: '#3a2818',
          metalness: 0.1,
          roughness: 0.7,
        }

        // Helper — pendant light (small emissive sphere, ramps with glass)
        const Pendant = ({
          position,
          radius = 0.08,
        }: {
          position: [number, number, number]
          radius?: number
        }) => (
          <group position={position}>
            {/* Cord (dark cylinder up to ceiling) */}
            <mesh position={[0, 0.4, 0]}>
              <cylinderGeometry args={[0.012, 0.012, 0.8, 6]} />
              <meshStandardMaterial color="#1a1a1a" metalness={0.3} roughness={0.6} />
            </mesh>
            {/* Bulb */}
            <mesh
              ref={(m) => {
                if (m) refs.current.glass.push(m)
              }}
            >
              <sphereGeometry args={[radius, 12, 8]} />
              <meshStandardMaterial
                color="#fff5d6"
                emissive="#ffd285"
                emissiveIntensity={0.06}
                metalness={0}
                roughness={0.4}
              />
            </mesh>
          </group>
        )

        // ── MAIN MASS GROUND-FLOOR INTERIORS ─────────────────────────────
        // South glass spans z = halfD - wallThickness/2 to inside.
        // Interior z anchor (1.4m back from glass = readable through pane):
        const intZ = halfD - wallThickness - 1.6
        const floorY = plinthH + 0.05
        const ceilY = plinthH + h - 0.2

        // LEFT room — Lounge: long couch + coffee table + two pendants + back-wall art
        const loungeX = -halfW / 2 - 0.6 // matches glass panel center
        const loungeRoomW = (halfW - 2.4) - recessW / 2 - 0.4
        // RIGHT room — Kitchen: island + range hood + 3 pendants
        const kitchenX = halfW / 2 + 0.6
        const kitchenRoomW = loungeRoomW

        // EAST WING — Dining room (chandelier + table + chairs)
        const eastIntX = eastOffsetX
        const eastIntZ = (eastWingD - d) / 2 + eastWingD / 2 - wallThickness - 1.6
        const eastFloorY = plinthH + 0.05
        const eastCeilY = plinthH + eastWingH - 0.2

        // WEST WING — Library / Study (desk + bookshelf silhouettes)
        const westIntX = -westOffsetX
        const westIntZ = (westWingD - d) / 2 + westWingD / 2 - wallThickness - 1.6
        const westFloorY = plinthH + 0.05
        const westCeilY = plinthH + westWingH - 0.2

        // SETBACK (2nd story) — Master suite
        const setIntZ = setbackHalfD - wallThickness - 1.4
        const setFloorY = setbackY0 + 0.05
        const setCeilY = setbackY0 + setbackH - 0.2

        return (
          <group name="mansion-interiors">
            {/* ─── ROOM-DIVIDER WALLS — partial walls between lounge,
                kitchen, recess and the wings. Reads as "rooms separated"
                through the glass without building real interiors. ─── */}
            {/* Lounge ↔ Recess wall */}
            <mesh
              position={[
                -recessW / 2 - 0.6,
                plinthH + h / 2,
                intZ - 0.2,
              ]}
            >
              <boxGeometry args={[0.18, h - 0.4, 1.4]} />
              <meshStandardMaterial color="#1a1a1a" metalness={0.15} roughness={0.7} />
            </mesh>
            {/* Kitchen ↔ Recess wall */}
            <mesh
              position={[
                recessW / 2 + 0.6,
                plinthH + h / 2,
                intZ - 0.2,
              ]}
            >
              <boxGeometry args={[0.18, h - 0.4, 1.4]} />
              <meshStandardMaterial color="#1a1a1a" metalness={0.15} roughness={0.7} />
            </mesh>

            {/* ─── REAR-ROOM DEEP GLOW LAYER — emissive plane set behind
                the room cards, ~3.5m deep into the mansion volume. Gives
                the illusion of "another room beyond" through narrow gaps,
                doorway slivers, and around the silhouette furniture. ─── */}
            {(() => {
              const deepZ = halfD - wallThickness - 4.0
              return (
                <>
                  {/* Lounge deep glow (warm, suggests adjacent dining/hall) */}
                  <mesh
                    position={[loungeX - 0.4, plinthH + h / 2, deepZ]}
                    ref={(m) => {
                      if (m) refs.current.glass.push(m)
                    }}
                  >
                    <boxGeometry args={[loungeRoomW * 0.7, h - 0.6, 0.04]} />
                    <meshStandardMaterial
                      color="#3a2010"
                      emissive="#ffa05a"
                      emissiveIntensity={0.05}
                      metalness={0}
                      roughness={0.85}
                    />
                  </mesh>
                  {/* Kitchen deep glow (slightly cooler, suggests pantry) */}
                  <mesh
                    position={[kitchenX + 0.3, plinthH + h / 2, deepZ]}
                    ref={(m) => {
                      if (m) refs.current.glass.push(m)
                    }}
                  >
                    <boxGeometry args={[kitchenRoomW * 0.7, h - 0.6, 0.04]} />
                    <meshStandardMaterial
                      color="#2a1a14"
                      emissive="#ffa566"
                      emissiveIntensity={0.04}
                      metalness={0}
                      roughness={0.85}
                    />
                  </mesh>
                </>
              )
            })()}

            {/* ─── DOORWAY SILHOUETTES — narrow tall openings cut into
                each room-card with a brighter rear-glow showing through.
                Reads as "visible doorway leading deeper into the home." */}
            {(() => {
              const doorH = h * 0.7
              const doorW = 0.85
              const doorZ = halfD - wallThickness - 0.4
              return (
                <>
                  {/* Lounge doorway (right side of room) */}
                  <group position={[loungeX + loungeRoomW * 0.32, plinthH + doorH / 2, doorZ - 1.2]}>
                    {/* Door frame — dark vertical strips on either side */}
                    {[-1, 1].map((s) => (
                      <mesh key={`lounge-doorframe-${s}`} position={[(doorW / 2 + 0.04) * s, 0, 0]}>
                        <boxGeometry args={[0.08, doorH, 0.18]} />
                        <meshStandardMaterial color="#1a1a1a" metalness={0.2} roughness={0.6} />
                      </mesh>
                    ))}
                    {/* Top of frame */}
                    <mesh position={[0, doorH / 2 + 0.04, 0]}>
                      <boxGeometry args={[doorW + 0.16, 0.08, 0.18]} />
                      <meshStandardMaterial color="#1a1a1a" metalness={0.2} roughness={0.6} />
                    </mesh>
                    {/* Glow plane in the doorway opening — brighter than
                        the room glow to suggest "lit room beyond" */}
                    <mesh
                      ref={(m) => {
                        if (m) refs.current.glass.push(m)
                      }}
                    >
                      <boxGeometry args={[doorW, doorH, 0.04]} />
                      <meshStandardMaterial
                        color="#5a3a1a"
                        emissive="#ffd285"
                        emissiveIntensity={0.08}
                        metalness={0}
                        roughness={0.7}
                      />
                    </mesh>
                  </group>

                  {/* Kitchen doorway (left side of room) */}
                  <group position={[kitchenX - kitchenRoomW * 0.32, plinthH + doorH / 2, doorZ - 1.2]}>
                    {[-1, 1].map((s) => (
                      <mesh key={`kitchen-doorframe-${s}`} position={[(doorW / 2 + 0.04) * s, 0, 0]}>
                        <boxGeometry args={[0.08, doorH, 0.18]} />
                        <meshStandardMaterial color="#1a1a1a" metalness={0.2} roughness={0.6} />
                      </mesh>
                    ))}
                    <mesh position={[0, doorH / 2 + 0.04, 0]}>
                      <boxGeometry args={[doorW + 0.16, 0.08, 0.18]} />
                      <meshStandardMaterial color="#1a1a1a" metalness={0.2} roughness={0.6} />
                    </mesh>
                    <mesh
                      ref={(m) => {
                        if (m) refs.current.glass.push(m)
                      }}
                    >
                      <boxGeometry args={[doorW, doorH, 0.04]} />
                      <meshStandardMaterial
                        color="#5a3a1a"
                        emissive="#ffd285"
                        emissiveIntensity={0.08}
                        metalness={0}
                        roughness={0.7}
                      />
                    </mesh>
                  </group>
                </>
              )
            })()}

            {/* ─── LOUNGE (left south room) ─────────────────────────── */}
            {/* Back-wall room glow */}
            <RoomCard
              height={h - 0.6}
              position={[loungeX, plinthH + h / 2, intZ - 0.5]}
              width={loungeRoomW - 0.4}
            />
            {/* Couch — long low silhouette facing the glass */}
            <mesh position={[loungeX, floorY + 0.5, intZ + 0.4]}>
              <boxGeometry args={[Math.min(4.5, loungeRoomW - 1), 0.85, 1.0]} />
              <meshStandardMaterial {...sil} />
            </mesh>
            {/* Couch arm bolsters */}
            {[-1, 1].map((s) => (
              <mesh
                key={`lounge-arm-${s}`}
                position={[
                  loungeX + (Math.min(4.5, loungeRoomW - 1) / 2) * s,
                  floorY + 0.6,
                  intZ + 0.4,
                ]}
              >
                <boxGeometry args={[0.25, 1.0, 1.0]} />
                <meshStandardMaterial {...sil} />
              </mesh>
            ))}
            {/* Coffee table — low rectangle in front of the couch */}
            <mesh position={[loungeX, floorY + 0.25, intZ + 1.4]}>
              <boxGeometry args={[2.0, 0.45, 0.7]} />
              <meshStandardMaterial {...woodSil} />
            </mesh>
            {/* Lounge pendant cluster (3 pendants over the coffee table) */}
            <Pendant position={[loungeX - 0.7, ceilY - 0.55, intZ + 1.4]} radius={0.09} />
            <Pendant position={[loungeX, ceilY - 0.5, intZ + 1.4]} radius={0.1} />
            <Pendant position={[loungeX + 0.7, ceilY - 0.55, intZ + 1.4]} radius={0.09} />
            {/* Floor lamp at one end */}
            <group position={[loungeX - loungeRoomW / 2 + 0.5, floorY, intZ + 0.6]}>
              <mesh position={[0, 0.85, 0]}>
                <cylinderGeometry args={[0.025, 0.025, 1.7, 8]} />
                <meshStandardMaterial color="#1a1a1a" metalness={0.4} roughness={0.5} />
              </mesh>
              <mesh
                position={[0, 1.85, 0]}
                ref={(m) => {
                  if (m) refs.current.glass.push(m)
                }}
              >
                <coneGeometry args={[0.22, 0.4, 12, 1, true]} />
                <meshStandardMaterial
                  color="#fff5d6"
                  emissive="#ffd285"
                  emissiveIntensity={0.05}
                  side={2}
                  metalness={0}
                  roughness={0.5}
                />
              </mesh>
            </group>

            {/* ─── KITCHEN (right south room) ────────────────────────── */}
            <RoomCard
              baseColor="#5a4030"
              height={h - 0.6}
              position={[kitchenX, plinthH + h / 2, intZ - 0.5]}
              width={kitchenRoomW - 0.4}
            />
            {/* Kitchen island — long counter parallel to the glass */}
            <mesh position={[kitchenX, floorY + 0.5, intZ + 0.5]}>
              <boxGeometry args={[Math.min(4.5, kitchenRoomW - 1), 1.0, 0.9]} />
              <meshStandardMaterial color="#1a1a1a" metalness={0.4} roughness={0.4} />
            </mesh>
            {/* Marble island top */}
            <mesh position={[kitchenX, floorY + 1.05, intZ + 0.5]}>
              <boxGeometry args={[Math.min(4.7, kitchenRoomW - 0.8), 0.08, 1.0]} />
              <meshStandardMaterial color="#dcd6c8" metalness={0.1} roughness={0.4} />
            </mesh>
            {/* Three bar stools on the island's south side */}
            {[-1, 0, 1].map((s) => (
              <mesh
                key={`stool-${s}`}
                position={[kitchenX + s * 1.0, floorY + 0.55, intZ + 1.15]}
              >
                <cylinderGeometry args={[0.18, 0.16, 1.0, 12]} />
                <meshStandardMaterial color="#3a2818" metalness={0.2} roughness={0.6} />
              </mesh>
            ))}
            {/* Range hood box up on the back wall */}
            <mesh position={[kitchenX, ceilY - 1.4, intZ - 0.2]}>
              <boxGeometry args={[1.2, 0.8, 0.5]} />
              <meshStandardMaterial color="#1a1a1a" metalness={0.5} roughness={0.4} />
            </mesh>
            {/* Three pendants over the island */}
            <Pendant position={[kitchenX - 1.0, ceilY - 0.65, intZ + 0.5]} radius={0.09} />
            <Pendant position={[kitchenX, ceilY - 0.6, intZ + 0.5]} radius={0.1} />
            <Pendant position={[kitchenX + 1.0, ceilY - 0.65, intZ + 0.5]} radius={0.09} />

            {/* ─── EAST WING — Dining room ────────────────────────────── */}
            <RoomCard
              baseColor="#5a4030"
              height={eastWingH - 0.6}
              position={[eastIntX, plinthH + eastWingH / 2, eastIntZ - 0.6]}
              width={eastWingW - 0.4}
            />
            {/* Long dining table */}
            <mesh position={[eastIntX, eastFloorY + 0.4, eastIntZ + 0.2]}>
              <boxGeometry args={[Math.min(3.6, eastWingW - 1.2), 0.05, 1.2]} />
              <meshStandardMaterial color="#dcd6c8" metalness={0.06} roughness={0.4} />
            </mesh>
            {/* Table base / pedestal */}
            <mesh position={[eastIntX, eastFloorY + 0.2, eastIntZ + 0.2]}>
              <boxGeometry args={[Math.min(3.4, eastWingW - 1.4), 0.4, 0.4]} />
              <meshStandardMaterial {...woodSil} />
            </mesh>
            {/* 8 dining chairs (4 each side) */}
            {[-1.5, -0.5, 0.5, 1.5].map((sx) => (
              <group key={`d-chair-pair-${sx}`}>
                <mesh position={[eastIntX + sx, eastFloorY + 0.45, eastIntZ + 0.95]}>
                  <boxGeometry args={[0.6, 0.95, 0.35]} />
                  <meshStandardMaterial {...sil} />
                </mesh>
                <mesh position={[eastIntX + sx, eastFloorY + 0.45, eastIntZ - 0.55]}>
                  <boxGeometry args={[0.6, 0.95, 0.35]} />
                  <meshStandardMaterial {...sil} />
                </mesh>
              </group>
            ))}
            {/* Chandelier — emissive cluster over the dining table */}
            <group position={[eastIntX, eastCeilY - 0.65, eastIntZ + 0.2]}>
              <mesh position={[0, 0.45, 0]}>
                <cylinderGeometry args={[0.018, 0.018, 0.9, 6]} />
                <meshStandardMaterial color="#1a1a1a" metalness={0.4} roughness={0.5} />
              </mesh>
              <mesh
                ref={(m) => {
                  if (m) refs.current.glass.push(m)
                }}
              >
                <sphereGeometry args={[0.32, 14, 10]} />
                <meshStandardMaterial
                  color="#fff5d6"
                  emissive="#ffd285"
                  emissiveIntensity={0.07}
                  metalness={0.15}
                  roughness={0.4}
                />
              </mesh>
              {/* Three small accent bulbs around it */}
              {[0, 2.094, 4.188].map((a, i) => (
                <mesh
                  key={`chand-acc-${i}`}
                  position={[Math.cos(a) * 0.5, -0.1, Math.sin(a) * 0.5]}
                  ref={(m) => {
                    if (m) refs.current.glass.push(m)
                  }}
                >
                  <sphereGeometry args={[0.07, 8, 6]} />
                  <meshStandardMaterial
                    color="#fff5d6"
                    emissive="#ffd285"
                    emissiveIntensity={0.05}
                    metalness={0}
                    roughness={0.5}
                  />
                </mesh>
              ))}
            </group>

            {/* ─── WEST WING — Library / Study ──────────────────────── */}
            <RoomCard
              baseColor="#3a2818"
              height={westWingH - 0.6}
              position={[westIntX, plinthH + westWingH / 2, westIntZ - 0.7]}
              width={westWingW - 0.4}
            />
            {/* Bookshelf along the back wall — tall vertical strips */}
            {[-2, -1, 0, 1, 2].map((s) => {
              const sx = westIntX + s * 0.6
              if (Math.abs(sx - westIntX) > westWingW / 2 - 0.5) return null
              return (
                <mesh
                  key={`bookshelf-${s}`}
                  position={[sx, westFloorY + (westCeilY - westFloorY) / 2, westIntZ - 0.5]}
                >
                  <boxGeometry args={[0.55, westCeilY - westFloorY - 0.3, 0.35]} />
                  <meshStandardMaterial color="#3a2818" metalness={0.15} roughness={0.7} />
                </mesh>
              )
            })}
            {/* Book "spines" — narrow emissive hint at warm reading light from the room */}
            <mesh
              position={[westIntX, westFloorY + (westCeilY - westFloorY) / 2, westIntZ - 0.32]}
              ref={(m) => {
                if (m) refs.current.glass.push(m)
              }}
            >
              <boxGeometry args={[westWingW - 1.2, westCeilY - westFloorY - 0.5, 0.04]} />
              <meshStandardMaterial
                color="#5a3018"
                emissive="#ffa05a"
                emissiveIntensity={0.04}
                metalness={0}
                roughness={0.7}
              />
            </mesh>
            {/* Reading chair silhouette */}
            <mesh position={[westIntX - 0.6, westFloorY + 0.55, westIntZ + 0.6]}>
              <boxGeometry args={[1.0, 1.1, 0.95]} />
              <meshStandardMaterial {...sil} />
            </mesh>
            {/* Side table + lamp */}
            <mesh position={[westIntX + 0.7, westFloorY + 0.4, westIntZ + 0.6]}>
              <cylinderGeometry args={[0.3, 0.3, 0.8, 12]} />
              <meshStandardMaterial {...woodSil} />
            </mesh>
            <group position={[westIntX + 0.7, westFloorY + 0.85, westIntZ + 0.6]}>
              <mesh position={[0, 0.35, 0]}>
                <cylinderGeometry args={[0.015, 0.015, 0.7, 6]} />
                <meshStandardMaterial color="#1a1a1a" metalness={0.3} roughness={0.5} />
              </mesh>
              <mesh
                position={[0, 0.85, 0]}
                ref={(m) => {
                  if (m) refs.current.glass.push(m)
                }}
              >
                <coneGeometry args={[0.18, 0.32, 10, 1, true]} />
                <meshStandardMaterial
                  color="#fff5d6"
                  emissive="#ffd285"
                  emissiveIntensity={0.06}
                  side={2}
                  metalness={0}
                  roughness={0.5}
                />
              </mesh>
            </group>

            {/* ─── SETBACK (2nd story) — Master Suite ─────────────────── */}
            <RoomCard
              baseColor="#5a4030"
              height={setbackH - 0.5}
              position={[0, setbackY0 + setbackH / 2, setIntZ - 0.4]}
              width={setbackW - 0.6}
            />
            {/* King bed silhouette */}
            <mesh position={[0, setFloorY + 0.45, setIntZ - 0.2]}>
              <boxGeometry args={[2.4, 0.85, 1.9]} />
              <meshStandardMaterial color="#dcd6c8" metalness={0.05} roughness={0.5} />
            </mesh>
            {/* Headboard */}
            <mesh position={[0, setFloorY + 1.0, setIntZ - 1.05]}>
              <boxGeometry args={[2.6, 1.4, 0.18]} />
              <meshStandardMaterial color="#3a2818" metalness={0.15} roughness={0.6} />
            </mesh>
            {/* Two bedside lamps */}
            {[-1, 1].map((s) => (
              <group key={`bedside-${s}`} position={[s * 1.55, setFloorY + 0.55, setIntZ - 0.6]}>
                <mesh>
                  <boxGeometry args={[0.5, 0.45, 0.45]} />
                  <meshStandardMaterial {...woodSil} />
                </mesh>
                <mesh
                  position={[0, 0.45, 0]}
                  ref={(m) => {
                    if (m) refs.current.glass.push(m)
                  }}
                >
                  <coneGeometry args={[0.16, 0.28, 10, 1, true]} />
                  <meshStandardMaterial
                    color="#fff5d6"
                    emissive="#ffd285"
                    emissiveIntensity={0.06}
                    side={2}
                    metalness={0}
                    roughness={0.5}
                  />
                </mesh>
              </group>
            ))}
            {/* Ceiling pendant over the bed */}
            <Pendant position={[0, setCeilY - 0.4, setIntZ - 0.2]} radius={0.1} />
          </group>
        )
      })()}

      {/* ┌─────────────────────────────────────────────────────────────────┐ */}
      {/* │  ROOFLINE PARAPETS — rim walls around each roof level give the  │ */}
      {/* │  building a sharper modern silhouette and break up flat slabs   │ */}
      {/* └─────────────────────────────────────────────────────────────────┘ */}
      {(() => {
        const parapetMatProps = {
          color: marbleColor,
          metalness: 0.06,
          roughness: 0.5,
        }
        const mainRoofY = plinthH + h + roofThickness
        const setbackRoofY = setbackY0 + setbackH + roofThickness
        const eastRoofY = plinthH + eastWingH + roofThickness
        const westRoofY = plinthH + westWingH + roofThickness
        const mainRoofW = w + roofOverhang * 2
        const mainRoofD = d + roofOverhang * 2
        const setbackRoofW = setbackW + roofOverhang * 2
        const setbackRoofD = setbackD + roofOverhang * 2
        const eastRoofW = eastWingW + roofOverhang * 2
        const eastRoofD = eastWingD + roofOverhang * 2
        const westRoofW = westWingW + roofOverhang * 2
        const westRoofD = westWingD + roofOverhang * 2
        const parapetT = 0.18
        return (
          <group>
            {/* Main roof — 4-sided parapet */}
            {[-1, 1].map((s) => (
              <mesh
                castShadow
                key={`main-par-x-${s}`}
                position={[
                  ((mainRoofW - parapetT) / 2) * s,
                  mainRoofY + parapetH / 2,
                  0,
                ]}
              >
                <boxGeometry args={[parapetT, parapetH, mainRoofD]} />
                <meshStandardMaterial {...parapetMatProps} />
              </mesh>
            ))}
            {[-1, 1].map((s) => (
              <mesh
                castShadow
                key={`main-par-z-${s}`}
                position={[
                  0,
                  mainRoofY + parapetH / 2,
                  ((mainRoofD - parapetT) / 2) * s,
                ]}
              >
                <boxGeometry args={[mainRoofW, parapetH, parapetT]} />
                <meshStandardMaterial {...parapetMatProps} />
              </mesh>
            ))}

            {/* Setback (2nd floor) roof parapet */}
            {[-1, 1].map((s) => (
              <mesh
                castShadow
                key={`set-par-x-${s}`}
                position={[
                  ((setbackRoofW - parapetT) / 2) * s,
                  setbackRoofY + parapetH / 2,
                  0,
                ]}
              >
                <boxGeometry args={[parapetT, parapetH, setbackRoofD]} />
                <meshStandardMaterial {...parapetMatProps} />
              </mesh>
            ))}
            {[-1, 1].map((s) => (
              <mesh
                castShadow
                key={`set-par-z-${s}`}
                position={[
                  0,
                  setbackRoofY + parapetH / 2,
                  ((setbackRoofD - parapetT) / 2) * s,
                ]}
              >
                <boxGeometry args={[setbackRoofW, parapetH, parapetT]} />
                <meshStandardMaterial {...parapetMatProps} />
              </mesh>
            ))}

            {/* East wing parapet */}
            {[-1, 1].map((s) => (
              <mesh
                castShadow
                key={`east-par-x-${s}`}
                position={[
                  eastOffsetX + ((eastRoofW - parapetT) / 2) * s,
                  eastRoofY + parapetH / 2,
                  (eastWingD - d) / 2,
                ]}
              >
                <boxGeometry args={[parapetT, parapetH, eastRoofD]} />
                <meshStandardMaterial {...parapetMatProps} />
              </mesh>
            ))}
            {[-1, 1].map((s) => (
              <mesh
                castShadow
                key={`east-par-z-${s}`}
                position={[
                  eastOffsetX,
                  eastRoofY + parapetH / 2,
                  (eastWingD - d) / 2 + ((eastRoofD - parapetT) / 2) * s,
                ]}
              >
                <boxGeometry args={[eastRoofW, parapetH, parapetT]} />
                <meshStandardMaterial {...parapetMatProps} />
              </mesh>
            ))}

            {/* West wing parapet */}
            {[-1, 1].map((s) => (
              <mesh
                castShadow
                key={`west-par-x-${s}`}
                position={[
                  -westOffsetX + ((westRoofW - parapetT) / 2) * s,
                  westRoofY + parapetH / 2,
                  (westWingD - d) / 2,
                ]}
              >
                <boxGeometry args={[parapetT, parapetH, westRoofD]} />
                <meshStandardMaterial {...parapetMatProps} />
              </mesh>
            ))}
            {[-1, 1].map((s) => (
              <mesh
                castShadow
                key={`west-par-z-${s}`}
                position={[
                  -westOffsetX,
                  westRoofY + parapetH / 2,
                  (westWingD - d) / 2 + ((westRoofD - parapetT) / 2) * s,
                ]}
              >
                <boxGeometry args={[westRoofW, parapetH, parapetT]} />
                <meshStandardMaterial {...parapetMatProps} />
              </mesh>
            ))}
          </group>
        )
      })()}

      {/* ┌─────────────────────────────────────────────────────────────────┐ */}
      {/* │  VERTICAL FACADE FINS — tall slim wood-clad ribbons climb the    │ */}
      {/* │  south facade at four positions, breaking up the glass rhythm.  │ */}
      {/* │  Signature element of luxury contemporary architecture.         │ */}
      {/* └─────────────────────────────────────────────────────────────────┘ */}
      {(() => {
        // Place 2 fins per glass panel, distributed left and right of center
        const finXs = [-halfW * 0.55, -halfW * 0.36, halfW * 0.36, halfW * 0.55]
        const finH = h + setbackH * 0.85
        const finY = plinthH + finH / 2
        return finXs.map((fx, i) => (
          <group key={`fin-${i}`}>
            <mesh
              castShadow
              position={[fx, finY, halfD + 0.18]}
            >
              <boxGeometry args={[0.16, finH, 0.32]} />
              <meshStandardMaterial color={woodPanelColor} metalness={0.05} roughness={0.65} />
            </mesh>
            {/* Brass cap at top */}
            <mesh position={[fx, plinthH + finH + 0.04, halfD + 0.18]}>
              <boxGeometry args={[0.2, 0.08, 0.36]} />
              <meshStandardMaterial color="#a98654" metalness={0.6} roughness={0.35} />
            </mesh>
          </group>
        ))
      })()}

      {/* ┌─────────────────────────────────────────────────────────────────┐ */}
      {/* │  FACADE UPLIGHT STRIPS — emissive ribbons at the base of every  │ */}
      {/* │  exterior wall. Reads as recessed cove lighting — characteristic │ */}
      {/* │  of luxury hotel architecture. Ramps with time of day.          │ */}
      {/* └─────────────────────────────────────────────────────────────────┘ */}
      {(() => {
        const uplightY = plinthH + 0.18
        const uplightStrip = (
          key: string,
          length: number,
          pos: [number, number, number],
          axis: 'x' | 'z',
        ) => (
          <mesh
            key={key}
            position={pos}
            ref={(m) => {
              if (m) refs.current.glass.push(m)
            }}
          >
            <boxGeometry
              args={axis === 'x' ? [length, 0.08, 0.06] : [0.06, 0.08, length]}
            />
            <meshStandardMaterial
              color="#fff5d6"
              emissive="#ffd285"
              emissiveIntensity={0.06}
              metalness={0}
              roughness={0.5}
            />
          </mesh>
        )
        return (
          <group>
            {/* Main mass — south face uplight (split around the recess) */}
            {uplightStrip(
              'up-main-s-l',
              halfW - recessW / 2 - 0.5,
              [-halfW + (halfW - recessW / 2 - 0.5) / 2, uplightY, halfD + 0.04],
              'x',
            )}
            {uplightStrip(
              'up-main-s-r',
              halfW - recessW / 2 - 0.5,
              [halfW - (halfW - recessW / 2 - 0.5) / 2, uplightY, halfD + 0.04],
              'x',
            )}
            {/* Main mass — north face */}
            {uplightStrip('up-main-n', w * 0.95, [0, uplightY, -halfD - 0.04], 'x')}
            {/* East wing — south + east */}
            {uplightStrip(
              'up-east-s',
              eastWingW - 0.4,
              [eastOffsetX, uplightY, (eastWingD - d) / 2 + eastWingD / 2 + 0.04],
              'x',
            )}
            {uplightStrip(
              'up-east-e',
              eastWingD - 0.4,
              [
                eastOffsetX + eastWingW / 2 + 0.04,
                uplightY,
                (eastWingD - d) / 2,
              ],
              'z',
            )}
            {/* West wing — south + west */}
            {uplightStrip(
              'up-west-s',
              westWingW - 0.4,
              [-westOffsetX, uplightY, (westWingD - d) / 2 + westWingD / 2 + 0.04],
              'x',
            )}
            {uplightStrip(
              'up-west-w',
              westWingD - 0.4,
              [
                -westOffsetX - westWingW / 2 - 0.04,
                uplightY,
                (westWingD - d) / 2,
              ],
              'z',
            )}
          </group>
        )
      })()}

      {/* ┌─────────────────────────────────────────────────────────────────┐ */}
      {/* │  WING BALCONIES — cantilevered juliette balconies with a       │ */}
      {/* │  proper architectural rail (top cap + vertical posts + glass   │ */}
      {/* │  infill + bottom trim) on each wing's south face at half-      │ */}
      {/* │  height. Reads as more occupied tiers.                          │ */}
      {/* └─────────────────────────────────────────────────────────────────┘ */}
      {(() => {
        const balY = plinthH + Math.min(eastWingH, westWingH) * 0.55
        const balDepth = 1.2
        const balRailH = 1.05
        const railTopH = 0.06
        const railBottomH = 0.05
        const postW = 0.05
        // Render a luxury rail: bronze top cap + tall glass infill +
        // vertical posts every ~1m + bronze bottom trim
        const buildRail = (
          key: string,
          rx: number,
          rw: number,
          startZ: number,
          endZ: number,
          axis: 'x' | 'z',
        ) => {
          const len = Math.abs(endZ - startZ)
          const cz = (startZ + endZ) / 2
          // Number of vertical posts along the rail (>=2 — endpoints)
          const postCount = Math.max(2, Math.round(len / 0.85))
          const baseProps = { color: '#a98654', metalness: 0.6, roughness: 0.32 }
          return (
            <group key={key}>
              {/* Top cap (bronze) */}
              <mesh
                position={
                  axis === 'x'
                    ? [rx, balY + balRailH + railTopH / 2, cz]
                    : [rx, balY + balRailH + railTopH / 2, cz]
                }
              >
                <boxGeometry
                  args={
                    axis === 'x' ? [rw, railTopH, 0.07] : [0.07, railTopH, len]
                  }
                />
                <meshStandardMaterial {...baseProps} />
              </mesh>
              {/* Bottom trim (bronze) */}
              <mesh
                position={
                  axis === 'x'
                    ? [rx, balY + railBottomH / 2 + 0.04, cz]
                    : [rx, balY + railBottomH / 2 + 0.04, cz]
                }
              >
                <boxGeometry
                  args={
                    axis === 'x' ? [rw, railBottomH, 0.07] : [0.07, railBottomH, len]
                  }
                />
                <meshStandardMaterial {...baseProps} />
              </mesh>
              {/* Glass infill panel */}
              <mesh
                position={
                  axis === 'x'
                    ? [rx, balY + balRailH / 2 + 0.07, cz]
                    : [rx, balY + balRailH / 2 + 0.07, cz]
                }
              >
                <boxGeometry
                  args={
                    axis === 'x'
                      ? [rw - postW * 2, balRailH - 0.16, 0.03]
                      : [0.03, balRailH - 0.16, len - postW * 2]
                  }
                />
                <meshStandardMaterial
                  color="#cce4ff"
                  transparent
                  opacity={0.28}
                  depthWrite={false}
                  metalness={0.35}
                  roughness={0.08}
                />
              </mesh>
              {/* Vertical posts */}
              {Array.from({ length: postCount }, (_, i) => {
                const t = i / (postCount - 1)
                if (axis === 'x') {
                  const px = rx - rw / 2 + t * rw
                  return (
                    <mesh
                      key={`${key}-p-${i}`}
                      position={[px, balY + balRailH / 2 + 0.07, cz]}
                    >
                      <boxGeometry args={[postW, balRailH, 0.07]} />
                      <meshStandardMaterial {...baseProps} />
                    </mesh>
                  )
                }
                const pz = startZ + t * (endZ - startZ)
                return (
                  <mesh
                    key={`${key}-p-${i}`}
                    position={[rx, balY + balRailH / 2 + 0.07, pz]}
                  >
                    <boxGeometry args={[0.07, balRailH, postW]} />
                    <meshStandardMaterial {...baseProps} />
                  </mesh>
                )
              })}
            </group>
          )
        }

        const eastFrontZ = (eastWingD - d) / 2 + eastWingD / 2 + balDepth - 0.02
        const eastBackZ = (eastWingD - d) / 2 + eastWingD / 2 + 0.02
        const westFrontZ = (westWingD - d) / 2 + westWingD / 2 + balDepth - 0.02
        const westBackZ = (westWingD - d) / 2 + westWingD / 2 + 0.02

        return (
          <group>
            {/* East wing balcony slab */}
            <mesh
              castShadow
              position={[
                eastOffsetX,
                balY,
                (eastWingD - d) / 2 + eastWingD / 2 + balDepth / 2,
              ]}
              receiveShadow
            >
              <boxGeometry args={[eastWingW * 0.85, 0.18, balDepth]} />
              <meshStandardMaterial color={stoneColor} metalness={0.12} roughness={0.55} />
            </mesh>
            {/* East balcony — bronze trim band underneath the slab */}
            <mesh
              position={[
                eastOffsetX,
                balY - 0.13,
                (eastWingD - d) / 2 + eastWingD / 2 + balDepth / 2,
              ]}
            >
              <boxGeometry args={[eastWingW * 0.85 + 0.04, 0.06, balDepth + 0.04]} />
              <meshStandardMaterial color="#a98654" metalness={0.6} roughness={0.32} />
            </mesh>
            {/* East balcony — left side rail */}
            {buildRail(
              'bal-east-left',
              eastOffsetX - (eastWingW * 0.85) / 2,
              0,
              eastBackZ,
              eastFrontZ,
              'z',
            )}
            {/* East balcony — right side rail */}
            {buildRail(
              'bal-east-right',
              eastOffsetX + (eastWingW * 0.85) / 2,
              0,
              eastBackZ,
              eastFrontZ,
              'z',
            )}

            {/* West wing balcony slab */}
            <mesh
              castShadow
              position={[
                -westOffsetX,
                balY,
                (westWingD - d) / 2 + westWingD / 2 + balDepth / 2,
              ]}
              receiveShadow
            >
              <boxGeometry args={[westWingW * 0.9, 0.18, balDepth]} />
              <meshStandardMaterial color={stoneColor} metalness={0.12} roughness={0.55} />
            </mesh>
            {/* West balcony — bronze trim band */}
            <mesh
              position={[
                -westOffsetX,
                balY - 0.13,
                (westWingD - d) / 2 + westWingD / 2 + balDepth / 2,
              ]}
            >
              <boxGeometry args={[westWingW * 0.9 + 0.04, 0.06, balDepth + 0.04]} />
              <meshStandardMaterial color="#a98654" metalness={0.6} roughness={0.32} />
            </mesh>
            {buildRail(
              'bal-west-left',
              -westOffsetX - (westWingW * 0.9) / 2,
              0,
              westBackZ,
              westFrontZ,
              'z',
            )}
            {buildRail(
              'bal-west-right',
              -westOffsetX + (westWingW * 0.9) / 2,
              0,
              westBackZ,
              westFrontZ,
              'z',
            )}
          </group>
        )
      })()}

      {/* ┌─────────────────────────────────────────────────────────────────┐ */}
      {/* │  WING BALCONY FRONT RAILS — separate group so each gets a       │ */}
      {/* │  proper world z-position (the buildRail helper above renders    │ */}
      {/* │  axis='x' rails at their group's local cz=0 — we render the     │ */}
      {/* │  front rails here directly in world space).                     │ */}
      {/* └─────────────────────────────────────────────────────────────────┘ */}
      {(() => {
        const balY = plinthH + Math.min(eastWingH, westWingH) * 0.55
        const balDepth = 1.2
        const balRailH = 1.05
        const railTopH = 0.06
        const railBottomH = 0.05
        const postW = 0.05
        const baseProps = { color: '#a98654', metalness: 0.6, roughness: 0.32 }
        const buildFront = (
          key: string,
          rx: number,
          rw: number,
          rz: number,
        ) => {
          const postCount = Math.max(3, Math.round(rw / 0.85))
          return (
            <group key={key}>
              {/* Top cap */}
              <mesh position={[rx, balY + balRailH + railTopH / 2, rz]}>
                <boxGeometry args={[rw, railTopH, 0.08]} />
                <meshStandardMaterial {...baseProps} />
              </mesh>
              {/* Bottom trim */}
              <mesh position={[rx, balY + railBottomH / 2 + 0.04, rz]}>
                <boxGeometry args={[rw, railBottomH, 0.08]} />
                <meshStandardMaterial {...baseProps} />
              </mesh>
              {/* Glass infill */}
              <mesh position={[rx, balY + balRailH / 2 + 0.07, rz]}>
                <boxGeometry args={[rw - postW * 2, balRailH - 0.16, 0.03]} />
                <meshStandardMaterial
                  color="#cce4ff"
                  transparent
                  opacity={0.28}
                  depthWrite={false}
                  metalness={0.35}
                  roughness={0.08}
                />
              </mesh>
              {/* Vertical posts */}
              {Array.from({ length: postCount }, (_, i) => {
                const t = i / (postCount - 1)
                const px = rx - rw / 2 + t * rw
                return (
                  <mesh
                    key={`${key}-p-${i}`}
                    position={[px, balY + balRailH / 2 + 0.07, rz]}
                  >
                    <boxGeometry args={[postW, balRailH, 0.08]} />
                    <meshStandardMaterial {...baseProps} />
                  </mesh>
                )
              })}
            </group>
          )
        }
        return (
          <group>
            {buildFront(
              'bal-east-front-real',
              eastOffsetX,
              eastWingW * 0.85,
              (eastWingD - d) / 2 + eastWingD / 2 + balDepth - 0.02,
            )}
            {buildFront(
              'bal-west-front-real',
              -westOffsetX,
              westWingW * 0.9,
              (westWingD - d) / 2 + westWingD / 2 + balDepth - 0.02,
            )}
          </group>
        )
      })()}

      {/* ┌─────────────────────────────────────────────────────────────────┐ */}
      {/* │  THIRD-TIER GLASS TURRET — small lookout cube atop the setback  │ */}
      {/* │  roof. Adds vertical drama, suggests a master-suite/sky-room.   │ */}
      {/* └─────────────────────────────────────────────────────────────────┘ */}
      {(() => {
        const turretY = setbackY0 + setbackH + roofThickness + parapetH + 0.05
        const turretW = setbackW * 0.32
        const turretH = 2.4
        const turretD = setbackD * 0.45
        return (
          <group>
            {/* Glass cube — emits gentle warm glow at evening */}
            <mesh
              castShadow
              position={[-setbackW * 0.15, turretY + turretH / 2, 0]}
              ref={(m) => {
                if (m) refs.current.glass.push(m)
              }}
            >
              <boxGeometry args={[turretW, turretH, turretD]} />
              <meshStandardMaterial
                color="#1a2a3a"
                emissive="#5a7aaa"
                emissiveIntensity={0.05}
                metalness={0.7}
                roughness={0.1}
                transparent
                opacity={0.75}
              />
            </mesh>
            {/* Turret cap roof */}
            <mesh
              castShadow
              position={[-setbackW * 0.15, turretY + turretH + 0.1, 0]}
            >
              <boxGeometry args={[turretW + 0.6, 0.2, turretD + 0.6]} />
              <meshStandardMaterial color={stoneColor} metalness={0.15} roughness={0.55} />
            </mesh>
            {/* Wood frame at base of turret */}
            <mesh position={[-setbackW * 0.15, turretY + 0.06, 0]}>
              <boxGeometry args={[turretW + 0.2, 0.12, turretD + 0.2]} />
              <meshStandardMaterial color={woodTrimColor} metalness={0.05} roughness={0.7} />
            </mesh>
          </group>
        )
      })()}

      {/* ┌─────────────────────────────────────────────────────────────────┐ */}
      {/* │  PORTE-COCHÈRE — extend the entry portico further forward       │ */}
      {/* │  with a thin support rail + brass ring above the columns.      │ */}
      {/* │  Gives the arrival a "luxury hotel" feel.                       │ */}
      {/* └─────────────────────────────────────────────────────────────────┘ */}
      {(() => {
        const cocY = plinthH + h - 0.4
        return (
          <group>
            {/* Brass-tone trim ring under the portico */}
            <mesh position={[0, cocY, halfD + 0.6]}>
              <boxGeometry args={[8.4, 0.08, 1.7]} />
              <meshStandardMaterial color="#a98654" metalness={0.65} roughness={0.32} />
            </mesh>
            {/* Recessed cove uplight underneath the portico — emissive strip */}
            <mesh
              position={[0, cocY - 0.06, halfD + 0.6]}
              ref={(m) => {
                if (m) refs.current.glass.push(m)
              }}
            >
              <boxGeometry args={[7.6, 0.04, 1.4]} />
              <meshStandardMaterial
                color="#fff5d6"
                emissive="#ffd285"
                emissiveIntensity={0.08}
                metalness={0}
                roughness={0.6}
              />
            </mesh>
            {/* Address numerals strip — small dark plaque above the entry */}
            <mesh position={[0, plinthH + h - 0.7, halfD - recessDepth - wallThickness / 2 + 0.06]}>
              <boxGeometry args={[1.6, 0.12, 0.04]} />
              <meshStandardMaterial color="#1a1a1a" metalness={0.45} roughness={0.5} />
            </mesh>
          </group>
        )
      })()}

      {/* ┌─────────────────────────────────────────────────────────────────┐ */}
      {/* │  ROOF DECK FURNITURE accents — small lounge prop on top of east │ */}
      {/* │  wing roof reads as occupied. Wood deck trim on the wing roofs. │ */}
      {/* └─────────────────────────────────────────────────────────────────┘ */}
      {(() => {
        const eastDeckY = plinthH + eastWingH + roofThickness + parapetH * 0.5
        const westDeckY = plinthH + westWingH + roofThickness + parapetH * 0.5
        return (
          <group>
            {/* East wing roof — wood-deck trim band suggesting a roof terrace */}
            <mesh position={[eastOffsetX, eastDeckY + 0.04, (eastWingD - d) / 2]}>
              <boxGeometry args={[eastWingW * 0.85, 0.08, eastWingD * 0.55]} />
              <meshStandardMaterial color={woodTrimColor} metalness={0.05} roughness={0.7} />
            </mesh>
            {/* West wing roof — wood-deck trim */}
            <mesh position={[-westOffsetX, westDeckY + 0.04, (westWingD - d) / 2]}>
              <boxGeometry args={[westWingW * 0.85, 0.08, westWingD * 0.55]} />
              <meshStandardMaterial color={woodTrimColor} metalness={0.05} roughness={0.7} />
            </mesh>
          </group>
        )
      })()}
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

// ─── Champagne Bucket — silver bucket on a stand with bottle peeking out ──
//
// Hospitality flagship — reads as "this is a luxury property" at a
// glance. The bucket is a tapered cylinder with a thin rim, ice
// suggested by light bumps, and a champagne-bottle silhouette rising
// out of the top with a foil neck and gold cage hint.
function ChampagneBucket({ node }: { node: ItemNode }) {
  const handlers = useNodeEvents(node, 'item')
  const [, h] = node.asset.dimensions
  const stemH = h * 0.18
  const bucketBottomR = h * 0.18
  const bucketTopR = h * 0.24
  const bucketH = h * 0.42
  const bottleH = h * 0.6
  const bottleR = h * 0.08
  return (
    <group {...handlers}>
      {/* Stand base */}
      <mesh castShadow position={[0, 0.005, 0]} receiveShadow>
        <cylinderGeometry args={[bucketTopR * 0.55, bucketTopR * 0.7, 0.01, 14]} />
        <meshStandardMaterial color="#a07a4a" metalness={0.85} roughness={0.2} />
      </mesh>
      {/* Stand pole */}
      <mesh position={[0, stemH / 2 + 0.005, 0]}>
        <cylinderGeometry args={[0.012, 0.012, stemH, 8]} />
        <meshStandardMaterial color="#a07a4a" metalness={0.85} roughness={0.2} />
      </mesh>
      {/* Bucket — tapered silver cylinder */}
      <mesh
        castShadow
        position={[0, stemH + bucketH / 2 + 0.005, 0]}
        receiveShadow
      >
        <cylinderGeometry
          args={[bucketTopR, bucketBottomR, bucketH, 16]}
        />
        <meshStandardMaterial
          color="#dfdfdf"
          metalness={0.85}
          roughness={0.18}
        />
      </mesh>
      {/* Bucket rim — slightly thicker band at the top */}
      <mesh position={[0, stemH + bucketH + 0.005, 0]}>
        <cylinderGeometry args={[bucketTopR + 0.008, bucketTopR + 0.008, 0.018, 16]} />
        <meshStandardMaterial color="#c9c9c9" metalness={0.85} roughness={0.15} />
      </mesh>
      {/* Bucket handles — two D-rings on opposite sides */}
      {[-1, 1].map((s) => (
        <mesh
          key={`handle-${s}`}
          position={[bucketTopR * s + 0.01 * s, stemH + bucketH * 0.85, 0]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <torusGeometry args={[0.025, 0.005, 6, 12, Math.PI]} />
          <meshStandardMaterial color="#c9c9c9" metalness={0.85} roughness={0.18} />
        </mesh>
      ))}
      {/* Ice suggestion — a few small white spheres at the top of the bucket */}
      {[
        [bucketTopR * 0.5, 0],
        [-bucketTopR * 0.4, bucketTopR * 0.3],
        [bucketTopR * 0.1, -bucketTopR * 0.4],
        [-bucketTopR * 0.1, -bucketTopR * 0.1],
      ].map(([ix, iz], i) => (
        <mesh
          key={`ice-${i}`}
          position={[ix!, stemH + bucketH - 0.01, iz!]}
        >
          <sphereGeometry args={[0.03 + i * 0.003, 6, 5]} />
          <meshStandardMaterial color="#f0f8fc" metalness={0.2} roughness={0.5} />
        </mesh>
      ))}
      {/* Champagne bottle rising from the bucket */}
      <group position={[0, stemH + bucketH + 0.02, 0]}>
        {/* Bottle body */}
        <mesh castShadow>
          <cylinderGeometry args={[bottleR, bottleR * 1.1, bottleH * 0.55, 14]} />
          <meshStandardMaterial
            color="#1a3a3a"
            metalness={0.4}
            roughness={0.18}
            transparent
            opacity={0.94}
          />
        </mesh>
        {/* Bottle shoulder */}
        <mesh position={[0, bottleH * 0.35, 0]}>
          <cylinderGeometry args={[bottleR * 0.55, bottleR, bottleH * 0.16, 14]} />
          <meshStandardMaterial
            color="#1a3a3a"
            metalness={0.4}
            roughness={0.18}
            transparent
            opacity={0.94}
          />
        </mesh>
        {/* Bottle neck */}
        <mesh castShadow position={[0, bottleH * 0.6, 0]}>
          <cylinderGeometry args={[bottleR * 0.55, bottleR * 0.55, bottleH * 0.32, 12]} />
          <meshStandardMaterial color="#1a3a3a" metalness={0.4} roughness={0.18} />
        </mesh>
        {/* Gold foil cap */}
        <mesh position={[0, bottleH * 0.79, 0]}>
          <cylinderGeometry args={[bottleR * 0.62, bottleR * 0.62, bottleH * 0.14, 12]} />
          <meshStandardMaterial color="#c9a850" metalness={0.75} roughness={0.25} />
        </mesh>
        {/* Wire cage hint — small ring at the top */}
        <mesh position={[0, bottleH * 0.84, 0]}>
          <torusGeometry args={[bottleR * 0.6, 0.005, 4, 12]} />
          <meshStandardMaterial color="#a8946a" metalness={0.85} roughness={0.25} />
        </mesh>
      </group>
    </group>
  )
}

// ─── Throw Blanket — folded throw draped over a chair-arm position ────────
//
// Casual luxury moment — a soft folded throw that reads as "draped over
// the back of a sofa or chair." Two layered planes with a slight curl
// at the front edge.
function ThrowBlanket({ node }: { node: ItemNode }) {
  const handlers = useNodeEvents(node, 'item')
  const [w, h, d] = node.asset.dimensions
  return (
    <group {...handlers}>
      {/* Main body — wide flat slab with a slight tilt */}
      <mesh
        castShadow
        position={[0, h * 0.5, 0]}
        rotation={[Math.PI * 0.04, 0, 0]}
        receiveShadow
      >
        <boxGeometry args={[w, h * 0.3, d]} />
        <meshStandardMaterial color="#9a8a72" metalness={0.05} roughness={0.85} />
      </mesh>
      {/* Front fold flap — slightly drooping */}
      <mesh
        castShadow
        position={[0, h * 0.32, d * 0.45]}
        rotation={[-Math.PI * 0.18, 0, 0]}
      >
        <boxGeometry args={[w, h * 0.36, d * 0.5]} />
        <meshStandardMaterial color="#8a7a66" metalness={0.05} roughness={0.88} />
      </mesh>
      {/* Edge fringe band — narrow contrast strip */}
      <mesh position={[0, h * 0.65, 0]}>
        <boxGeometry args={[w + 0.005, 0.01, d + 0.005]} />
        <meshStandardMaterial color="#7a6a52" metalness={0.05} roughness={0.92} />
      </mesh>
    </group>
  )
}

// ─── Candle Cluster — three pillar candles of varied heights ──────────────
//
// Tiny dining/bar centerpiece. Three candles on a small round tray with
// emissive flame tips that ramp at evening.
function CandleCluster({ node }: { node: ItemNode }) {
  const handlers = useNodeEvents(node, 'item')
  const [w, h] = node.asset.dimensions
  const flameRefs = useRef<Mesh[]>([])
  const timeOfDay = useViewer((s) => s.timeOfDay)

  useFrame((_, delta) => {
    const dt = MathUtils.clamp(delta * 5, 0, 1)
    const target =
      timeOfDay === 'evening'
        ? 1.4
        : timeOfDay === 'dusk'
          ? 0.85
          : timeOfDay === 'goldenHour'
            ? 0.25
            : 0
    for (const f of flameRefs.current) {
      if (!f) continue
      const m = f.material as any
      if (typeof m.emissiveIntensity === 'number') {
        m.emissiveIntensity = MathUtils.lerp(m.emissiveIntensity, target * 1.5 + 0.05, dt)
      }
    }
  })

  // Candles arranged in a triangle on a small tray
  const candles = [
    { x: 0, z: -w * 0.15, height: h * 0.85, r: 0.04 },
    { x: w * 0.18, z: w * 0.1, height: h * 0.55, r: 0.045 },
    { x: -w * 0.18, z: w * 0.1, height: h * 0.65, r: 0.04 },
  ]

  return (
    <group {...handlers}>
      {/* Small round tray base — brass */}
      <mesh castShadow position={[0, 0.008, 0]} receiveShadow>
        <cylinderGeometry args={[w * 0.4, w * 0.4, 0.015, 16]} />
        <meshStandardMaterial color="#b8966a" metalness={0.7} roughness={0.32} />
      </mesh>
      {/* Tray rim */}
      <mesh position={[0, 0.018, 0]}>
        <torusGeometry args={[w * 0.4, 0.008, 8, 20]} />
        <meshStandardMaterial color="#a07a4a" metalness={0.85} roughness={0.22} />
      </mesh>
      {candles.map((c, i) => (
        <group key={`candle-${i}`} position={[c.x, 0.02, c.z]}>
          {/* Wax pillar — pale ivory */}
          <mesh castShadow position={[0, c.height / 2, 0]} receiveShadow>
            <cylinderGeometry args={[c.r, c.r, c.height, 12]} />
            <meshStandardMaterial color="#f5f0e0" metalness={0.05} roughness={0.7} />
          </mesh>
          {/* Wick base */}
          <mesh position={[0, c.height + 0.005, 0]}>
            <cylinderGeometry args={[0.005, 0.005, 0.025, 6]} />
            <meshStandardMaterial color="#1a1a1a" metalness={0} roughness={0.8} />
          </mesh>
          {/* Flame — small emissive cone */}
          <mesh
            position={[0, c.height + 0.05, 0]}
            ref={(m) => {
              if (m) flameRefs.current[i] = m
            }}
          >
            <coneGeometry args={[0.012, 0.05, 8]} />
            <meshStandardMaterial
              color="#fff5d6"
              emissive="#ffb050"
              emissiveIntensity={0.05}
              metalness={0}
              roughness={0.4}
            />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// ─── Pool Towel — folded white towel pile ──────────────────────────────────
//
// Spa-quality folded towel pile — three towels stacked with offset folds,
// dark crease bands at every fold line, slightly varied tones, and a
// subtle drape rolled towel on top. Reads as "luxury resort towels" at
// medium distance without cloth simulation.
function PoolTowel({ node }: { node: ItemNode }) {
  const handlers = useNodeEvents(node, 'item')
  const [w, h, d] = node.asset.dimensions

  // Three different towel tones — subtle variance avoids reading as "stack
  // of identical boxes." All are luxury-resort whites with slightly
  // different undertones.
  const towels = [
    { tone: '#f5efe3', crease: '#cdc4b1' }, // bottom — warm cream
    { tone: '#fbf6ec', crease: '#d8d0bb' }, // middle — ivory
    { tone: '#fafafa', crease: '#d4d4d4' }, // top — pure white
  ]
  const towelH = h * 0.22
  const folded = (
    <>
      {towels.map((t, i) => {
        // Each towel is slightly inset from the one below — sells "stacked"
        const inset = i * 0.02
        const yBase = i * towelH
        // Subtle width variance per towel (±2 %) so the stack edges aren't
        // perfectly aligned
        const wVar = w * (1 - inset) * (1 + (i % 2 === 0 ? 0.01 : -0.015))
        const dVar = d * (1 - inset) * (1 - (i % 2 === 0 ? 0.005 : 0.02))
        return (
          <group key={`towel-${i}`}>
            {/* Towel body */}
            <mesh
              castShadow
              position={[i % 2 === 0 ? 0 : w * 0.012, yBase + towelH / 2, 0]}
              receiveShadow
            >
              <boxGeometry args={[wVar, towelH, dVar]} />
              <meshStandardMaterial
                color={t.tone}
                metalness={0.02}
                roughness={0.92}
              />
            </mesh>
            {/* Top crease band — subtle dark line at the fold */}
            <mesh position={[i % 2 === 0 ? 0 : w * 0.012, yBase + towelH - 0.005, 0]}>
              <boxGeometry args={[wVar + 0.005, 0.01, dVar + 0.005]} />
              <meshStandardMaterial
                color={t.crease}
                metalness={0.02}
                roughness={0.95}
              />
            </mesh>
            {/* Front fold edge — narrow strip on the front face suggesting
                a rolled-under hem (the visible "fold seam") */}
            <mesh position={[i % 2 === 0 ? 0 : w * 0.012, yBase + towelH * 0.55, dVar / 2 + 0.003]}>
              <boxGeometry args={[wVar * 0.95, towelH * 0.5, 0.012]} />
              <meshStandardMaterial
                color={t.crease}
                metalness={0.02}
                roughness={0.95}
              />
            </mesh>
            {/* Side fold edges — thin vertical strips on the left/right
                front corners suggesting hand-folded edges */}
            {[-1, 1].map((s) => (
              <mesh
                key={`towel-side-${i}-${s}`}
                position={[
                  (i % 2 === 0 ? 0 : w * 0.012) + (wVar / 2 - 0.005) * s,
                  yBase + towelH * 0.55,
                  dVar / 2 - 0.005,
                ]}
              >
                <boxGeometry args={[0.018, towelH * 0.92, 0.018]} />
                <meshStandardMaterial
                  color={t.crease}
                  metalness={0.02}
                  roughness={0.95}
                />
              </mesh>
            ))}
          </group>
        )
      })}
    </>
  )

  // Rolled towel on top — small cylinder lying horizontally, suggests
  // "spare rolled towel." Adds a vertical accent that breaks the
  // geometric stack.
  const rollR = Math.min(towelH * 0.55, d * 0.28)
  const rollLen = w * 0.55
  const rollY = towels.length * towelH + rollR

  return (
    <group {...handlers}>
      {folded}
      {/* Rolled towel — cylinder lying on top of the stack */}
      <group position={[w * 0.18, rollY, 0]} rotation={[0, 0, Math.PI / 2]}>
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[rollR, rollR, rollLen, 14]} />
          <meshStandardMaterial color="#fafafa" metalness={0.02} roughness={0.92} />
        </mesh>
        {/* Roll seam — thin spiral hint on the cylinder */}
        <mesh position={[0, 0, 0]} rotation={[0, Math.PI / 5, 0]}>
          <cylinderGeometry args={[rollR + 0.002, rollR + 0.002, rollLen * 0.06, 14]} />
          <meshStandardMaterial color="#d4d4d4" metalness={0.02} roughness={0.95} />
        </mesh>
      </group>
    </group>
  )
}

// ─── Drinks Tray — bottle + 2 stemmed glasses on a luxury tray ────────────
//
// Hospitality staging moment. The bottle has a body + tapered shoulder +
// neck + cap, the glasses have a proper stem + curved bowl + base disk
// with subtle liquid tint, and the tray has a brass-rimmed walnut base
// with a recessed center. Each glass and bottle includes a separate
// "liquid" mesh so the contents read as filled to a level rather than
// hollow.
function DrinksTray({ node }: { node: ItemNode }) {
  const handlers = useNodeEvents(node, 'item')
  const [w, h, d] = node.asset.dimensions

  // Tray geometry parameters
  const trayH = 0.04
  const trayInset = 0.02 // recessed inner panel below the rim
  const rimH = 0.05
  const rimT = 0.035

  // Bottle parameters — tall slender wine bottle silhouette
  const bottleY0 = trayH + 0.005 // sits on the tray floor
  const bottleBodyR = h * 0.085
  const bottleBodyH = h * 0.5
  const bottleShoulderH = h * 0.12
  const bottleNeckR = h * 0.038
  const bottleNeckH = h * 0.18
  const bottleCapH = h * 0.04

  // Glass parameters — proper wine-glass profile
  const glassStemH = h * 0.32
  const glassBowlH = h * 0.26
  const glassBowlR = h * 0.13
  const glassBaseR = h * 0.11

  // Wine color (deep red — reads as luxury at any time of day)
  const wineColor = '#3a0a16'

  return (
    <group {...handlers}>
      {/* ── TRAY ─────────────────────────────────────────────────────── */}
      {/* Walnut base panel */}
      <mesh castShadow position={[0, trayH / 2, 0]} receiveShadow>
        <boxGeometry args={[w, trayH, d]} />
        <meshStandardMaterial color="#2a1a0e" metalness={0.15} roughness={0.65} />
      </mesh>
      {/* Recessed center panel — slightly darker, sells "well-made tray" */}
      <mesh position={[0, trayH + 0.001, 0]}>
        <boxGeometry args={[w - rimT * 2, 0.005, d - rimT * 2]} />
        <meshStandardMaterial color="#1a0c06" metalness={0.18} roughness={0.7} />
      </mesh>
      {/* Brass rim (4 sides) */}
      {[-1, 1].map((s) => (
        <mesh key={`tr-x-${s}`} position={[(w / 2 - rimT / 2) * s, trayH / 2 + rimH / 2, 0]}>
          <boxGeometry args={[rimT, rimH, d]} />
          <meshStandardMaterial color="#b8966a" metalness={0.7} roughness={0.28} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={`tr-z-${s}`} position={[0, trayH / 2 + rimH / 2, (d / 2 - rimT / 2) * s]}>
          <boxGeometry args={[w, rimH, rimT]} />
          <meshStandardMaterial color="#b8966a" metalness={0.7} roughness={0.28} />
        </mesh>
      ))}
      {/* Brass corner caps for extra detail */}
      {[
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ].map(([sx, sz], i) => (
        <mesh
          key={`tr-corner-${i}`}
          position={[(w / 2 - 0.02) * sx!, trayH / 2 + rimH + 0.01, (d / 2 - 0.02) * sz!]}
        >
          <cylinderGeometry args={[0.018, 0.018, 0.015, 8]} />
          <meshStandardMaterial color="#a07a4a" metalness={0.85} roughness={0.2} />
        </mesh>
      ))}

      {/* ── BOTTLE — green wine bottle profile ─────────────────────── */}
      <group position={[w * 0.25, bottleY0, 0]}>
        {/* Body — main cylindrical mass */}
        <mesh castShadow>
          <cylinderGeometry
            args={[bottleBodyR, bottleBodyR * 1.05, bottleBodyH, 16]}
          />
          <meshStandardMaterial
            color="#1a3a1a"
            emissive="#0a1f0a"
            emissiveIntensity={0.06}
            metalness={0.35}
            roughness={0.18}
            transparent
            opacity={0.94}
          />
        </mesh>
        {/* Shoulder — tapered cone narrowing to the neck */}
        <mesh position={[0, bottleBodyH / 2 + bottleShoulderH / 2, 0]}>
          <cylinderGeometry
            args={[bottleNeckR, bottleBodyR, bottleShoulderH, 16]}
          />
          <meshStandardMaterial
            color="#1a3a1a"
            metalness={0.35}
            roughness={0.18}
            transparent
            opacity={0.94}
          />
        </mesh>
        {/* Neck */}
        <mesh
          castShadow
          position={[0, bottleBodyH / 2 + bottleShoulderH + bottleNeckH / 2, 0]}
        >
          <cylinderGeometry args={[bottleNeckR, bottleNeckR, bottleNeckH, 12]} />
          <meshStandardMaterial
            color="#1a3a1a"
            metalness={0.35}
            roughness={0.18}
            transparent
            opacity={0.94}
          />
        </mesh>
        {/* Foil cap on the neck */}
        <mesh
          position={[
            0,
            bottleBodyH / 2 + bottleShoulderH + bottleNeckH - bottleCapH / 2,
            0,
          ]}
        >
          <cylinderGeometry args={[bottleNeckR + 0.003, bottleNeckR + 0.003, bottleCapH, 12]} />
          <meshStandardMaterial color="#5a0a14" metalness={0.55} roughness={0.4} />
        </mesh>
        {/* Wine label — small dark rectangle wrapping the body */}
        <mesh position={[0, 0.05, bottleBodyR + 0.001]}>
          <boxGeometry args={[bottleBodyR * 1.1, bottleBodyH * 0.45, 0.003]} />
          <meshStandardMaterial color="#1a0a06" metalness={0.2} roughness={0.7} />
        </mesh>
        {/* Label gold accent stripe */}
        <mesh position={[0, 0.13, bottleBodyR + 0.0015]}>
          <boxGeometry args={[bottleBodyR * 1.05, 0.012, 0.002]} />
          <meshStandardMaterial color="#b8966a" metalness={0.7} roughness={0.3} />
        </mesh>
      </group>

      {/* ── TWO STEMMED GLASSES ─────────────────────────────────────── */}
      {[-0.18, 0.18].map((sz) => (
        <group key={`glass-${sz}`} position={[-w * 0.22, trayH + 0.003, sz]}>
          {/* Base disk */}
          <mesh>
            <cylinderGeometry args={[glassBaseR, glassBaseR, 0.005, 14]} />
            <meshStandardMaterial
              color="#f5fbff"
              metalness={0.4}
              roughness={0.08}
              transparent
              opacity={0.6}
            />
          </mesh>
          {/* Stem — thin tapered cylinder */}
          <mesh position={[0, glassStemH / 2 + 0.003, 0]}>
            <cylinderGeometry
              args={[0.011, 0.013, glassStemH, 8]}
            />
            <meshStandardMaterial
              color="#f5fbff"
              metalness={0.45}
              roughness={0.06}
              transparent
              opacity={0.55}
            />
          </mesh>
          {/* Bowl — wider tulip shape, narrower at top */}
          <mesh
            position={[
              0,
              glassStemH + 0.005 + glassBowlH * 0.45,
              0,
            ]}
          >
            <cylinderGeometry
              args={[glassBowlR * 0.85, glassBowlR * 0.55, glassBowlH, 14]}
            />
            <meshStandardMaterial
              color="#f5fbff"
              metalness={0.5}
              roughness={0.05}
              transparent
              opacity={0.45}
            />
          </mesh>
          {/* Bowl rim — narrows further at the very top */}
          <mesh
            position={[
              0,
              glassStemH + 0.005 + glassBowlH * 0.95,
              0,
            ]}
          >
            <cylinderGeometry
              args={[glassBowlR * 0.7, glassBowlR * 0.78, glassBowlH * 0.15, 14]}
            />
            <meshStandardMaterial
              color="#f5fbff"
              metalness={0.5}
              roughness={0.05}
              transparent
              opacity={0.45}
            />
          </mesh>
          {/* Wine fill — opaque liquid sitting in the lower 60% of the bowl */}
          <mesh
            position={[
              0,
              glassStemH + 0.005 + glassBowlH * 0.32,
              0,
            ]}
          >
            <cylinderGeometry
              args={[glassBowlR * 0.7, glassBowlR * 0.5, glassBowlH * 0.55, 14]}
            />
            <meshStandardMaterial
              color={wineColor}
              metalness={0.18}
              roughness={0.25}
              transparent
              opacity={0.9}
            />
          </mesh>
          {/* Wine surface highlight — very thin disk at the top of the
              liquid suggesting a meniscus */}
          <mesh
            position={[
              0,
              glassStemH + 0.005 + glassBowlH * 0.59,
              0,
            ]}
          >
            <cylinderGeometry
              args={[glassBowlR * 0.7, glassBowlR * 0.7, 0.003, 14]}
            />
            <meshStandardMaterial
              color="#5a1422"
              emissive="#3a0612"
              emissiveIntensity={0.08}
              metalness={0.45}
              roughness={0.18}
            />
          </mesh>
        </group>
      ))}

      {/* ── SMALL DECORATIVE ACCENT — tiny olive/garnish bowl ───────── */}
      <mesh position={[w * 0.15, trayH + 0.012, d * 0.3]}>
        <cylinderGeometry args={[0.045, 0.04, 0.025, 14]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.4} roughness={0.45} />
      </mesh>
      {/* Olive contents — three tiny dark spheres */}
      {[
        [0.01, 0.005],
        [-0.01, 0.005],
        [0, -0.01],
      ].map(([ox, oz], i) => (
        <mesh
          key={`olive-${i}`}
          position={[w * 0.15 + ox!, trayH + 0.028, d * 0.3 + oz!]}
        >
          <sphereGeometry args={[0.012, 8, 6]} />
          <meshStandardMaterial color="#3a4a18" metalness={0.2} roughness={0.5} />
        </mesh>
      ))}
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
  'pool-towel': PoolTowel,
  'drinks-tray': DrinksTray,
  'champagne-bucket': ChampagneBucket,
  'throw-blanket': ThrowBlanket,
  'candle-cluster': CandleCluster,
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
