'use client'

import { useViewer } from '@pascal-app/viewer'
import { motion } from 'motion/react'
import { type ReactNode, useCallback, useEffect, useRef } from 'react'
import { useIsMobile } from '../../hooks/use-mobile'
import { cn } from '../../lib/utils'
import useEditor from '../../store/use-editor'
import { useSidebarStore } from '../ui/primitives/sidebar'
import { type SidebarTab, TabBar } from '../ui/sidebar/tab-bar'

const SIDEBAR_MIN_WIDTH = 300
const SIDEBAR_MAX_WIDTH = 800
const SIDEBAR_COLLAPSE_THRESHOLD = 220

// ── Left column: resizable panel with tab bar ────────────────────────────────

function LeftColumn({
  tabs,
  renderTabContent,
  sidebarOverlay,
}: {
  tabs: SidebarTab[]
  renderTabContent: (tabId: string) => ReactNode
  sidebarOverlay?: ReactNode
}) {
  const width = useSidebarStore((s) => s.width)
  const isCollapsed = useSidebarStore((s) => s.isCollapsed)
  const setIsCollapsed = useSidebarStore((s) => s.setIsCollapsed)
  const setWidth = useSidebarStore((s) => s.setWidth)
  const isDragging = useSidebarStore((s) => s.isDragging)
  const setIsDragging = useSidebarStore((s) => s.setIsDragging)
  const activePanel = useEditor((s) => s.activeSidebarPanel)
  const setActivePanel = useEditor((s) => s.setActiveSidebarPanel)

  const isResizing = useRef(false)
  const isExpanding = useRef(false)

  // Ensure active panel is a valid tab
  useEffect(() => {
    if (tabs.length > 0 && !tabs.some((t) => t.id === activePanel)) {
      setActivePanel(tabs[0]!.id)
    }
  }, [tabs, activePanel, setActivePanel])

  // Leaving the items tab while furnishing should drop back to select mode
  useEffect(() => {
    if (activePanel === 'items') return
    const { phase, mode, setMode } = useEditor.getState()
    if (phase === 'furnish' && mode === 'build') {
      setMode('select')
    }
  }, [activePanel])

  const handleResizerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault()
      isResizing.current = true
      setIsDragging(true)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    },
    [setIsDragging],
  )

  const handleGrabDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault()
      isExpanding.current = true
      setIsDragging(true)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    },
    [setIsDragging],
  )

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (isResizing.current) {
        const newWidth = e.clientX
        if (newWidth < SIDEBAR_COLLAPSE_THRESHOLD) {
          setIsCollapsed(true)
        } else {
          setIsCollapsed(false)
          setWidth(Math.max(SIDEBAR_MIN_WIDTH, Math.min(newWidth, SIDEBAR_MAX_WIDTH)))
        }
      } else if (isExpanding.current && e.clientX > 60) {
        setIsCollapsed(false)
        setWidth(Math.max(SIDEBAR_MIN_WIDTH, Math.min(e.clientX, SIDEBAR_MAX_WIDTH)))
      }
    }
    const handlePointerUp = () => {
      isResizing.current = false
      isExpanding.current = false
      setIsDragging(false)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [setWidth, setIsCollapsed, setIsDragging])

  if (isCollapsed) {
    return (
      <div
        className="relative h-full w-2 flex-shrink-0 cursor-col-resize transition-colors hover:bg-primary/20"
        onPointerDown={handleGrabDown}
        title="Expand sidebar"
      />
    )
  }

  return (
    <div
      className="relative z-10 flex h-full flex-shrink-0 flex-col bg-sidebar text-sidebar-foreground"
      style={{
        width,
        transition: isDragging ? 'none' : 'width 150ms ease',
      }}
    >
      <TabBar activeTab={activePanel} onTabChange={setActivePanel} tabs={tabs} />
      <div className="relative flex flex-1 flex-col overflow-hidden">
        {renderTabContent(activePanel)}
        {sidebarOverlay && <div className="absolute inset-0 z-50">{sidebarOverlay}</div>}
      </div>

      {/* Resize handle + hit area */}
      <div
        className="absolute inset-y-0 -right-3 z-[100] flex w-6 cursor-col-resize items-center justify-center"
        onPointerDown={handleResizerDown}
      >
        <div className="h-8 w-1 rounded-full bg-neutral-500" />
      </div>
    </div>
  )
}

// ── Right column: viewer area with toolbar ───────────────────────────────────

function RightColumn({
  toolbarLeft,
  toolbarRight,
  children,
  overlays,
  isMobile = false,
}: {
  toolbarLeft?: ReactNode
  toolbarRight?: ReactNode
  children: ReactNode
  overlays?: ReactNode
  isMobile?: boolean
}) {
  const showcaseMode = useViewer((s) => s.showcaseMode)

  return (
    <div
      className="relative flex min-w-0 flex-1 flex-col overflow-hidden"
      style={{
        borderTopLeftRadius: isMobile ? 0 : 16,
        clipPath: isMobile ? 'none' : 'inset(0 0 0 0 round 16px 0 0 0)',
        boxShadow: isMobile
          ? 'none'
          : '-4px -2px 16px rgba(0, 0, 0, 0.08), -1px 0 4px rgba(0, 0, 0, 0.04)',
      }}
    >
      {/* Viewer toolbar */}
      {(toolbarLeft || toolbarRight) && (
        <div
          className={cn(
            'pointer-events-none absolute right-3 left-3 z-20 flex gap-2 transition-opacity duration-500',
            isMobile
              ? 'top-3 flex-col items-stretch'
              : 'top-3 items-center justify-between',
            showcaseMode && 'pointer-events-none opacity-0 hover:opacity-100',
          )}
        >
          <div
            className={cn(
              'pointer-events-auto flex gap-2',
              isMobile ? 'flex-wrap items-start' : 'items-center',
            )}
          >
            {toolbarLeft}
          </div>
          <div
            className={cn(
              'pointer-events-auto flex gap-2',
              isMobile
                ? 'no-scrollbar max-w-full items-center self-end overflow-x-auto'
                : 'items-center',
            )}
            style={isMobile ? { scrollbarWidth: 'none' } : undefined}
          >
            {toolbarRight}
          </div>
        </div>
      )}
      {/* Canvas area */}
      <div className="relative flex-1 overflow-hidden">{children}</div>
      {/* Overlays scoped to the viewer column */}
      {overlays && (
        <div
          className={cn(
            'pointer-events-none absolute inset-0 z-30 transition-opacity duration-500',
            showcaseMode && 'opacity-0',
          )}
          style={{ transform: 'translateZ(0)' }}
        >
          {overlays}
        </div>
      )}
      {/* Showcase exit hint */}
      {showcaseMode && <ShowcaseExitHint />}
    </div>
  )
}

function ShowcaseExitHint() {
  const setShowcase = useViewer((s) => s.setShowcaseMode)
  return (
    <button
      aria-label="Exit Showcase Mode"
      className="pointer-events-auto absolute top-4 right-4 z-50 flex items-center gap-1.5 rounded-full border border-white/15 bg-black/40 px-3 py-1.5 text-[11px] text-white/85 backdrop-blur-md transition-opacity hover:bg-black/55"
      onClick={() => setShowcase(false)}
      type="button"
    >
      <span className="font-medium">Showcase</span>
      <span className="opacity-60">— click to exit</span>
    </button>
  )
}

// ── Main v2 layout ───────────────────────────────────────────────────────────

export interface EditorLayoutV2Props {
  navbarSlot?: ReactNode
  sidebarTabs?: SidebarTab[]
  renderTabContent: (tabId: string) => ReactNode
  sidebarOverlay?: ReactNode
  viewerToolbarLeft?: ReactNode
  viewerToolbarRight?: ReactNode
  viewerContent: ReactNode
  overlays?: ReactNode
}

export function EditorLayoutV2({
  navbarSlot,
  sidebarTabs = [],
  renderTabContent,
  sidebarOverlay,
  viewerToolbarLeft,
  viewerToolbarRight,
  viewerContent,
  overlays,
}: EditorLayoutV2Props) {
  const isMobile = useIsMobile()
  const activePanel = useEditor((s) => s.activeSidebarPanel)
  const setActivePanel = useEditor((s) => s.setActiveSidebarPanel)

  useEffect(() => {
    if (sidebarTabs.length > 0 && !sidebarTabs.some((tab) => tab.id === activePanel)) {
      setActivePanel(sidebarTabs[0]!.id)
    }
  }, [activePanel, setActivePanel, sidebarTabs])

  // Showcase mode: fade non-essential UI to give cinematic focus to the scene.
  // Keeps the canvas fully interactive but quiets the chrome.
  const showcaseMode = useViewer((s) => s.showcaseMode)

  return (
    <div
      className={cn(
        'dark flex h-full w-full flex-col bg-sidebar text-foreground transition-opacity duration-500',
      )}
      data-showcase={showcaseMode ? 'on' : 'off'}
    >
      {/* Top navbar */}
      <div
        className={cn(
          'transition-opacity duration-500',
          showcaseMode ? 'pointer-events-none opacity-0' : 'opacity-100',
        )}
      >
        {navbarSlot}
      </div>

      {/* Main content: left column + right column */}
      <div className="flex min-h-0 flex-1">
        {!isMobile && sidebarTabs.length > 0 && (
          <div
            className={cn(
              'flex transition-all duration-500',
              showcaseMode ? 'pointer-events-none -translate-x-2 opacity-0' : 'opacity-100',
            )}
            style={{ width: showcaseMode ? 0 : undefined, overflow: showcaseMode ? 'hidden' : undefined }}
          >
            <LeftColumn
              renderTabContent={renderTabContent}
              sidebarOverlay={sidebarOverlay}
              tabs={sidebarTabs}
            />
          </div>
        )}
        <RightColumn
          isMobile={isMobile}
          overlays={overlays}
          toolbarLeft={viewerToolbarLeft}
          toolbarRight={viewerToolbarRight}
        >
          {viewerContent}
        </RightColumn>
      </div>

      {isMobile && sidebarTabs.length > 0 && (
        <div className="pointer-events-none fixed right-3 bottom-3 left-3 z-40 flex flex-col gap-3">
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="pointer-events-auto overflow-hidden rounded-lg border border-border/80 bg-sidebar/96 shadow-2xl backdrop-blur-md"
            initial={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            <div className="max-h-[42vh] overflow-y-auto">
              {renderTabContent(activePanel)}
              {sidebarOverlay && <div className="border-border/60 border-t">{sidebarOverlay}</div>}
            </div>
            <div className="border-border/70 border-t px-2 py-2">
              <TabBar activeTab={activePanel} onTabChange={setActivePanel} tabs={sidebarTabs} />
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
