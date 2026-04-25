'use client'

import { AnimatePresence, motion } from 'motion/react'
import { TooltipProvider } from './../../../components/ui/primitives/tooltip'
import { useIsMobile } from './../../../hooks/use-mobile'
import { useReducedMotion } from './../../../hooks/use-reduced-motion'
import { cn } from './../../../lib/utils'
import useEditor from './../../../store/use-editor'
import { ItemCatalog } from '../item-catalog/item-catalog'
import { CameraActions } from './camera-actions'
import { ControlModes } from './control-modes'
import { FurnishTools } from './furnish-tools'
import { StructureTools } from './structure-tools'
import { ViewToggles } from './view-toggles'

export function ActionMenu({ className }: { className?: string }) {
  const phase = useEditor((state) => state.phase)
  const mode = useEditor((state) => state.mode)
  const tool = useEditor((state) => state.tool)
  const catalogCategory = useEditor((state) => state.catalogCategory)
  const isMobile = useIsMobile()
  const reducedMotion = useReducedMotion()
  const transition = reducedMotion
    ? { duration: 0 }
    : { type: 'spring' as const, bounce: 0.2, duration: 0.4 }

  return (
    <TooltipProvider>
      <motion.div
        className={cn(
          'fixed z-50 border border-border bg-background/90 shadow-2xl backdrop-blur-md',
          isMobile
            ? 'right-3 bottom-[calc(env(safe-area-inset-bottom)+5.6rem)] left-3 translate-x-0 rounded-lg'
            : 'bottom-6 left-1/2 -translate-x-1/2 rounded-2xl',
          'transition-colors duration-200 ease-out',
          className,
        )}
        layout
        transition={transition}
      >
        {/* Item Catalog Row - Only show when in build mode with item tool */}
        <AnimatePresence>
          {mode === 'build' && tool === 'item' && catalogCategory && (
            <motion.div
              animate={{
                opacity: 1,
                maxHeight: 160,
                paddingTop: 8,
                paddingBottom: 8,
                borderBottomWidth: 1,
              }}
              className={cn(
                'overflow-hidden border-border border-b',
                isMobile ? 'px-3 py-3' : 'px-2 py-2',
              )}
              exit={{
                opacity: 0,
                maxHeight: 0,
                paddingTop: 0,
                paddingBottom: 0,
                borderBottomWidth: 0,
              }}
              initial={{
                opacity: 0,
                maxHeight: 0,
                paddingTop: 0,
                paddingBottom: 0,
                borderBottomWidth: 0,
              }}
              transition={transition}
            >
              <ItemCatalog category={catalogCategory} key={catalogCategory} />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {phase === 'furnish' && mode === 'build' && (
            <motion.div
              animate={{
                opacity: 1,
                maxHeight: 80,
                paddingTop: 8,
                paddingBottom: 8,
                borderBottomWidth: 1,
              }}
              className={cn(
                'overflow-hidden border-border opacity-100',
                isMobile ? 'max-h-24 border-b px-3 py-3' : 'max-h-20 border-b px-2 py-2',
              )}
              exit={{
                opacity: 0,
                maxHeight: 0,
                paddingTop: 0,
                paddingBottom: 0,
                borderBottomWidth: 0,
              }}
              initial={{
                opacity: 0,
                maxHeight: 0,
                paddingTop: 0,
                paddingBottom: 0,
                borderBottomWidth: 0,
              }}
              transition={transition}
            >
              <div className={cn('mx-auto', isMobile ? 'w-full' : 'w-max')}>
                <FurnishTools />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Structure Tools Row - Animated */}
        <AnimatePresence>
          {phase === 'structure' && mode === 'build' && (
            <motion.div
              animate={{
                opacity: 1,
                maxHeight: 80,
                paddingTop: 8,
                paddingBottom: 8,
                borderBottomWidth: 1,
              }}
              className={cn(
                'overflow-hidden border-border border-b',
                isMobile ? 'max-h-24 px-3 py-3' : 'max-h-20 px-2 py-2',
              )}
              exit={{
                opacity: 0,
                maxHeight: 0,
                paddingTop: 0,
                paddingBottom: 0,
                borderBottomWidth: 0,
              }}
              initial={{
                opacity: 0,
                maxHeight: 0,
                paddingTop: 0,
                paddingBottom: 0,
                borderBottomWidth: 0,
              }}
              transition={transition}
            >
              <div className={cn(isMobile ? 'w-full' : 'w-max')}>
                <StructureTools />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Control Mode Row - Always visible, centered */}
        <div
          className={cn(
            'flex items-center justify-center gap-1',
            isMobile ? 'flex-wrap px-3 py-2.5' : 'px-2 py-1.5',
          )}
        >
          <ControlModes />
          <div className="mx-1 h-5 w-px bg-border" />
          <ViewToggles />
          <div className="mx-1 h-5 w-px bg-border" />
          <CameraActions />
        </div>
      </motion.div>
    </TooltipProvider>
  )
}
