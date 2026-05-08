'use client'

import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { Color, MathUtils } from 'three'
import useViewer from '../../store/use-viewer'
import { getTimeOfDayPalette } from './time-of-day-palette'

const RING_RADIUS = 230
const TREE_COUNT = 96
const SEED_OFFSET = 0.9183

function rng(i: number) {
  const x = Math.sin(i * 12.9898 + SEED_OFFSET) * 43758.5453
  return x - Math.floor(x)
}

export function DistantTreeline() {
  const timeOfDay = useViewer((s) => s.timeOfDay)

  const trees = useMemo(() => {
    const out: { angle: number; radius: number; height: number; width: number }[] = []
    for (let i = 0; i < TREE_COUNT; i++) {
      const angle = (i / TREE_COUNT) * Math.PI * 2
      const jitter = (rng(i) - 0.5) * 0.04
      out.push({
        angle: angle + jitter,
        radius: RING_RADIUS + (rng(i + 17) - 0.5) * 35,
        height: 6 + rng(i + 31) * 9,
        width: 4 + rng(i + 53) * 5,
      })
    }
    return out
  }, [])

  const colorRef = useRef(new Color('#3f5b3a'))
  const targetRef = useRef(new Color())

  useFrame((_, delta) => {
    const dt = MathUtils.clamp(Math.min(delta, 0.1) * 2.5, 0, 1)
    const palette = getTimeOfDayPalette(timeOfDay)
    // Treeline picks up the fog tint to feel atmospherically embedded
    targetRef.current.copy(palette.fog).lerp(palette.groundTint, 0.55).multiplyScalar(0.55)
    colorRef.current.lerp(targetRef.current, dt)
  })

  return (
    <group>
      {trees.map((t, i) => {
        const x = Math.cos(t.angle) * t.radius
        const z = Math.sin(t.angle) * t.radius
        return (
          <mesh
            key={i}
            position={[x, t.height / 2 - 0.05, z]}
            rotation={[0, -t.angle + Math.PI / 2, 0]}
            renderOrder={-50}
          >
            <coneGeometry args={[t.width / 2, t.height, 6, 1]} />
            <meshBasicMaterial color={colorRef.current} fog />
          </mesh>
        )
      })}
    </group>
  )
}
