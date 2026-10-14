import { useState } from 'react'
import { Plus, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import apiClient from '../../services/api/client'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog'
import { Input } from '../ui/input'

const types = ['In-house', 'Out-source', 'Standard']
const emptyRow = () => ({ part_number: '', part_name: '', size: '', quantity: '1', part_type: 'Standard', selected: true })

function errorMessage(error, fallback) {
  const detail = error.response?.data?.detail
  return typeof detail === 'string' ? detail : fallback
}

export function BulkPartsDialog({ open, productId, assemblyId, title, onOpenChange, onCreated }) {
  const [rows, setRows] = useState([])
  const [busy, setBusy] = useState(false)
  const [over, setOver] = useState(false)

  const reset = () => setRows([])

  const readFile = async (file) => {
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.docx')) {
      toast.error('Upload a .docx file from the parts template')
      return
    }
    const form = new FormData()
    form.append('file', file)
    setBusy(true)
    try {
      const response = await apiClient.post('/api/v1/parts/parse-template', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setRows((response.data.rows || []).map((row) => ({ ...row, quantity: String(row.quantity || 1), selected: true })))
      toast.success(`${response.data.count} parts extracted`)
    } catch (error) {
      toast.error(errorMessage(error, 'Failed to read the document'))
    } finally {
      setBusy(false)
    }
  }

  const update = (index, patch) => {
    setRows((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)))
  }

  const create = async () => {
    const chosen = rows.filter((row) => row.selected && row.part_number.trim() && row.part_name.trim())
    if (!chosen.length) {
      toast.error('Select at least one complete part')
      return
    }
    setBusy(true)
    try {
      await apiClient.post('/api/v1/parts/bulk', {
        product_id: Number(productId),
        assembly_id: assemblyId || null,
        parts: chosen.map((row) => ({
          part_number: row.part_number.trim(),
          part_name: row.part_name.trim(),
          size: row.size.trim() || null,
          quantity: Number(row.quantity),
          part_type: row.part_type,
        })),
      })
      toast.success(`${chosen.length} parts created`)
      reset()
      onOpenChange(false)
      onCreated()
    } catch (error) {
      toast.error(errorMessage(error, 'Failed to create parts'))
    } finally {
      setBusy(false)
    }
  }

  const selectedCount = rows.filter((row) => row.selected).length

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) reset(); onOpenChange(next) }}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle className="font-heading">{rows.length ? 'Review extracted parts' : 'Upload parts from BOM document'}</DialogTitle>
        </DialogHeader>
        {!rows.length ? (
          <div className="space-y-3">
            <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
              Download the parts template, fill Name of Part, Part No, Size, Part Quantity, and Part Type, then upload the .docx here. Parts are added under {title}.
            </p>
            <label
              className={`flex min-h-48 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed ${over ? 'bg-accent' : ''}`}
              onDragOver={(event) => { event.preventDefault(); setOver(true) }}
              onDragLeave={() => setOver(false)}
              onDrop={(event) => { event.preventDefault(); setOver(false); readFile(event.dataTransfer.files?.[0]) }}
            >
              <Upload className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm font-semibold">Click or drag your BOM file here</span>
              <span className="text-xs text-muted-foreground">Supports .docx</span>
              <input type="file" accept=".docx" className="hidden" onChange={(event) => { readFile(event.target.files?.[0]); event.target.value = '' }} />
            </label>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="rounded-full bg-muted px-2 py-0.5">{rows.length} rows extracted</span>
              <span className="text-muted-foreground">Click a cell to edit. Select rows to create or delete.</span>
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
                    <th className="px-2 py-2 text-left">Part number</th>
                    <th className="px-2 py-2 text-left">Part name</th>
                    <th className="px-2 py-2 text-left">Size</th>
                    <th className="px-2 py-2 text-left">Qty</th>
                    <th className="px-2 py-2 text-left">Type</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={index} className="border-t border-border">
                      <td className="px-2"><input type="checkbox" checked={row.selected} onChange={(event) => update(index, { selected: event.target.checked })} /></td>
                      <td className="px-1 py-1"><Input className="h-8" value={row.part_number} onChange={(event) => update(index, { part_number: event.target.value })} /></td>
                      <td className="px-1 py-1"><Input className="h-8" value={row.part_name} onChange={(event) => update(index, { part_name: event.target.value })} /></td>
                      <td className="px-1 py-1"><Input className="h-8" value={row.size} onChange={(event) => update(index, { size: event.target.value })} /></td>
                      <td className="px-1 py-1"><Input className="h-8 w-16" value={row.quantity} onChange={(event) => update(index, { quantity: event.target.value.replace(/\D/g, '') })} /></td>
                      <td className="px-1 py-1">
                        <select className="h-8 w-full rounded-md border border-input bg-background px-2" value={row.part_type} onChange={(event) => update(index, { part_type: event.target.value })}>
                          {types.map((type) => <option key={type}>{type}</option>)}
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
                <Button type="button" variant="outline" onClick={() => setRows((current) => [...current, emptyRow()])}><Plus className="mr-1 h-3.5 w-3.5" />Add part</Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!selectedCount}
                  onClick={() => setRows((current) => current.filter((row) => !row.selected))}
                >
                  <Trash2 className="mr-1 h-3.5 w-3.5" />Delete selected
                </Button>
              </>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
            {rows.length > 0 && <Button type="button" disabled={busy} onClick={create}>Create {selectedCount} parts</Button>}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
