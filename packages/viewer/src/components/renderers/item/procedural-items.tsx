'use client'

import type { ItemNode } from '@pascal-app/core'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { AdditiveBlending, MathUtils, type Mesh, type PointLight } from 'three'
import { useNodeEvents } from '../../../hooks/use-node-events'
import useViewer from '../../../store/use-viewer'

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

  // Default 4x2.5x4 pergola with 8 roof slats running along the X axis.
  const postSize = 0.14
  const beamSize = 0.12
  const slatCount = 9
  const slatThickness = 0.06
  const slatHeight = 0.14
  const woodColor = '#8c6a3e'
  const beamColor = '#7a5a32'

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

  return (
    <group {...handlers}>
      {/* Four corner posts */}
      {[
        [-halfW + postSize / 2, halfD - postSize / 2],
        [halfW - postSize / 2, halfD - postSize / 2],
        [-halfW + postSize / 2, -halfD + postSize / 2],
        [halfW - postSize / 2, -halfD + postSize / 2],
      ].map(([px, pz], i) => (
        <mesh castShadow key={`post-${i}`} position={[px!, h / 2, pz!]} receiveShadow>
          <boxGeometry args={[postSize, h, postSize]} />
          <meshStandardMaterial color={woodColor} metalness={0} roughness={0.85} />
        </mesh>
      ))}
      {/* Two long beams running X */}
      {[halfD - postSize / 2, -halfD + postSize / 2].map((z, i) => (
        <mesh castShadow key={`beam-x-${i}`} position={[0, h - beamSize / 2, z]} receiveShadow>
          <boxGeometry args={[w, beamSize, beamSize]} />
          <meshStandardMaterial color={beamColor} metalness={0} roughness={0.85} />
        </mesh>
      ))}
      {/* Two short cross-beams */}
      {[halfW - postSize / 2, -halfW + postSize / 2].map((x, i) => (
        <mesh
          castShadow
          key={`beam-z-${i}`}
          position={[x, h - beamSize / 2 - beamSize - 0.005, 0]}
          receiveShadow
        >
          <boxGeometry args={[beamSize, beamSize, d - postSize]} />
          <meshStandardMaterial color={beamColor} metalness={0} roughness={0.85} />
        </mesh>
      ))}
      {/* Slatted roof — runs along Z so each slat's long axis is X */}
      {slats.map((s, i) => (
        <mesh
          castShadow
          key={`slat-${i}`}
          position={[0, h - beamSize / 2 - beamSize - slatHeight / 2 - 0.01, s.z]}
          receiveShadow
        >
          <boxGeometry args={[w - postSize, slatHeight, slatThickness]} />
          <meshStandardMaterial color={woodColor} metalness={0} roughness={0.82} />
        </mesh>
      ))}
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
      {/* Cabinet base — concrete tone */}
      <mesh castShadow position={[0, counterHeight / 2, 0]} receiveShadow>
        <boxGeometry args={[w, counterHeight, d]} />
        <meshStandardMaterial color="#404040" metalness={0.05} roughness={0.85} />
      </mesh>
      {/* Counter top — light stone slab, slightly larger than the base */}
      <mesh
        castShadow
        position={[0, counterHeight + 0.025, 0]}
        receiveShadow
      >
        <boxGeometry args={[w + 0.06, 0.05, d + 0.05]} />
        <meshStandardMaterial color="#dcd5c8" metalness={0.08} roughness={0.55} />
      </mesh>
      {/* Inset grill — dark metallic block on top */}
      <mesh
        castShadow
        position={[0, counterHeight + 0.05 + grillHeight / 2, 0]}
        receiveShadow
      >
        <boxGeometry args={[grillWidth, grillHeight, grillDepth]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.85} roughness={0.35} />
      </mesh>
      {/* Cabinet doors — thin slats on the front */}
      {[-w / 4, w / 4].map((x, i) => (
        <mesh key={`door-${i}`} position={[x, counterHeight / 2, d / 2 + 0.005]}>
          <boxGeometry args={[w / 2 - 0.08, counterHeight - 0.12, 0.01]} />
          <meshStandardMaterial color="#2c2c2c" metalness={0.1} roughness={0.7} />
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
      {/* Wooden box */}
      <mesh castShadow position={[0, boxHeight / 2, 0]} receiveShadow>
        <boxGeometry args={[w, boxHeight, d]} />
        <meshStandardMaterial color="#8a6a44" metalness={0} roughness={0.85} />
      </mesh>
      {/* Soil cap — slightly inset darker top */}
      <mesh position={[0, boxHeight + 0.005, 0]}>
        <boxGeometry args={[w - 0.04, 0.02, d - 0.04]} />
        <meshStandardMaterial color="#2c1f12" metalness={0} roughness={1} />
      </mesh>
      {/* Foliage — green dome */}
      <mesh
        castShadow
        position={[0, boxHeight + foliageRadius * 0.8, 0]}
        receiveShadow
      >
        <sphereGeometry args={[foliageRadius, 12, 8]} />
        <meshStandardMaterial color="#5d8a3f" metalness={0} roughness={1} />
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

function GardenLantern({ node }: { node: ItemNode }) {
  const handlers = useNodeEvents(node, 'item')
  const [, h] = node.asset.dimensions
  const lampRef = useRef<Mesh>(null!)
  const lightRef = useRef<PointLight>(null!)
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
    if (lightRef.current) {
      lightRef.current.intensity = MathUtils.lerp(lightRef.current.intensity, target, dt)
    }
    if (lampRef.current) {
      ;(lampRef.current.material as any).emissiveIntensity = MathUtils.lerp(
        (lampRef.current.material as any).emissiveIntensity ?? 0,
        target * 1.8 + 0.05,
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
      {/* Lamp head */}
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
      {/* Tiny path-glow point light */}
      <pointLight
        ref={lightRef}
        color="#ffd9a0"
        decay={2}
        distance={3.5}
        intensity={0}
        position={[0, stemHeight + 0.06, 0]}
      />
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
