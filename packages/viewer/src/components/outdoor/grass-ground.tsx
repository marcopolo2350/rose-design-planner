'use client'

import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { Color, MathUtils } from 'three'
import {
  color,
  cos,
  float,
  mix,
  positionWorld,
  sin,
  smoothstep,
  uniform,
  vec2,
  vec3,
} from 'three/tsl'
import { MeshStandardNodeMaterial } from 'three/webgpu'
import useViewer from '../../store/use-viewer'
import { getTimeOfDayPalette } from './time-of-day-palette'

const GROUND_SIZE = 800
const GROUND_Y = -0.07

export function GrassGround() {
  const timeOfDay = useViewer((s) => s.timeOfDay)

  const { material, uniforms } = useMemo(() => {
    const palette = getTimeOfDayPalette('day')

    const baseTint = uniform(palette.groundTint.clone())
    const accentTint = uniform(new Color('#7d9b4a'))
    const darkTint = uniform(new Color('#4f6b35'))
    const fadeTint = uniform(palette.fog.clone())

    const wp = positionWorld
    const x = wp.x
    const z = wp.z

    // Layered trigonometric variation gives soft "patches of grass" feel
    // without needing a custom Fn (which has TSL/TS typing friction).
    const lo = sin(x.mul(0.07)).mul(cos(z.mul(0.09))).mul(0.5).add(0.5)
    const mid = sin(x.mul(0.31).add(z.mul(0.27))).mul(0.5).add(0.5)
    const hi = sin(x.mul(0.93)).mul(cos(z.mul(0.71))).mul(0.5).add(0.5)
    const variation = lo.mul(0.55).add(mid.mul(0.3)).add(hi.mul(0.15))

    const grassA = mix(baseTint, accentTint, smoothstep(0.35, 0.72, variation))
    const grassB = mix(grassA, darkTint, smoothstep(0.7, 0.95, hi))

    const dist = vec2(x, z).length()
    const fade = smoothstep(float(110), float(330), dist)
    const tinted = mix(grassB, fadeTint, fade)

    // Subtle aerial sheen — keeps the lawn from feeling flat
    const sheen = sin(x.mul(0.6)).mul(sin(z.mul(0.6))).mul(0.022)
    const lit = vec3(
      tinted.r.add(sheen),
      tinted.g.add(sheen.mul(1.2)),
      tinted.b.add(sheen.mul(0.6)),
    )

    const mat = new MeshStandardNodeMaterial({
      colorNode: color(lit),
      roughness: 0.95,
      metalness: 0,
    })
    mat.fog = true

    return {
      material: mat,
      uniforms: { baseTint, accentTint, darkTint, fadeTint },
    }
  }, [])

  const targets = useRef({
    base: new Color(),
    fade: new Color(),
  })

  useFrame((_, delta) => {
    const dt = MathUtils.clamp(Math.min(delta, 0.1) * 2.5, 0, 1)
    const palette = getTimeOfDayPalette(timeOfDay)
    targets.current.base.copy(palette.groundTint)
    targets.current.fade.copy(palette.fog)
    uniforms.baseTint.value.lerp(targets.current.base, dt)
    uniforms.fadeTint.value.lerp(targets.current.fade, dt)
  })

  return (
    <mesh
      position={[0, GROUND_Y, 0]}
      rotation-x={-Math.PI / 2}
      receiveShadow
      renderOrder={-100}
      frustumCulled={false}
    >
      <planeGeometry args={[GROUND_SIZE, GROUND_SIZE, 1, 1]} />
      <primitive object={material} attach="material" />
    </mesh>
  )
}
