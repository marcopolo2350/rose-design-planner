export type HapticPattern = 'light' | 'success' | 'warning'

const HAPTIC_PATTERNS: Record<HapticPattern, number | number[]> = {
  light: 10,
  success: [14, 20, 18],
  warning: [22, 18, 28],
}

export function triggerHaptic(pattern: HapticPattern = 'light') {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') {
    return
  }

  try {
    navigator.vibrate(HAPTIC_PATTERNS[pattern])
  } catch {}
}
