import { useState } from 'react'
import { FileDown, Plus, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import apiClient from '../../services/api/client'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog'
import { Input } from '../ui/input'

const emptyRow = () => ({
  operation_number: '',
  operation_name: '',
  setup_time: '00:00:00',
  cycle_time: '00:00',
  work_instructions: '',
  notes: '',
  operation_type: 'in_house',
  work_center_id: '',
  machine_id: '',
  selected: true,
})

function errorMessage(error, fallback) {
  const detail = error.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) return detail.map((item) => item.msg).join(', ')
  return fallback
}

export function BulkOperationsDialog({ open, partId, partName, workCenters, machines, onOpenChange, onCreated }) {
  const [rows, setRows] = useState([])
  const [busy, setBusy] = useState(false)
  const [over, setOver] = useState(false)

  const reset = () => setRows([])

  const readFile = async (file) => {
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.docx')) {
      toast.error('Upload a .docx file from the operations template')
      return
    }
    const form = new FormData()
    form.append('file', file)
    setBusy(true)
    try {
      const response = await apiClient.post('/api/v1/operations/parse-template', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setRows((response.data.rows || []).map((row) => ({ ...emptyRow(), ...row, selected: true })))
      toast.success(`${response.data.count} operations extracted`)
    } catch (error) {
      toast.error(errorMessage(error, 'Failed to read the document'))
    } finally {
      setBusy(false)
    }
  }

  const update = (index, patch) => {
    setRows((current) => current.map((row, rowIndex) => {
      if (rowIndex !== index) return row
      const next = { ...row, ...patch }
      if (patch.work_center_id !== undefined) next.machine_id = ''
      return next
    }))
  }

  const create = async () => {
    const chosen = rows.filter((row) => row.selected && row.operation_name.trim() && row.work_center_id && row.machine_id)
    if (!chosen.length) {
      toast.error('Select at least one operation with a name, work center, and machine')
      return
    }
    setBusy(true)
    try {
      await apiClient.post('/api/v1/operations/bulk', {
        part_id: Number(partId),
        operations: chosen.map((row) => ({
          operation_name: row.operation_name.trim(),
          operation_type: row.operation_type,
          work_center_id: Number(row.work_center_id),
          machine_id: Number(row.machine_id),
          setup_time: row.setup_time || '00:00:00',
          cycle_time: (row.cycle_time || '00:00').slice(0, 5),
          work_instructions: row.work_instructions.trim() || null,
          notes: row.notes.trim() || null,
          operation_number: row.operation_number.trim() || null,
        })),
      })
      toast.success(`${chosen.length} operations created`)
      reset()
      onOpenChange(false)
      onCreated()
    } catch (error) {
      toast.error(errorMessage(error, 'Failed to create operations'))
    } finally {
      setBusy(false)
    }
  }

  const selectedCount = rows.filter((row) => row.selected).length

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) reset(); onOpenChange(next) }}>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle className="font-heading">{rows.length ? 'Review extracted operations' : 'Upload operations in bulk'}</DialogTitle>
        </DialogHeader>
        {!rows.length ? (
          <div className="space-y-3">
            <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
              Download the operations template, fill Op Number, Operation Name, Setup Time, Cycle Time, Work Instructions, and Notes, then upload the .docx here. Operations are added under {partName}.
            </p>
            <label
              className={`flex min-h-48 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed ${over ? 'bg-accent' : ''}`}
              onDragOver={(event) => { event.preventDefault(); setOver(true) }}
              onDragLeave={() => setOver(false)}
              onDrop={(event) => { event.preventDefault(); setOver(false); readFile(event.dataTransfer.files?.[0]) }}
            >
              <Upload className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm font-semibold">Click or drag your operations file here</span>
              <span className="text-xs text-muted-foreground">Supports .docx</span>
              <input type="file" accept=".docx" className="hidden" onChange={(event) => { readFile(event.target.files?.[0]); event.target.value = '' }} />
            </label>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="rounded-full bg-muted px-2 py-0.5">{rows.length} rows extracted</span>
              <span className="text-muted-foreground">Set work center and machine on each row before creating.</span>
            </div>
            <div className="max-h-[50vh] overflow-auto rounded-lg border border-border">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted">
                  <tr>
                    <th className="w-8 px-2 py-2">
                      <input
                        type="checkbox"
                        checked={rows.length > 0 && rows.every((row) => row.selected)}
                        onChange={(event) => setRows((current) => current.map((row) => ({ ...row, selected: event.target.checked })))}
                      />
                    </th>
                    <th className="px-2 py-2 text-left">Op No</th>
                    <th className="px-2 py-2 text-left">Operation</th>
                    <th className="px-2 py-2 text-left">Type</th>
                    <th className="px-2 py-2 text-left">Setup</th>
                    <th className="px-2 py-2 text-left">Cycle</th>
                    <th className="px-2 py-2 text-left">Work Center</th>
                    <th className="px-2 py-2 text-left">Machine</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={index} className="border-t border-border">
                      <td className="px-2"><input type="checkbox" checked={row.selected} onChange={(event) => update(index, { selected: event.target.checked })} /></td>
                      <td className="px-1 py-1"><Input className="h-8 w-16" value={row.operation_number} onChange={(event) => update(index, { operation_number: event.target.value })} /></td>
                      <td className="px-1 py-1"><Input className="h-8 min-w-36" value={row.operation_name} onChange={(event) => update(index, { operation_name: event.target.value })} /></td>
                      <td className="px-1 py-1">
                        <select className="h-8 w-full rounded-md border border-input bg-background px-2" value={row.operation_type} onChange={(event) => update(index, { operation_type: event.target.value })}>
                          <option value="in_house">In house</option>
                          <option value="out_source">Out source</option>
                        </select>
                      </td>
                      <td className="px-1 py-1"><Input className="h-8 w-24" value={row.setup_time} onChange={(event) => update(index, { setup_time: event.target.value })} /></td>
                      <td className="px-1 py-1"><Input className="h-8 w-20" value={row.cycle_time} onChange={(event) => update(index, { cycle_time: event.target.value })} /></td>
                      <td className="px-1 py-1">
                        <select className="h-8 w-full rounded-md border border-input bg-background px-2" value={row.work_center_id} onChange={(event) => update(index, { work_center_id: event.target.value })}>
                          <option value="">Select</option>
                          {workCenters.map((center) => <option key={center.id} value={center.id}>{center.name}</option>)}
                        </select>
                      </td>
                      <td className="px-1 py-1">
                        <select className="h-8 w-full rounded-md border border-input bg-background px-2" value={row.machine_id} disabled={!row.work_center_id} onChange={(event) => update(index, { machine_id: event.target.value })}>
                          <option value="">Select</option>
                          {machines.filter((machine) => String(machine.work_center_id) === String(row.work_center_id)).map((machine) => (
                            <option key={machine.id} value={machine.id}>{machine.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-1"><button type="button" aria-label="Remove row" onClick={() => setRows((current) => current.filter((_, rowIndex) => rowIndex !== index))}><Trash2 className="h-3.5 w-3.5" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        <DialogFooter className="gap-2 sm:justify-between">
          <div className="flex gap-2">
            {rows.length > 0 && (
              <>
                <Button type="button" variant="outline" onClick={reset}>Re-upload</Button>
                <Button type="button" variant="outline" onClick={() => setRows((current) => [...current, emptyRow()])}><Plus className="mr-1 h-3.5 w-3.5" />Add operation</Button>
                <Button type="button" variant="outline" disabled={!selectedCount} onClick={() => setRows((current) => current.filter((row) => !row.selected))}>
                  <Trash2 className="mr-1 h-3.5 w-3.5" />Delete selected
                </Button>
              </>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" asChild>
              <a href="/operations-template.docx" download="OperationsTemplate.docx">
                <FileDown className="mr-1 h-3.5 w-3.5" />Template
              </a>
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
            {rows.length > 0 && <Button type="button" disabled={busy} onClick={create}>Create {selectedCount} operations</Button>}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
