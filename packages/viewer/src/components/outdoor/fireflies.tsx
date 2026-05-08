'use client'

import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  BufferGeometry,
  Float32BufferAttribute,
  type Points,
} from 'three'
import { Color } from 'three'
import {
  add,
  cos,
  float,
  mix,
  positionLocal,
  sin,
  smoothstep,
  time,
  uniform,
  vec3,
} from 'three/tsl'
import { PointsNodeMaterial } from 'three/webgpu'
import useViewer from '../../store/use-viewer'

const COUNT = 220
const RADIUS = 38

export function Fireflies() {
  const timeOfDay = useViewer((s) => s.timeOfDay)
  const pointsRef = useRef<Points>(null!)

  const geometry = useMemo(() => {
    const geo = new BufferGeometry()
    const positions = new Float32Array(COUNT * 3)
    const seeds = new Float32Array(COUNT)
    for (let i = 0; i < COUNT; i++) {
      const r = Math.sqrt(Math.random()) * RADIUS
      const a = Math.random() * Math.PI * 2
      positions[i * 3 + 0] = Math.cos(a) * r
      positions[i * 3 + 1] = 0.6 + Math.random() * 2.6
      positions[i * 3 + 2] = Math.sin(a) * r
      seeds[i] = Math.random() * 100
    }
    geo.setAttribute('position', new Float32BufferAttribute(positions, 3))
    geo.setAttribute('seed', new Float32BufferAttribute(seeds, 1))
    return geo
  }, [])

  const { material, uniforms } = useMemo(() => {
    const intensityU = uniform(0.0)
    const tintU = uniform(new Color('#ffe39c'))

    const wave = sin(time.mul(2.4).add(positionLocal.x.mul(0.6)))
      .mul(0.5)
      .add(0.5)
    const wave2 = cos(time.mul(1.7).add(positionLocal.z.mul(0.4)))
      .mul(0.5)
      .add(0.5)
    const blink = mix(float(0.05), float(1), wave.mul(wave2))

    const mat = new PointsNodeMaterial({
      transparent: true,
      depthWrite: false,
      sizeAttenuation: true,
      blending: AdditiveBlending,
    })

    mat.colorNode = vec3(tintU.r, tintU.g, tintU.b).mul(blink).mul(intensityU)
    mat.opacityNode = blink.mul(intensityU)
    mat.sizeNode = float(0.18).add(blink.mul(0.4))

    return { material: mat, uniforms: { intensityU, tintU } }
  }, [])

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1) * 3
    const target =
      timeOfDay === 'evening' ? 1.0 : timeOfDay === 'dusk' ? 0.55 : 0
    uniforms.intensityU.value += (target - uniforms.intensityU.value) * dt
    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * 0.02
    }
  })

  return (
    <points ref={pointsRef} frustumCulled={false}>
      <primitive object={geometry} attach="geometry" />
      <primitive object={material} attach="material" />
    </points>
  )
}
