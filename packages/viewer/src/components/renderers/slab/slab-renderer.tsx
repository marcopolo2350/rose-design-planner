import { getMaterialPresetByRef, type SlabNode, useRegistry } from '@pascal-app/core'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { Mesh } from 'three'
import { useNodeEvents } from '../../../hooks/use-node-events'
import {
  applyMaterialPresetToMaterials,
  createMaterial,
  DEFAULT_SLAB_MATERIAL,
} from '../../../lib/materials'

export const SlabRenderer = ({ node }: { node: SlabNode }) => {
  const ref = useRef<Mesh>(null!)

  useRegistry(node.id, 'slab', ref)

  const handlers = useNodeEvents(node, 'slab')

  // Build a FRESH material per slab whenever its preset / override changes.
  // We deliberately bypass the global materialCache here because:
  //   1. The cache shares textures across slabs, but those textures are
  //      assigned ASYNCHRONOUSLY after creation — cloning a cached material
  //      before the texture lands silently produced an untextured slab on
  //      first paint, which read as "the floor change didn't apply."
  //   2. Each slab applies its own opacity/depthWrite/side overrides; we
  //      don't want those mutations to leak through the cache.
  // Texture assets themselves are still cached at the textureCache layer,
  // so this only allocates a Three material instance per slab — not a new
  // texture per slab.
  const material = useMemo(() => {
    let mat: THREE.MeshStandardMaterial
    const preset = getMaterialPresetByRef(node.materialPreset)
    if (preset) {
      mat = new THREE.MeshStandardMaterial()
      applyMaterialPresetToMaterials(mat, preset)
    } else if (node.material) {
      // Per-slab override material — clone so per-slab mutations below
      // don't affect the cached source.
      mat = createMaterial(node.material).clone()
    } else {
      mat = DEFAULT_SLAB_MATERIAL.clone()
    }

    // Slabs participate in the WebGPU MRT scene pass. Keeping them opaque
    // avoids pipeline variants that can fail when geometry is regenerated
    // while a transparent/custom material is attached.
    mat.transparent = false
    mat.opacity = 1
    mat.alphaMap = null
    mat.side = THREE.DoubleSide
    mat.depthWrite = true
    mat.needsUpdate = true

    return mat
  }, [
    node.material,
    node.material?.preset,
    node.material?.properties,
    node.material?.texture,
    node.materialPreset,
  ])

  useEffect(() => {
    return () => {
      material.dispose()
    }
  }, [material])

  return (
    <mesh
      castShadow
      receiveShadow
      ref={ref}
      {...handlers}
      material={material}
      visible={node.visible}
    >
      <boxGeometry args={[0, 0, 0]} />
    </mesh>
  )
}
