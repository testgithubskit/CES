import { useEffect, useMemo, useState } from 'react'
import { Button } from '../ui/button'

export function pageSizeForHeight(offset = 250, rowHeight = 36) {
  if (typeof window === 'undefined') return 12
  return Math.max(8, Math.floor((window.innerHeight - offset) / rowHeight))
}

export function usePage(items, offset = 250) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(() => pageSizeForHeight(offset))

  useEffect(() => {
    const update = () => setPageSize(pageSizeForHeight(offset))
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [offset])

  const pages = Math.max(1, Math.ceil((items?.length || 0) / pageSize))
  const current = Math.min(page, pages)
  const rows = useMemo(() => {
    const start = (current - 1) * pageSize
    return items.slice(start, start + pageSize)
  }, [items, current, pageSize])

  return { rows, page: current, pages, total: items.length, pageSize, setPage }
}

export function useMeasuredPage(items, containerRef, rowHeight = 32, headerHeight = 44) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(12)

  useEffect(() => {
    const node = containerRef.current
    if (!node) return undefined
    const measure = () => {
      const available = node.clientHeight - headerHeight
      setPageSize(Math.max(1, Math.floor(available / rowHeight)))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [containerRef, rowHeight, headerHeight])

  const pages = Math.max(1, Math.ceil((items?.length || 0) / pageSize))
  const current = Math.min(page, pages)
  const rows = useMemo(() => {
    const start = (current - 1) * pageSize
    return (items || []).slice(start, start + pageSize)
  }, [items, current, pageSize])

  return { rows, page: current, pages, total: items?.length || 0, pageSize, setPage }
}

export function TablePager({ page, pages, total, onPage, extra = null }) {
  return (
    <div className="flex items-center justify-between border-t border-border px-3 py-2 text-sm">
      <span className="text-muted-foreground">{total} total</span>
      <div className="flex items-center gap-2">
        {extra}
        <Button type="button" variant="outline" className="h-7 px-2" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</Button>
        <span>Page {page} of {pages}</span>
        <Button type="button" variant="outline" className="h-7 px-2" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</Button>
      </div>
    </div>
  )
}
