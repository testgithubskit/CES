import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Columns3, Download, Settings2 } from 'lucide-react'
import { Button } from '../ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog'
import { RowActions } from './RowActions'
import { customFieldsService } from '../../services/api/customFields'
import { downloadExcel, downloadPdf } from './tableExport'
import { Hint, Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip'

const emptyColumn = { label: '', field_type: 'text', max_length: '40' }

function errorMessage(error, fallback) {
  const detail = error.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) return detail.map((item) => item.msg).join(', ')
  return fallback
}

export function useEntityFields(entityType) {
  const [fields, setFields] = useState([])
  const reload = async () => {
    const data = await customFieldsService.list(entityType)
    setFields(Array.isArray(data) ? data : [])
  }
  useEffect(() => {
    reload().catch((error) => toast.error(errorMessage(error, 'Failed to load columns')))
  }, [entityType])
  return { fields, reload }
}

export function useShownColumns(storageKey, columns) {
  const [hidden, setHidden] = useState(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem(storageKey) || '[]'))
    } catch {
      return new Set()
    }
  })

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify([...hidden]))
  }, [hidden, storageKey])

  const visible = useMemo(() => columns.filter((column) => !hidden.has(column.key)), [columns, hidden])

  const toggle = (key) => {
    setHidden((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else if (columns.filter((column) => !next.has(column.key)).length > 1) next.add(key)
      return next
    })
  }

  return { visible, toggle, isShown: (key) => !hidden.has(key) }
}

export function keepWithin(value, max, label, setNote) {
  if (value.length <= max) {
    setNote('')
    return value
  }
  setNote(`${label} can be at most ${max} characters`)
  return value.slice(0, max)
}

export function CustomFieldInputs({ fields, values, onChange }) {
  const [note, setNote] = useState('')
  if (!fields.length) return null
  return (
    <>
      {fields.map((field) => (
        <div key={field.id} className="space-y-1.5">
          <Label htmlFor={`custom-${field.id}`}>{field.label}</Label>
          <Input
            id={`custom-${field.id}`}
            inputMode={field.field_type === 'number' ? 'decimal' : 'text'}
            value={values[field.field_key] || ''}
            onChange={(event) => {
              const raw = event.target.value
              if (field.field_type === 'number' && raw && !/^-?\d*\.?\d*$/.test(raw)) return
              const next = field.field_type === 'text' ? keepWithin(raw, field.max_length, field.label, setNote) : raw
              onChange({ ...values, [field.field_key]: next })
            }}
          />
        </div>
      ))}
      {note && <p className="col-span-2 text-xs text-muted-foreground">{note}</p>}
    </>
  )
}

export function TableToolsMenu({
  entityType,
  isAdmin,
  fields,
  onFields,
  columns,
  isShown,
  onToggle,
  rows,
  title,
}) {
  const [showOpen, setShowOpen] = useState(false)
  const [manageOpen, setManageOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [drafts, setDrafts] = useState([emptyColumn])
  const [picked, setPicked] = useState([])
  const visible = columns.filter((column) => isShown(column.key))

  const columnPayload = (row) => ({
    label: row.label.trim(),
    field_type: row.field_type,
    max_length: row.field_type === 'number' ? 40 : Number(row.max_length || 40),
  })

  const saveColumn = async (event) => {
    event.preventDefault()
    const rows = editing ? [drafts[0]] : drafts
    if (rows.some((row) => !row.label.trim())) {
      toast.error('Enter a column name')
      return
    }
    try {
      if (editing) await customFieldsService.update(entityType, editing.id, columnPayload(rows[0]))
      else {
        for (const row of rows) await customFieldsService.create(entityType, columnPayload(row))
      }
      setEditing(null)
      setDrafts([emptyColumn])
      await onFields()
      toast.success(editing ? 'Column updated' : rows.length > 1 ? 'Columns added' : 'Column added')
    } catch (error) {
      toast.error(errorMessage(error, 'Failed to save column'))
    }
  }

  const removeColumn = async (field) => {
    if (!confirm(`Delete the ${field.label} column from every record?`)) return
    try {
      await customFieldsService.remove(entityType, field.id)
      setPicked((current) => current.filter((id) => id !== field.id))
      await onFields()
      toast.success('Column deleted')
    } catch (error) {
      toast.error(errorMessage(error, 'Failed to delete column'))
    }
  }

  const removePicked = async () => {
    if (!picked.length) return
    if (!confirm(`Delete ${picked.length} custom column${picked.length === 1 ? '' : 's'} from every record?`)) return
    try {
      for (const id of picked) await customFieldsService.remove(entityType, id)
      setPicked([])
      await onFields()
      toast.success('Columns deleted')
    } catch (error) {
      toast.error(errorMessage(error, 'Failed to delete columns'))
    }
  }

  const togglePicked = (id) => {
    setPicked((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
  }

  return (
    <>
      <Hint label="Show columns">
        <button type="button" className="flex h-8 w-8 items-center justify-center rounded-lg border border-border transition-colors hover:bg-accent" aria-label="Show columns" onClick={() => setShowOpen(true)}>
          <Columns3 className="h-4 w-4" />
        </button>
      </Hint>
      {isAdmin && (
        <Hint label="Custom columns">
          <button type="button" className="flex h-8 w-8 items-center justify-center rounded-lg border border-border transition-colors hover:bg-accent" aria-label="Columns" onClick={() => { setManageOpen(true); setEditing(null); setDrafts([emptyColumn]) }}>
            <Settings2 className="h-4 w-4" />
          </button>
        </Hint>
      )}
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <button type="button" className="flex h-8 w-8 items-center justify-center rounded-lg border border-border transition-colors hover:bg-accent" aria-label="Export">
                <Download className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>Export</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => downloadPdf(title, visible, rows)}>PDF</DropdownMenuItem>
          <DropdownMenuItem onClick={() => downloadExcel(title, visible, rows)}>Excel</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showOpen} onOpenChange={setShowOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading">Show columns</DialogTitle>
          </DialogHeader>
          <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
            {columns.map((column) => (
              <label key={column.key} className="flex h-6 items-center gap-2 text-sm">
                <input type="checkbox" checked={isShown(column.key)} onChange={() => onToggle(column.key)} />
                {column.label}
              </label>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading">Custom columns</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">Built-in columns stay in place. Added columns can be renamed or removed.</p>
          <div className="max-h-48 overflow-y-auto border border-border">
            {fields.length === 0 ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">No added columns yet</p>
            ) : (
              <>
                <div className="flex h-8 items-center justify-between border-b border-border px-2 text-sm">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={picked.length === fields.length}
                      onChange={() => setPicked(picked.length === fields.length ? [] : fields.map((field) => field.id))}
                    />
                    Select custom columns
                  </label>
                  <button type="button" className="text-xs font-bold disabled:text-muted-foreground" disabled={!picked.length} onClick={removePicked}>
                    Delete selected
                  </button>
                </div>
                {fields.map((field) => (
                  <div key={field.id} className="flex h-8 items-center justify-between border-b border-border px-2 text-sm last:border-b-0">
                    <label className="flex min-w-0 items-center gap-2">
                      <input type="checkbox" checked={picked.includes(field.id)} onChange={() => togglePicked(field.id)} />
                      <span className="truncate">{field.label} · {field.field_type}{field.field_type === 'text' ? ` · ${field.max_length}` : ''}</span>
                    </label>
                    <RowActions
                      onEdit={() => {
                        setEditing(field)
                        setDrafts([{ label: field.label, field_type: field.field_type, max_length: String(field.max_length) }])
                      }}
                      onDelete={() => removeColumn(field)}
                    />
                  </div>
                ))}
              </>
            )}
          </div>
          <form onSubmit={saveColumn} className="space-y-3">
            {drafts.map((row, index) => (
              <div key={index} className="grid grid-cols-2 gap-3 border border-border p-3">
                <div className="space-y-1.5">
                  <Label>Column name</Label>
                  <Input value={row.label} maxLength={40} onChange={(event) => setDrafts((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item))} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <select className="flex h-9 w-full border border-input bg-background px-3 text-sm" value={row.field_type} onChange={(event) => setDrafts((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, field_type: event.target.value } : item))}>
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                  </select>
                </div>
                {row.field_type === 'text' && (
                  <div className="space-y-1.5">
                    <Label>Character limit</Label>
                    <Input type="number" min="1" max="120" value={row.max_length} onChange={(event) => setDrafts((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, max_length: event.target.value } : item))} />
                  </div>
                )}
                {!editing && drafts.length > 1 && (
                  <div className="flex items-end">
                    <Button type="button" variant="outline" onClick={() => setDrafts((current) => current.filter((_, itemIndex) => itemIndex !== index))}>Remove</Button>
                  </div>
                )}
              </div>
            ))}
            {!editing && (
              <Button type="button" variant="outline" onClick={() => setDrafts((current) => [...current, emptyColumn])}>Add another</Button>
            )}
            <DialogFooter>
              <Button type="submit">{editing ? 'Update column' : 'Add columns'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
