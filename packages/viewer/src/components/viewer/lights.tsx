import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import type { AmbientLight, DirectionalLight, OrthographicCamera } from 'three/webgpu'
import * as THREE from 'three/webgpu'
import useViewer from '../../store/use-viewer'
import { getTimeOfDayPalette } from '../outdoor/time-of-day-palette'

export function Lights() {
  const theme = useViewer((state) => state.theme)
  const outdoorMode = useViewer((state) => state.outdoorMode)
  const timeOfDay = useViewer((state) => state.timeOfDay)
  const isDark = theme === 'dark'

  const light1Ref = useRef<DirectionalLight>(null)
  const shadowCamera = useRef<OrthographicCamera>(null)
  const shadowCameraSize = 50 // The "area" around the camera to shadow

  const light2Ref = useRef<DirectionalLight>(null)
  const light3Ref = useRef<DirectionalLight>(null)
  const ambientRef = useRef<AmbientLight>(null)

  const initialized = useRef(false)

  const targets = useMemo(
    () => ({
      l1Color: new THREE.Color(),
      l2Color: new THREE.Color(),
      l3Color: new THREE.Color(),
      ambColor: new THREE.Color(),
    }),
    [],
  )

  useFrame((_, delta) => {
    // clamp delta to avoid huge jumps on tab switch
    const dt = Math.min(delta, 0.1) * 4

    // When outdoor mode is on, the OutdoorLights component provides the
    // dominant lighting (hemisphere bounce, warm rim/fill); the default
    // sun + fills below dial down to act as soft accent rather than the
    // primary key light, and pick up the time-of-day color so they don't
    // fight the outdoor palette.
    const palette = outdoorMode ? getTimeOfDayPalette(timeOfDay) : null
    const sunHex = palette ? `#${palette.sunColor.getHexString()}` : isDark ? '#e0e5ff' : '#ffffff'
    const sunIntensity = palette
      ? Math.max(0.3, palette.sunIntensity * 0.55)
      : isDark
        ? 0.8
        : 4
    const fillIntensity = palette
      ? palette.fillIntensity * 0.4
      : isDark
        ? 0.2
        : 0.75
    const rimIntensity = palette
      ? palette.rimIntensity * 0.4
      : isDark
        ? 0.3
        : 1
    const ambIntensity = palette
      ? palette.ambientIntensity * 0.25
      : isDark
        ? 0.15
        : 0.5

    if (!initialized.current) {
      if (light1Ref.current) {
        light1Ref.current.intensity = sunIntensity
        light1Ref.current.color.set(sunHex)

        if (light1Ref.current.shadow) light1Ref.current.shadow.intensity = isDark ? 0.8 : 0.45
      }
      if (light2Ref.current) {
        light2Ref.current.intensity = fillIntensity
        light2Ref.current.color.set(palette ? `#${palette.fillColor.getHexString()}` : isDark ? '#8090ff' : '#ffffff')
      }
      if (light3Ref.current) {
        light3Ref.current.intensity = rimIntensity
        light3Ref.current.color.set(palette ? `#${palette.rimColor.getHexString()}` : isDark ? '#a0b0ff' : '#ffffff')
      }
      if (ambientRef.current) {
        ambientRef.current.intensity = ambIntensity
        ambientRef.current.color.set(palette ? `#${palette.ambientColor.getHexString()}` : isDark ? '#a0b0ff' : '#ffffff')
      }
      initialized.current = true
      return
    }

    if (light1Ref.current) {
      light1Ref.current.intensity = THREE.MathUtils.lerp(
        light1Ref.current.intensity,
        sunIntensity,
        dt,
      )
      targets.l1Color.set(sunHex)
      light1Ref.current.color.lerp(targets.l1Color, dt)

      if (light1Ref.current.shadow) {
        if (light1Ref.current.shadow.intensity !== undefined) {
          light1Ref.current.shadow.intensity = THREE.MathUtils.lerp(
            light1Ref.current.shadow.intensity,
            isDark ? 0.8 : 0.45,
            dt,
          )
        }
      }
    }

    if (light2Ref.current) {
      light2Ref.current.intensity = THREE.MathUtils.lerp(
        light2Ref.current.intensity,
        fillIntensity,
        dt,
      )
      targets.l2Color.set(palette ? `#${palette.fillColor.getHexString()}` : isDark ? '#8090ff' : '#ffffff')
      light2Ref.current.color.lerp(targets.l2Color, dt)
    }

    if (light3Ref.current) {
      light3Ref.current.intensity = THREE.MathUtils.lerp(
        light3Ref.current.intensity,
        rimIntensity,
        dt,
      )
      targets.l3Color.set(palette ? `#${palette.rimColor.getHexString()}` : isDark ? '#a0b0ff' : '#ffffff')
      light3Ref.current.color.lerp(targets.l3Color, dt)
    }

    if (ambientRef.current) {
      ambientRef.current.intensity = THREE.MathUtils.lerp(
        ambientRef.current.intensity,
        ambIntensity,
        dt,
      )
      targets.ambColor.set(palette ? `#${palette.ambientColor.getHexString()}` : isDark ? '#a0b0ff' : '#ffffff')
      ambientRef.current.color.lerp(targets.ambColor, dt)
    }
  })

  return (
    <>
      <directionalLight
        castShadow
        position={[10, 10, 10]}
        ref={light1Ref}
        shadow-bias={-0.002}
        shadow-mapSize={[1024, 1024]}
        shadow-normalBias={0.3}
        shadow-radius={3}
      >
        <orthographicCamera
          attach="shadow-camera"
          bottom={-shadowCameraSize}
          far={100}
          left={-shadowCameraSize}
          near={1}
          ref={shadowCamera}
          right={shadowCameraSize}
          top={shadowCameraSize}
        />
      </directionalLight>

      <directionalLight position={[-10, 10, -10]} ref={light2Ref} />

      <directionalLight position={[-10, 10, 10]} ref={light3Ref} />

      <ambientLight ref={ambientRef} />
    </>
  )
}
