'use client'

import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { BackSide, Color, type Mesh, MathUtils } from 'three'
import { color, mix, positionLocal, smoothstep, uniform } from 'three/tsl'
import { MeshBasicNodeMaterial } from 'three/webgpu'
import useViewer from '../../store/use-viewer'
import { getTimeOfDayPalette } from './time-of-day-palette'

const DOME_RADIUS = 480
const HORIZON_OFFSET = -0.18

export function SkyDome() {
  const meshRef = useRef<Mesh>(null!)
  const timeOfDay = useViewer((s) => s.timeOfDay)

  const { material, uniforms } = useMemo(() => {
    const palette = getTimeOfDayPalette('day')
    const skyTop = uniform(palette.skyTop.clone())
    const skyHorizon = uniform(palette.skyHorizon.clone())

    const elevation = positionLocal.y.div(DOME_RADIUS).add(HORIZON_OFFSET)
    const blend = smoothstep(0, 0.7, elevation)
    const skyColor = mix(skyHorizon, skyTop, blend)

    const mat = new MeshBasicNodeMaterial({
      colorNode: color(skyColor),
      side: BackSide,
      depthWrite: false,
      transparent: false,
      fog: false,
    })

    return { material: mat, uniforms: { skyTop, skyHorizon } }
  }, [])

  const targets = useRef({
    top: new Color(),
    horizon: new Color(),
  })

  useFrame((state, delta) => {
    const dt = MathUtils.clamp(Math.min(delta, 0.1) * 2.5, 0, 1)
    const palette = getTimeOfDayPalette(timeOfDay)
    targets.current.top.copy(palette.skyTop)
    targets.current.horizon.copy(palette.skyHorizon)

    uniforms.skyTop.value.lerp(targets.current.top, dt)
    uniforms.skyHorizon.value.lerp(targets.current.horizon, dt)

    if (meshRef.current) {
      meshRef.current.position.copy(state.camera.position)
    }
  })

  return (
    <mesh ref={meshRef} renderOrder={-1000} frustumCulled={false}>
      <sphereGeometry args={[DOME_RADIUS, 48, 32]} />
      <primitive object={material} attach="material" />
    </mesh>
  )
}
