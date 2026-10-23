import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { ClearFilter } from './TableTools'

export function SearchSelect({
  options,
  value,
  onChange,
  query,
  onQueryChange,
  placeholder = 'Search',
  allLabel = 'All',
}) {
  const [open, setOpen] = useState(false)
  const box = useRef(null)
  const selected = options.filter((option) => value.includes(String(option.value)) || value.includes(option.value))
  const needle = query.trim().toLowerCase()
  const filtered = options.filter((option) => !needle || option.label.toLowerCase().includes(needle))
  const closedLabel = selected.length === 0
    ? ''
    : selected.length === 1
      ? selected[0].label
      : `${selected.length} selected`

  useEffect(() => {
    const close = (event) => {
      if (!box.current?.contains(event.target)) {
        setOpen(false)
        if (value.length) onQueryChange('')
      }
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [onQueryChange, value])

  const toggle = (optionValue) => {
    const exists = value.some((item) => String(item) === String(optionValue))
    onChange(exists ? value.filter((item) => String(item) !== String(optionValue)) : [...value, optionValue])
  }

  return (
    <div ref={box} className="relative w-72">
      <div className="flex h-8 items-center border border-input bg-background">
        <input
          value={open ? query : closedLabel}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            onQueryChange(event.target.value)
            setOpen(true)
          }}
          placeholder={placeholder}
          className="h-full min-w-0 flex-1 bg-transparent px-2 text-xs outline-none"
        />
        <ClearFilter
          show={Boolean(value.length || query)}
          onClear={() => {
            onChange([])
            onQueryChange('')
            setOpen(false)
          }}
        />
        <button type="button" className="px-1.5 text-muted-foreground" aria-label="Open list" onClick={() => setOpen((current) => !current)}>
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>
      {open && (
        <div className="absolute z-50 mt-1 max-h-56 w-full overflow-auto border border-border bg-background shadow-sm">
          <button
            type="button"
            className="block w-full px-2 py-1.5 text-left text-xs hover:bg-accent"
            onClick={() => {
              onChange([])
              onQueryChange('')
            }}
          >
            {allLabel}
          </button>
          {filtered.length === 0 ? (
            <p className="px-2 py-1.5 text-xs text-muted-foreground">No matches</p>
          ) : filtered.map((option) => {
            const checked = value.some((item) => String(item) === String(option.value))
            return (
              <button
                key={option.value}
                type="button"
                className={`flex w-full items-center gap-2 px-2 py-1.5 text-left text-xs hover:bg-accent ${checked ? 'bg-accent' : ''}`}
                onClick={() => toggle(option.value)}
              >
                <span className={`flex h-3.5 w-3.5 items-center justify-center border ${checked ? 'border-primary bg-primary text-primary-foreground' : 'border-input'}`}>
                  {checked && <Check className="h-3 w-3" />}
                </span>
                {option.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
