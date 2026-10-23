import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog'

const ConfirmContext = createContext(null)

export function ConfirmProvider({ children }) {
  const [request, setRequest] = useState(null)
  const resolver = useRef(null)

  const confirm = useCallback((options) => {
    const opts = typeof options === 'string' ? { description: options } : (options || {})
    return new Promise((resolve) => {
      resolver.current = resolve
      setRequest({
        title: opts.title || 'Confirm delete',
        description: opts.description || 'This cannot be undone.',
        confirmLabel: opts.confirmLabel || 'Delete',
        cancelLabel: opts.cancelLabel || 'Cancel',
      })
    })
  }, [])

  const close = (value) => {
    resolver.current?.(value)
    resolver.current = null
    setRequest(null)
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog open={Boolean(request)} onOpenChange={(open) => { if (!open) close(false) }}>
        <DialogContent className="max-w-[440px]">
          <div className="flex gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Trash2 className="h-5 w-5" />
            </div>
            <DialogHeader className="space-y-1 text-left">
              <DialogTitle>{request?.title}</DialogTitle>
              <DialogDescription>{request?.description}</DialogDescription>
            </DialogHeader>
          </div>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => close(false)}>{request?.cancelLabel}</Button>
            <Button type="button" onClick={() => close(true)}>{request?.confirmLabel}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const confirm = useContext(ConfirmContext)
  if (!confirm) {
    throw new Error('useConfirm must be used within a ConfirmProvider')
  }
  return confirm
}
