import { Html } from '@react-three/drei'
import { useFrame, type ThreeElements } from '@react-three/fiber'
import { forwardRef, useRef } from 'react'
import type { Group, Mesh } from 'three'
import { furnishTools } from '../../../components/ui/action-menu/furnish-tools'
import { tools } from '../../../components/ui/action-menu/structure-tools'
import { EDITOR_LAYER } from '../../../lib/constants'
import useEditor from '../../../store/use-editor'

interface CursorSphereProps extends Omit<ThreeElements['group'], 'ref'> {
  color?: string
  depthWrite?: boolean
  showTooltip?: boolean
  height?: number
  /** Custom tooltip content — overrides the auto-detected build tool icon */
  tooltipContent?: React.ReactNode
}

export const CursorSphere = forwardRef<Group, CursorSphereProps>(function CursorSphere(
  { color = '#818cf8', showTooltip = true, height = 2.5, visible = true, tooltipContent, ...props },
  ref,
) {
  const centerRef = useRef<Mesh>(null)
  const ringRef = useRef<Mesh>(null)
  const lineRef = useRef<Mesh>(null)
  const tool = useEditor((s) => s.tool)
  const mode = useEditor((s) => s.mode)
  const catalogCategory = useEditor((s) => s.catalogCategory)
  const isFloorplanHovered = useEditor((s) => s.isFloorplanHovered)

  // Find the icon for the current tool
  let activeToolConfig = null
  if (mode === 'build' && tool) {
    if (tool === 'item' && catalogCategory) {
      activeToolConfig = furnishTools.find((t) => t.catalogCategory === catalogCategory)
    } else {
      activeToolConfig = tools.find((t) => t.id === tool)
    }
  }

  const isVisible = visible && !isFloorplanHovered

  useFrame(({ clock }) => {
    const pulse = 1 + Math.sin(clock.elapsedTime * 4.5) * 0.08
    const glowPulse = 1 + Math.sin(clock.elapsedTime * 3.2) * 0.12

    if (centerRef.current) {
      centerRef.current.scale.setScalar(pulse)
    }

    if (ringRef.current) {
      ringRef.current.scale.setScalar(glowPulse)
    }

    if (lineRef.current) {
      lineRef.current.scale.y = 1 + Math.sin(clock.elapsedTime * 2.8) * 0.04
    }
  })

  return (
    <group ref={ref} {...props} visible={isVisible}>
      {/* Flat marker on the ground */}
      <group rotation={[-Math.PI / 2, 0, 0]}>
        {/* Center dot */}
        <mesh layers={EDITOR_LAYER} ref={centerRef} renderOrder={2}>
          <circleGeometry args={[0.06, 32]} />
          <meshBasicMaterial color={color} depthTest depthWrite={false} opacity={0.9} transparent />
        </mesh>

        {/* Outer ring / glow */}
        <mesh layers={EDITOR_LAYER} ref={ringRef} renderOrder={2}>
          <circleGeometry args={[0.16, 32]} />
          <meshBasicMaterial
            color={color}
            depthTest
            depthWrite={false}
            opacity={0.18}
            transparent
          />
        </mesh>
      </group>

      {/* Vertical line */}
      {height > 0 && (
        <mesh
          layers={EDITOR_LAYER}
          position={[0, height / 2, 0]}
          ref={lineRef}
          renderOrder={2}
        >
          <cylinderGeometry args={[0.01, 0.01, height, 8]} />
          <meshBasicMaterial
            color={color}
            depthTest
            depthWrite={false}
            opacity={0.55}
            transparent
          />
        </mesh>
      )}

      {/* Tool Icon Tooltip at the top of the line */}
      {isVisible && showTooltip && (activeToolConfig || tooltipContent) && (
        <Html
          center
          position={[0, height > 0 ? height + 0.2 : 0.6, 0]}
          style={{
            pointerEvents: 'none',
            background: '#18181b', // zinc-900
            padding: '6px',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.05)',
            boxShadow: '0 8px 16px -4px rgba(0, 0, 0, 0.3), 0 4px 8px -4px rgba(0, 0, 0, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
          }}
        >
          {tooltipContent || (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt={activeToolConfig!.label}
              src={activeToolConfig!.iconSrc}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.5))',
              }}
            />
          )}
        </Html>
      )}
    </group>
  )
})
