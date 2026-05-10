'use client'

import { create } from 'zustand'

/**
 * A tiny toast queue. Calling `showToast(msg)` enqueues a message that
 * the global <ToastTray /> renders for ~2.5 seconds before removing it.
 *
 * No deps, no library. Used for "Saved" confirmations after project
 * actions and similar lightweight feedback.
 */

export type Toast = {
  id: number
  message: string
  variant?: 'default' | 'success' | 'error'
}

type ToastStore = {
  toasts: Toast[]
  push: (message: string, variant?: Toast['variant']) => void
  dismiss: (id: number) => void
}

let nextId = 1

export const useToast = create<ToastStore>((set, get) => ({
  toasts: [],
  push: (message, variant = 'default') => {
    const id = nextId++
    set((s) => ({ toasts: [...s.toasts, { id, message, variant }] }))
    setTimeout(() => {
      get().dismiss(id)
    }, 2500)
  },
  dismiss: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

/** Convenience: fire a toast from anywhere */
export function showToast(message: string, variant?: Toast['variant']) {
  useToast.getState().push(message, variant)
}
