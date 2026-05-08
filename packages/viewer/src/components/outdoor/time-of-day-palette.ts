import { Color } from 'three'
import type { TimeOfDay } from '../../store/use-viewer'

export type TimeOfDayPalette = {
  skyTop: Color
  skyHorizon: Color
  groundTint: Color
  fog: Color
  fogNear: number
  fogFar: number
  sunColor: Color
  sunIntensity: number
  fillColor: Color
  fillIntensity: number
  rimColor: Color
  rimIntensity: number
  ambientColor: Color
  ambientIntensity: number
  hemisphereSky: Color
  hemisphereGround: Color
  hemisphereIntensity: number
  exposure: number
}

const palettes: Record<TimeOfDay, TimeOfDayPalette> = {
  day: {
    skyTop: new Color('#5fb1f0'),
    skyHorizon: new Color('#dceaf5'),
    groundTint: new Color('#a9c479'),
    fog: new Color('#cfe1ee'),
    fogNear: 60,
    fogFar: 280,
    sunColor: new Color('#fff5dc'),
    sunIntensity: 4.2,
    fillColor: new Color('#9fc0f5'),
    fillIntensity: 0.85,
    rimColor: new Color('#bcd9ff'),
    rimIntensity: 0.6,
    ambientColor: new Color('#cad8e8'),
    ambientIntensity: 0.45,
    hemisphereSky: new Color('#a8d2ff'),
    hemisphereGround: new Color('#7d8e5e'),
    hemisphereIntensity: 0.65,
    exposure: 1.0,
  },
  goldenHour: {
    skyTop: new Color('#ec9a55'),
    skyHorizon: new Color('#ffdcad'),
    groundTint: new Color('#a39c5c'),
    fog: new Color('#f4cfa1'),
    fogNear: 40,
    fogFar: 200,
    sunColor: new Color('#ffb56b'),
    sunIntensity: 4.6,
    fillColor: new Color('#ffd7a8'),
    fillIntensity: 0.7,
    rimColor: new Color('#ffb070'),
    rimIntensity: 0.95,
    ambientColor: new Color('#f5c598'),
    ambientIntensity: 0.4,
    hemisphereSky: new Color('#ffb070'),
    hemisphereGround: new Color('#604a30'),
    hemisphereIntensity: 0.7,
    exposure: 1.05,
  },
  dusk: {
    skyTop: new Color('#3a3870'),
    skyHorizon: new Color('#c7779f'),
    groundTint: new Color('#5a6b58'),
    fog: new Color('#8b6a8c'),
    fogNear: 30,
    fogFar: 160,
    sunColor: new Color('#ff7e5f'),
    sunIntensity: 1.6,
    fillColor: new Color('#7d6da5'),
    fillIntensity: 0.55,
    rimColor: new Color('#ffa07a'),
    rimIntensity: 0.85,
    ambientColor: new Color('#5d5b88'),
    ambientIntensity: 0.35,
    hemisphereSky: new Color('#bb6a91'),
    hemisphereGround: new Color('#2c3a40'),
    hemisphereIntensity: 0.6,
    exposure: 1.1,
  },
  evening: {
    skyTop: new Color('#0d1430'),
    skyHorizon: new Color('#1f2a4a'),
    groundTint: new Color('#2a3a32'),
    fog: new Color('#1a223a'),
    fogNear: 25,
    fogFar: 130,
    sunColor: new Color('#7e8fb8'),
    sunIntensity: 0.45,
    fillColor: new Color('#3c4a78'),
    fillIntensity: 0.55,
    rimColor: new Color('#6b7fbf'),
    rimIntensity: 0.4,
    ambientColor: new Color('#283154'),
    ambientIntensity: 0.45,
    hemisphereSky: new Color('#34406d'),
    hemisphereGround: new Color('#0d1623'),
    hemisphereIntensity: 0.45,
    exposure: 1.2,
  },
}

export function getTimeOfDayPalette(time: TimeOfDay): TimeOfDayPalette {
  return palettes[time]
}

export const TIME_OF_DAY_ORDER: TimeOfDay[] = ['day', 'goldenHour', 'dusk', 'evening']

export const TIME_OF_DAY_LABELS: Record<TimeOfDay, string> = {
  day: 'Day',
  goldenHour: 'Golden hour',
  dusk: 'Dusk',
  evening: 'Evening',
}
