import { type ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  className?: string
}

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className={cn(
          'w-full max-w-lg rounded-card bg-surface-card p-6 shadow-lg',
          className,
        )}
      >
        {title && (
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-primary">{title}</h2>
            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-neutral-600"
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}