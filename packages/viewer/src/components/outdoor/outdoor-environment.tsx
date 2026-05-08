'use client'

import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { Color, Fog, MathUtils } from 'three'
import useViewer from '../../store/use-viewer'
import { DistantTreeline } from './distant-treeline'
import { Fireflies } from './fireflies'
import { GrassGround } from './grass-ground'
import { OutdoorLights } from './outdoor-lights'
import { SkyDome } from './sky-dome'
import { getTimeOfDayPalette } from './time-of-day-palette'

/**
 * OutdoorEnvironment — drops the editor into a luxurious outdoor world.
 *
 *  - sky dome with vertical gradient that animates between time-of-day presets
 *  - procedural grass ground that fades toward the horizon
 *  - distant tree silhouettes for atmospheric depth
 *  - smooth fog so geometry feels embedded in real air
 *  - additional warm fill / rim lights tuned for outdoor scenes
 *  - subtle firefly particles that fade in at dusk and evening
 *
 * Mounted only when `outdoorMode` is enabled in the viewer store.
 */
export function OutdoorEnvironment() {
  const outdoorMode = useViewer((s) => s.outdoorMode)
  const timeOfDay = useViewer((s) => s.timeOfDay)
  const { scene, gl } = useThree()
  const fogRef = useRef<Fog | null>(null)
  const fogTargetColor = useRef(new Color())
  const previousFog = useRef<Fog | null>(null)

  // Take ownership of scene fog while outdoor mode is active, restore on unmount.
  useEffect(() => {
    if (!outdoorMode) return
    previousFog.current = (scene.fog as Fog | null) ?? null
    const palette = getTimeOfDayPalette(timeOfDay)
    const fog = new Fog(palette.fog.getHex(), palette.fogNear, palette.fogFar)
    fogRef.current = fog
    scene.fog = fog
    return () => {
      scene.fog = previousFog.current
      fogRef.current = null
    }
  }, [scene, outdoorMode]) // intentionally exclude timeOfDay — handled via lerp

  useFrame((_, delta) => {
    if (!fogRef.current) return
    const dt = MathUtils.clamp(Math.min(delta, 0.1) * 2.2, 0, 1)
    const palette = getTimeOfDayPalette(timeOfDay)
    fogTargetColor.current.copy(palette.fog)
    fogRef.current.color.lerp(fogTargetColor.current, dt)
    fogRef.current.near = MathUtils.lerp(fogRef.current.near, palette.fogNear, dt)
    fogRef.current.far = MathUtils.lerp(fogRef.current.far, palette.fogFar, dt)

    // Tone exposure shifts subtly across the day — keeps highlights soft at dusk/evening
    const renderer = gl as unknown as { toneMappingExposure?: number }
    if (typeof renderer.toneMappingExposure === 'number') {
      renderer.toneMappingExposure = MathUtils.lerp(
        renderer.toneMappingExposure,
        palette.exposure,
        dt,
      )
    }
  })

  if (!outdoorMode) return null

  return (
    <group name="outdoor-environment">
      <SkyDome />
      <GrassGround />
      <DistantTreeline />
      <OutdoorLights />
      <Fireflies />
    </group>
  )
}
