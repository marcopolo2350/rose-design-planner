'use client'

import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import {
  type AmbientLight,
  type DirectionalLight,
  type HemisphereLight,
  Color,
  MathUtils,
} from 'three'
import useViewer from '../../store/use-viewer'
import { getTimeOfDayPalette } from './time-of-day-palette'

/**
 * Additional lights layered on top of the default editor lights to give
 * outdoor scenes a believable sky/sun balance. The default Lights component
 * is kept for indoor scenes; OutdoorLights add:
 *
 *   - a hemisphere light (sky color above, ground color below) for that
 *     "open air" bounce that interiors don't need
 *   - a warm rim/sun pass that strengthens at golden hour and dusk
 *   - a soft fill that picks up the sky tint
 *
 * Default editor lights are not removed — they're animated to a softer
 * intensity in outdoor mode so they don't double up.
 */
export function OutdoorLights() {
  const timeOfDay = useViewer((s) => s.timeOfDay)
  const showcase = useViewer((s) => s.showcaseMode)

  const hemiRef = useRef<HemisphereLight>(null!)
  const rimRef = useRef<DirectionalLight>(null!)
  const fillRef = useRef<DirectionalLight>(null!)
  const ambientRef = useRef<AmbientLight>(null!)

  const targets = useMemo(
    () => ({
      hemiSky: new Color(),
      hemiGround: new Color(),
      rim: new Color(),
      fill: new Color(),
      amb: new Color(),
    }),
    [],
  )

  useFrame((_, delta) => {
    const dt = MathUtils.clamp(Math.min(delta, 0.1) * 2.2, 0, 1)
    const palette = getTimeOfDayPalette(timeOfDay)
    const showcaseBoost = showcase ? 1.12 : 1

    if (hemiRef.current) {
      targets.hemiSky.copy(palette.hemisphereSky)
      targets.hemiGround.copy(palette.hemisphereGround)
      hemiRef.current.color.lerp(targets.hemiSky, dt)
      hemiRef.current.groundColor.lerp(targets.hemiGround, dt)
      hemiRef.current.intensity = MathUtils.lerp(
        hemiRef.current.intensity,
        palette.hemisphereIntensity * showcaseBoost,
        dt,
      )
    }
    if (rimRef.current) {
      targets.rim.copy(palette.rimColor)
      rimRef.current.color.lerp(targets.rim, dt)
      rimRef.current.intensity = MathUtils.lerp(
        rimRef.current.intensity,
        palette.rimIntensity * showcaseBoost,
        dt,
      )
    }
    if (fillRef.current) {
      targets.fill.copy(palette.fillColor)
      fillRef.current.color.lerp(targets.fill, dt)
      fillRef.current.intensity = MathUtils.lerp(
        fillRef.current.intensity,
        palette.fillIntensity * showcaseBoost,
        dt,
      )
    }
    if (ambientRef.current) {
      targets.amb.copy(palette.ambientColor)
      ambientRef.current.color.lerp(targets.amb, dt)
      ambientRef.current.intensity = MathUtils.lerp(
        ambientRef.current.intensity,
        palette.ambientIntensity,
        dt,
      )
    }
  })

  return (
    <>
      <hemisphereLight
        ref={hemiRef}
        args={['#a8d2ff', '#7d8e5e', 0.6]}
        position={[0, 30, 0]}
      />
      <directionalLight ref={rimRef} position={[-18, 12, -22]} intensity={0.6} />
      <directionalLight ref={fillRef} position={[14, 8, -18]} intensity={0.65} />
      <ambientLight ref={ambientRef} intensity={0.4} />
    </>
  )
}
