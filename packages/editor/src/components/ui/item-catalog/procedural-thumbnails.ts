/**
 * Inline SVG thumbnails for procedural items. Returns a `data:image/svg+xml`
 * URI suitable for `<img src>` / `next/image src`. Keeps them in code so we
 * never ship broken-image placeholders for items that have no GLB.
 *
 * Each is a 96×96 SVG with a per-item gradient and a simple pictogram —
 * enough character to read at the catalog's 56–86px display size.
 */

const baseSvg = (gradStops: { offset: string; color: string }[], inner: string): string => {
  const stops = gradStops
    .map((s) => `<stop offset="${s.offset}" stop-color="${s.color}"/>`)
    .join('')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">${stops}</linearGradient></defs><rect width="96" height="96" rx="12" fill="url(#g)"/>${inner}</svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

export const PROCEDURAL_THUMBNAILS: Record<string, string> = {
  firepit: baseSvg(
    [
      { offset: '0%', color: '#3a1a0a' },
      { offset: '100%', color: '#7a2410' },
    ],
    // flame + ember
    '<ellipse cx="48" cy="76" rx="22" ry="6" fill="#1a0a04"/>' +
      '<path d="M48 30 C40 44 36 50 40 60 C44 70 56 70 60 60 C64 50 56 44 48 30 Z" fill="#ff7a28" opacity="0.95"/>' +
      '<path d="M48 42 C44 50 42 54 44 60 C46 66 52 66 54 60 C56 54 52 50 48 42 Z" fill="#ffd76b"/>',
  ),
  pergola: baseSvg(
    [
      { offset: '0%', color: '#a07a4a' },
      { offset: '100%', color: '#5d3f1f' },
    ],
    // posts + slats
    '<rect x="14" y="22" width="6" height="56" fill="#3d2510"/>' +
      '<rect x="76" y="22" width="6" height="56" fill="#3d2510"/>' +
      '<rect x="10" y="22" width="76" height="6" fill="#5d3a18"/>' +
      '<rect x="14" y="34" width="68" height="3" fill="#7a5a32" opacity="0.9"/>' +
      '<rect x="14" y="40" width="68" height="3" fill="#7a5a32" opacity="0.85"/>' +
      '<rect x="14" y="46" width="68" height="3" fill="#7a5a32" opacity="0.8"/>',
  ),
  'outdoor-kitchen-island': baseSvg(
    [
      { offset: '0%', color: '#5a5a5a' },
      { offset: '100%', color: '#2a2a2a' },
    ],
    // counter + grill grates
    '<rect x="8" y="42" width="80" height="36" rx="3" fill="#3a3a3a"/>' +
      '<rect x="6" y="38" width="84" height="6" rx="2" fill="#dcd5c8"/>' +
      '<rect x="32" y="48" width="32" height="14" rx="2" fill="#1a1a1a"/>' +
      '<line x1="34" y1="51" x2="62" y2="51" stroke="#555" stroke-width="1"/>' +
      '<line x1="34" y1="55" x2="62" y2="55" stroke="#555" stroke-width="1"/>' +
      '<line x1="34" y1="59" x2="62" y2="59" stroke="#555" stroke-width="1"/>' +
      '<rect x="14" y="64" width="22" height="10" fill="#2c2c2c"/>' +
      '<rect x="60" y="64" width="22" height="10" fill="#2c2c2c"/>',
  ),
  'planter-box': baseSvg(
    [
      { offset: '0%', color: '#2c4d1c' },
      { offset: '100%', color: '#102808' },
    ],
    // box + dome of foliage
    '<rect x="20" y="58" width="56" height="22" fill="#8a6a44"/>' +
      '<rect x="22" y="58" width="52" height="2" fill="#3a2410"/>' +
      '<ellipse cx="48" cy="50" rx="26" ry="20" fill="#5d8a3f"/>' +
      '<ellipse cx="34" cy="44" rx="10" ry="8" fill="#7aa454" opacity="0.7"/>' +
      '<ellipse cx="60" cy="42" rx="10" ry="8" fill="#7aa454" opacity="0.7"/>',
  ),
  'stepping-stone': baseSvg(
    [
      { offset: '0%', color: '#9a9285' },
      { offset: '100%', color: '#5a5247' },
    ],
    // 3 stones receding
    '<rect x="20" y="60" width="56" height="20" rx="4" fill="#bfb8a8"/>' +
      '<rect x="28" y="38" width="40" height="14" rx="3" fill="#a89e8e" opacity="0.85"/>' +
      '<rect x="34" y="22" width="28" height="10" rx="2" fill="#8e8474" opacity="0.7"/>',
  ),
  'garden-lantern': baseSvg(
    [
      { offset: '0%', color: '#1a1f3a' },
      { offset: '100%', color: '#0a0f1a' },
    ],
    // stake + glowing lamp head with halo
    '<rect x="46" y="40" width="4" height="44" fill="#1a1a1a"/>' +
      '<circle cx="48" cy="32" r="20" fill="#ffd9a0" opacity="0.18"/>' +
      '<circle cx="48" cy="32" r="14" fill="#ffd9a0" opacity="0.32"/>' +
      '<circle cx="48" cy="32" r="9" fill="#ffe7a8"/>',
  ),
  'pool-coping': baseSvg(
    [
      { offset: '0%', color: '#4a82a8' },
      { offset: '100%', color: '#1a4a78' },
    ],
    // pool with stone frame
    '<rect x="8" y="14" width="80" height="68" rx="4" fill="#cfc7b6"/>' +
      '<rect x="18" y="24" width="60" height="48" rx="2" fill="#2a78b8"/>' +
      '<path d="M22 36 Q34 32 48 36 T76 36" stroke="#aacde8" stroke-width="1.5" fill="none" opacity="0.7"/>' +
      '<path d="M22 50 Q34 46 48 50 T76 50" stroke="#aacde8" stroke-width="1.5" fill="none" opacity="0.5"/>',
  ),
}

/**
 * Resolves a thumbnail src — returns the inline SVG for procedural items,
 * falls back to the catalog's stored thumbnail path for GLB items.
 */
export function resolveItemThumbnail(item: { src: string; thumbnail: string }): string {
  if (item.src.startsWith('proc://')) {
    const id = item.src.slice('proc://'.length)
    return PROCEDURAL_THUMBNAILS[id] ?? item.thumbnail
  }
  return item.thumbnail
}
