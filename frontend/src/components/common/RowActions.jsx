import { Pencil, Trash2 } from 'lucide-react'

export function RowActions({ onEdit, onDelete }) {
  return (
    <div className="flex items-center justify-end gap-1">
      {onEdit && (
        <button type="button" className="p-1 text-foreground" aria-label="Edit" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" />
        </button>
      )}
      {onDelete && (
        <button type="button" className="p-1 text-foreground" aria-label="Delete" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
