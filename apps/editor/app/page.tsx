'use client'

import { Editor, type SidebarTab, ViewerToolbarLeft, ViewerToolbarRight } from '@pascal-app/editor'
import { useViewer } from '@pascal-app/viewer'
import { useEffect } from 'react'

const SIDEBAR_TABS: (SidebarTab & { component: React.ComponentType })[] = [
  {
    id: 'site',
    label: 'Plan',
    component: () => null, // Built-in SitePanel handles this
  },
]

export default function Home() {
  // Outdoor app — force outdoorMode on. If a previous session persisted
  // outdoorMode=false the outdoor-only toolbar (Projects, Starters, Mood,
  // Time-of-day) would silently disappear; this guarantees the project
  // controls are always visible in this app.
  useEffect(() => {
    if (!useViewer.getState().outdoorMode) {
      useViewer.getState().setOutdoorMode(true)
    }
  }, [])

  return (
    <div className="h-screen w-screen">
      <Editor
        layoutVersion="v2"
        projectId="roses-outdoor-designs"
        sidebarTabs={SIDEBAR_TABS}
        viewerToolbarLeft={<ViewerToolbarLeft />}
        viewerToolbarRight={<ViewerToolbarRight />}
      />
    </div>
  )
}
