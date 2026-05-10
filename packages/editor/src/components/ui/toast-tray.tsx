'use client'

import { Icon as IconifyIcon } from '@iconify/react'
import { cn } from '../../lib/utils'
import { useToast } from '../../lib/use-toast'

/**
 * Visible toast tray — fixed-position container that renders queued
 * toasts at the bottom-center on desktop and bottom-center on mobile.
 * Auto-dismisses via the store's setTimeout; user can also click to
 * dismiss early.
 */
export function ToastTray() {
  const toasts = useToast((s) => s.toasts)
  const dismiss = useToast((s) => s.dismiss)

  if (toasts.length === 0) return null

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-6 z-[90] flex flex-col items-center gap-2"
    >
      {toasts.map((t) => (
        <button
          aria-label={`Dismiss notification: ${t.message}`}
          className={cn(
            'pointer-events-auto flex items-center gap-2 rounded-full border px-4 py-2 font-medium text-[13px] shadow-2xl backdrop-blur-md transition-opacity',
            t.variant === 'success'
              ? 'border-emerald-400/30 bg-emerald-950/85 text-emerald-100'
              : t.variant === 'error'
                ? 'border-red-400/30 bg-red-950/85 text-red-100'
                : 'border-white/15 bg-neutral-900/85 text-white',
          )}
          key={t.id}
          onClick={() => dismiss(t.id)}
          type="button"
        >
          <IconifyIcon
            height={14}
            icon={
              t.variant === 'success'
                ? 'lucide:check-circle-2'
                : t.variant === 'error'
                  ? 'lucide:alert-circle'
                  : 'lucide:info'
            }
            width={14}
          />
          <span>{t.message}</span>
        </button>
      ))}
    </div>
  )
}
