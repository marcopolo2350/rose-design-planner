'use client'

import { Icon } from '@iconify/react'
import { Copy, Move, Spline, Trash2 } from 'lucide-react'
import type { MouseEventHandler, PointerEventHandler, ReactNode } from 'react'
import { useIsMobile } from '../../hooks/use-mobile'
import { cn } from '../../lib/utils'

type NodeActionMenuProps = {
  onAddHole?: MouseEventHandler<HTMLButtonElement>
  onDelete?: MouseEventHandler<HTMLButtonElement>
  onDuplicate?: MouseEventHandler<HTMLButtonElement>
  onMove?: MouseEventHandler<HTMLButtonElement>
  onCurve?: MouseEventHandler<HTMLButtonElement>
  onPointerDown?: PointerEventHandler<HTMLDivElement>
  onPointerUp?: PointerEventHandler<HTMLDivElement>
  onPointerEnter?: PointerEventHandler<HTMLDivElement>
  onPointerLeave?: PointerEventHandler<HTMLDivElement>
}

export function NodeActionMenu({
  onAddHole,
  onDelete,
  onDuplicate,
  onMove,
  onCurve,
  onPointerDown,
  onPointerUp,
  onPointerEnter,
  onPointerLeave,
}: NodeActionMenuProps) {
  const isMobile = useIsMobile()

  const actionButton = (
    label: string,
    icon: ReactNode,
    onClick: MouseEventHandler<HTMLButtonElement>,
    tone: 'default' | 'destructive' = 'default',
  ) => (
    <button
      aria-label={label}
      className={cn(
        'tooltip-trigger rounded-md transition-colors',
        isMobile
          ? 'inline-flex min-h-11 min-w-[4.75rem] items-center justify-center gap-1.5 px-3 py-2 text-sm'
          : 'p-1.5',
        tone === 'destructive'
          ? 'text-muted-foreground hover:bg-destructive/10 hover:text-destructive'
          : 'text-muted-foreground hover:bg-accent hover:text-foreground',
      )}
      onClick={onClick}
      title={label}
      type="button"
    >
      {icon}
      {isMobile && <span className="font-medium text-[12px]">{label}</span>}
    </button>
  )

  return (
    <div
      className={cn(
        'pointer-events-auto rounded-lg border border-border bg-background/95 shadow-xl backdrop-blur-md',
        isMobile ? 'flex flex-wrap items-center gap-1.5 p-1.5' : 'flex items-center gap-1 p-1',
      )}
      onPointerDown={onPointerDown}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onPointerUp={onPointerUp}
    >
      {onMove && (
        actionButton('Move', <Move className="h-4 w-4" />, onMove)
      )}
      {onCurve && (
        actionButton('Curve', <Spline className="h-4 w-4" />, onCurve)
      )}
      {onDuplicate && (
        actionButton('Copy', <Copy className="h-4 w-4" />, onDuplicate)
      )}
      {onAddHole && (
        actionButton('Cut Out', <Icon height={16} icon="carbon:cut-out" width={16} />, onAddHole)
      )}
      {onDelete && (
        actionButton('Delete', <Trash2 className="h-4 w-4" />, onDelete, 'destructive')
      )}
    </div>
  )
}
