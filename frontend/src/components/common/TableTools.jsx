import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Search } from 'lucide-react'
import { TableHead } from '../ui/table'

export function useTableTools(rows, searchKeys) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState({ key: '', direction: 'asc' })
  const keys = searchKeys.join('|')

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const searchable = keys ? keys.split('|') : []
    let next = rows || []
    if (needle) {
      next = next.filter((row) => searchable.some((key) => String(row?.[key] ?? '').toLowerCase().includes(needle)))
    }
    if (!sort.key) return next
    const direction = sort.direction === 'asc' ? 1 : -1
    return [...next].sort((left, right) => {
      const a = left?.[sort.key]
      const b = right?.[sort.key]
      const aNumber = Number(a)
      const bNumber = Number(b)
      const numeric = a !== '' && b !== '' && Number.isFinite(aNumber) && Number.isFinite(bNumber)
      const compared = numeric
        ? aNumber - bNumber
        : String(a ?? '').localeCompare(String(b ?? ''), undefined, { numeric: true, sensitivity: 'base' })
      return compared * direction
    })
  }, [rows, query, sort, keys])

  const toggleSort = (key) => {
    setSort((current) => (
      current.key === key
        ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' }
    ))
  }

  return { query, setQuery, sort, toggleSort, rows: filtered }
}

export function TableSearch({ value, onChange, placeholder = 'Search' }) {
  return (
    <div className="relative w-56">
      <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-8 w-full border border-input bg-background pl-7 pr-2 text-xs"
      />
    </div>
  )
}

export function SortHead({ label, column, sort, onSort, className = '' }) {
  const active = sort.key === column
  const Icon = sort.direction === 'desc' ? ArrowDown : ArrowUp
  return (
    <TableHead className={className}>
      <button type="button" className="inline-flex items-center gap-1" onClick={() => onSort(column)}>
        {label}
        {active && <Icon className="h-3 w-3" />}
      </button>
    </TableHead>
  )
}
