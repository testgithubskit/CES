import { Pencil, Trash2 } from 'lucide-react'
import { Hint } from '../ui/tooltip'

export function RowActions({ onEdit, onDelete }) {
  return (
    <div className="flex items-center justify-end gap-0.5">
      {onEdit && (
        <Hint label="Edit">
          <button type="button" className="rounded-md p-1.5 text-foreground transition-colors hover:bg-accent" aria-label="Edit" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
          </button>
        </Hint>
      )}
      {onDelete && (
        <Hint label="Delete">
          <button type="button" className="rounded-md p-1.5 text-foreground transition-colors hover:bg-accent" aria-label="Delete" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </Hint>
      )}
    </div>
  )
}
