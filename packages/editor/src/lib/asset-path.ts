const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

export function assetPath(path: string): string {
  if (!path) return path
  if (path.startsWith('http://') || path.startsWith('https://')) return path

  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${basePath}${normalizedPath}`
}
