import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { ArrowDown, ArrowLeft, ArrowUp, ArrowUpDown, Download, FileText, History, Loader2, Trash2 } from 'lucide-react'
import * as pdfjs from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog'
import { Hint } from '../ui/tooltip'
import { RowActions } from '../common/RowActions'
import { TableSearch, useTableTools } from '../common/TableTools'
import { TablePager } from '../common/TablePager'
import { productsService } from '../../services/api/products'
import { customersService } from '../../services/api/customers'
import { downloadCostExcel, downloadCostPdf, scaleCostSummary } from './productCostExport'
import { useConfirm } from '../common/ConfirmDialog'

const HISTORY_PAGE_SIZE = 9

function money(value) {
  return Number(value || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 })
}

function timeAgo(value) {
  if (!value) return ''
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000))
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

function ReportThumb({ bytes }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !bytes) return undefined
    let cancelled = false
    let task
    const draw = async () => {
      task = pdfjs.getDocument({ data: bytes.slice(0) })
      const pdf = await task.promise
      if (cancelled) return
      const page = await pdf.getPage(1)
      const base = page.getViewport({ scale: 1 })
      const scale = Math.min(420 / base.width, 280 / base.height)
      const viewport = page.getViewport({ scale })
      canvas.width = viewport.width
      canvas.height = viewport.height
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
    }
    draw().catch(() => {})
    return () => {
      cancelled = true
      try {
        if (typeof task?.destroy === 'function') task.destroy()
      } catch {
        // The preview can close while the PDF is still opening.
      }
    }
  }, [bytes])

  if (!bytes) return <div className="h-full w-full animate-pulse bg-muted" />
  return (
    <div className="flex h-full w-full items-start justify-center overflow-hidden bg-white">
      <canvas ref={canvasRef} className="max-h-full max-w-full" />
    </div>
  )
}

const cards = [
  ['Total Setup Time', 'total_setup_time'],
  ['Total Cycle Time', 'total_cycle_time'],
  ['Total (Setup + Cycle)', 'total_time'],
  ['Total Machining Cost', 'total_machining_cost', true],
  ['Grand Total', 'grand_total', true],
]

export function ProductCost({ productId }) {
  const confirm = useConfirm()
  const [summary, setSummary] = useState(null)
  const [name, setName] = useState('')
  const [value, setValue] = useState('')
  const [open, setOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(12)
  const [exportOpen, setExportOpen] = useState(false)
  const [customers, setCustomers] = useState([])
  const [customerId, setCustomerId] = useState('')
  const [exportQty, setExportQty] = useState('1')
  const [exporting, setExporting] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyPage, setHistoryPage] = useState(1)
  const [thumbs, setThumbs] = useState({})
  const [preview, setPreview] = useState(null)
  const scrollerRef = useRef(null)
  const tools = useTableTools(summary?.operations || [], ['machine_name', 'part_name', 'part_number', 'operation_name', 'operation_number'])
  const costTools = useTableTools(summary?.additional_costs || [], ['cost_name', 'cost_value'])

  const load = async () => {
    const data = await productsService.getCost(productId)
    setSummary(data)
    setPage(1)
  }

  useEffect(() => {
    setShowHistory(false)
    setHistory([])
    setThumbs({})
    setPreview((current) => {
      if (current?.url) URL.revokeObjectURL(current.url)
      return null
    })
    load().catch((error) => toast.error(error.response?.data?.detail || 'Failed to load product cost'))
  }, [productId])

  useEffect(() => {
    const node = scrollerRef.current
    if (!node) return undefined
    const measure = () => setPageSize(Math.max(8, Math.floor((node.clientHeight - 44) / 32)))
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [open, summary])

  const openExport = async () => {
    setExportQty('1')
    setExportOpen(true)
    if (customers.length) return
    try {
      const data = await customersService.getAll()
      setCustomers(Array.isArray(data) ? data : data.items || [])
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to load customers')
    }
  }

  const exportReport = async (kind) => {
    const customer = customers.find((item) => String(item.id) === String(customerId))
    if (!customer) {
      toast.error('Select a customer')
      return
    }
    const qty = Number(exportQty)
    if (!Number.isInteger(qty) || qty < 1) {
      toast.error('Enter a quantity of 1 or more')
      return
    }
    setExporting(kind)
    try {
      const scaled = scaleCostSummary(summary, qty)
      if (kind === 'pdf') {
        const file = await downloadCostPdf(scaled, customer)
        if (file?.blob) {
          try {
            await productsService.saveCostHistory(productId, file, {
              customerName: customer.company_name,
              quantity: qty,
              grandTotal: scaled.grand_total,
            })
          } catch (error) {
            toast.error(error.response?.data?.detail || 'The PDF downloaded, but it was not saved to history')
          }
        }
      } else await downloadCostExcel(scaled, customer)
      setExportOpen(false)
    } catch (error) {
      toast.error(error.response?.data?.detail || error.message || 'Failed to download report')
    } finally {
      setExporting('')
    }
  }

  const openHistory = async () => {
    if (showHistory) {
      setShowHistory(false)
      return
    }
    setShowHistory(true)
    setHistoryPage(1)
    setHistoryLoading(true)
    try {
      setHistory(await productsService.listCostHistory(productId))
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to load report history')
    } finally {
      setHistoryLoading(false)
    }
  }

  const historyPages = Math.max(1, Math.ceil(history.length / HISTORY_PAGE_SIZE))
  const historyCurrent = Math.min(historyPage, historyPages)
  const historyRows = history.slice((historyCurrent - 1) * HISTORY_PAGE_SIZE, historyCurrent * HISTORY_PAGE_SIZE)

  useEffect(() => {
    if (!showHistory) return undefined
    let cancelled = false
    historyRows.forEach((item) => {
      if (thumbs[item.id]) return
      productsService.downloadCostHistory(productId, item.id).then(async (blob) => {
        const bytes = new Uint8Array(await blob.arrayBuffer())
        if (!cancelled) setThumbs((current) => (current[item.id] ? current : { ...current, [item.id]: bytes }))
      }).catch(() => {})
    })
    return () => {
      cancelled = true
    }
  }, [showHistory, productId, historyCurrent, history])

  const openSavedReport = async (item) => {
    try {
      const bytes = thumbs[item.id] || new Uint8Array(await (await productsService.downloadCostHistory(productId, item.id)).arrayBuffer())
      const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }))
      setPreview((current) => {
        if (current?.url) URL.revokeObjectURL(current.url)
        return { item, url }
      })
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to open the saved report')
    }
  }

  const closePreview = () => {
    setPreview((current) => {
      if (current?.url) URL.revokeObjectURL(current.url)
      return null
    })
  }

  const removeHistory = async (item) => {
    if (!(await confirm({ title: 'Delete report', description: `Delete ${item.file_name}? This cannot be undone.` }))) return
    try {
      await productsService.deleteCostHistory(productId, item.id)
      setHistory((rows) => rows.filter((row) => row.id !== item.id))
      setThumbs((current) => {
        const next = { ...current }
        delete next[item.id]
        return next
      })
      setPreview((current) => {
        if (current?.item?.id !== item.id) return current
        if (current.url) URL.revokeObjectURL(current.url)
        return null
      })
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete the saved report')
    }
  }

  const addCost = async (costName, costValue) => {
    if (!costName || costValue === '' || Number.isNaN(Number(costValue))) return
    try {
      setSummary(await productsService.addAdditionalCost(productId, { cost_name: costName, cost_value: Number(costValue) }))
      setName('')
      setValue('')
      setOpen(true)
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add cost')
    }
  }

  const removeCost = async (costId) => {
    if (!(await confirm({ title: 'Delete cost', description: 'Delete this additional cost? This cannot be undone.' }))) return
    try {
      setSummary(await productsService.deleteAdditionalCost(productId, costId))
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to remove cost')
    }
  }

  if (!summary) return <div className="p-4 text-sm text-muted-foreground">Loading product cost...</div>

  const ordered = tools.sort.key
    ? tools.rows
    : [...tools.rows].sort((left, right) => (
      String(left.machine_name || '').localeCompare(String(right.machine_name || ''), undefined, { numeric: true })
      || String(left.part_number || '').localeCompare(String(right.part_number || ''), undefined, { numeric: true })
      || String(left.operation_number || '').localeCompare(String(right.operation_number || ''), undefined, { numeric: true })
    ))
  const pages = Math.max(1, Math.ceil(ordered.length / pageSize))
  const current = Math.min(page, pages)
  const start = (current - 1) * pageSize
  const rows = ordered.slice(start, start + pageSize)
  const machineSpan = rows.map((row, index) => {
    if (index > 0 && rows[index - 1].machine_name === row.machine_name) return 0
    let span = 1
    while (index + span < rows.length && rows[index + span].machine_name === row.machine_name) span += 1
    return span
  })

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border px-3">
        <h2 className="min-w-0 truncate font-heading text-lg font-bold">{summary.product_name}</h2>
        <div className="flex shrink-0 items-center gap-2">
          {showHistory && (
            <Hint label="Back">
              <button type="button" className="flex h-8 w-8 items-center justify-center border border-border" aria-label="Back" onClick={() => setShowHistory(false)}>
                <ArrowLeft className="h-4 w-4" />
              </button>
            </Hint>
          )}
          <Hint label="History">
            <button type="button" className={`flex h-8 w-8 items-center justify-center border border-border ${showHistory ? 'bg-primary text-primary-foreground' : ''}`} aria-label="History" onClick={openHistory}>
              <History className="h-4 w-4" />
            </button>
          </Hint>
          <Hint label="Download">
            <button type="button" className="flex h-8 w-8 items-center justify-center border border-border" aria-label="Download" onClick={openExport}>
              <Download className="h-4 w-4" />
            </button>
          </Hint>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden p-3">
      {showHistory ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {historyLoading ? (
            <p className="text-sm text-muted-foreground">Loading saved reports...</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No saved reports for this version yet. Download a PDF to save one.</p>
          ) : (
            <div className="grid min-h-0 flex-1 grid-cols-3 grid-rows-3 gap-3 overflow-auto">
              {historyRows.map((item) => (
                <div key={item.id} className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-background text-left">
                  <button type="button" className="min-h-0 flex-1 overflow-hidden bg-muted p-2 text-left" onClick={() => openSavedReport(item)}>
                    <div className="h-full overflow-hidden border border-border bg-white">
                      <ReportThumb bytes={thumbs[item.id]} />
                    </div>
                  </button>
                  <div className="flex shrink-0 items-center gap-2 border-t border-border px-3 py-2">
                    <button type="button" className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={() => openSavedReport(item)}>
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-primary text-primary-foreground">
                        <FileText className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{item.file_name}</span>
                        <span className="block truncate text-[11px] text-muted-foreground">{item.customer_name} · Qty {item.quantity} · {money(item.grand_total)} · {timeAgo(item.created_at)}</span>
                      </span>
                    </button>
                    <Hint label="Delete">
                      <button type="button" className="rounded p-1 hover:bg-accent" aria-label="Delete" onClick={() => removeHistory(item)}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </Hint>
                  </div>
                </div>
              ))}
            </div>
          )}
          <TablePager page={historyCurrent} pages={historyPages} total={history.length} onPage={setHistoryPage} />
        </div>
      ) : (
      <>
      <div className="grid grid-cols-5 gap-2">
        {cards.map(([label, key, isMoney]) => (
          <div key={key} className="min-w-0 border border-border px-3 py-2">
            <p className="truncate text-[11px] text-muted-foreground">{label}</p>
            <p className="truncate text-sm font-bold">{isMoney ? money(summary[key]) : summary[key]}</p>
          </div>
        ))}
      </div>

      <div className="flex min-h-0 flex-1 flex-col border border-border">
        <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-1.5">
          <span className="text-sm font-bold">Part Operations</span>
          <TableSearch value={tools.query} onChange={tools.setQuery} placeholder="Search operations" />
          <span className="text-xs text-muted-foreground">{ordered.length} rows</span>
        </div>
        <div ref={scrollerRef} className="min-h-0 flex-1 overflow-x-auto overflow-y-auto">
          <table className="w-max min-w-full border-collapse text-xs">
            <thead className="sticky top-0 z-10">
              <tr>
                {[
                  ['machine_name', 'Machine'],
                  ['part_name', 'Part'],
                  ['quantity', 'Qty'],
                  ['operation_number', 'Op #'],
                  ['operation_name', 'Operation'],
                  ['setup_time', 'Setup'],
                  ['cycle_time', 'Cycle'],
                  ['machining_time', 'Machining Hr'],
                  ['mhr_rate', 'MHR'],
                  ['cost_per_operation', 'Cost/Op'],
                  ['part_total_time', 'Total Hrs/Part'],
                  ['cost_per_qty', 'Cost/Qty'],
                  ['cost_for_overall_qty', 'Overall Qty Cost'],
                ].map(([column, heading]) => {
                  const active = tools.sort.key === column
                  const Icon = !active ? ArrowUpDown : tools.sort.direction === 'desc' ? ArrowDown : ArrowUp
                  return (
                  <th key={column} className="h-11 border-b border-border bg-muted px-2 text-left text-sm font-bold">
                    <button type="button" className="inline-flex items-center gap-1" onClick={() => tools.toggleSort(column)}>
                      {heading}
                      <Icon className={`h-3 w-3 ${active ? 'text-foreground' : 'text-muted-foreground'}`} />
                    </button>
                  </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={13} className="h-8 px-2 text-muted-foreground">No operations on this product</td></tr>
              ) : rows.map((row, index) => (
                <tr key={`${row.part_id}-${row.operation_number}-${start + index}`}>
                  {machineSpan[index] > 0 && (
                    <td rowSpan={machineSpan[index]} className="border-b border-border px-2 align-middle font-semibold">{row.machine_name}</td>
                  )}
                  <td className="h-8 border-b border-border px-2">{row.part_name} · {row.part_number}</td>
                  <td className="h-8 border-b border-border px-2">{row.quantity}</td>
                  <td className="h-8 border-b border-border px-2">{row.operation_number}</td>
                  <td className="h-8 border-b border-border px-2">{row.operation_name}</td>
                  <td className="h-8 border-b border-border px-2">{row.setup_time}</td>
                  <td className="h-8 border-b border-border px-2">{row.cycle_time}</td>
                  <td className="h-8 border-b border-border px-2">{row.machining_time}</td>
                  <td className="h-8 border-b border-border px-2">{money(row.mhr_rate)}/hr</td>
                  <td className="h-8 border-b border-border px-2">{money(row.cost_per_operation)}</td>
                  <td className="h-8 border-b border-border px-2">{row.part_total_time}</td>
                  <td className="h-8 border-b border-border px-2">{money(row.cost_per_qty)}</td>
                  <td className="h-8 border-b border-border px-2">{money(row.cost_for_overall_qty)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <TablePager page={current} pages={pages} total={ordered.length} onPage={setPage} />
      </div>

      <div className="shrink-0 border border-border">
        <button type="button" className="flex w-full items-center justify-between px-3 py-2 text-sm font-bold" onClick={() => setOpen((currentOpen) => !currentOpen)}>
          {open ? 'Hide Additional Costs' : 'Show Additional Costs'}
          <span>{money(summary.additional_total)}</span>
        </button>
        {open && (
          <div className="space-y-2 border-t border-border p-3">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  {[
                    ['cost_name', 'Cost Name'],
                    ['cost_value', 'Cost Value'],
                  ].map(([column, heading]) => {
                    const active = costTools.sort.key === column
                    const Icon = !active ? ArrowUpDown : costTools.sort.direction === 'desc' ? ArrowDown : ArrowUp
                    return (
                      <th key={column} className="h-11 border border-border bg-muted px-2 text-left text-sm font-bold">
                        <button type="button" className="inline-flex items-center gap-1" onClick={() => costTools.toggleSort(column)}>
                          {heading}
                          <Icon className={`h-3 w-3 ${active ? 'text-foreground' : 'text-muted-foreground'}`} />
                        </button>
                      </th>
                    )
                  })}
                  <th className="h-11 border border-border bg-muted px-2 text-left text-sm font-bold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {costTools.rows.length === 0 ? (
                  <tr><td colSpan={3} className="border border-border px-2 py-2 text-muted-foreground">No additional costs added yet</td></tr>
                ) : costTools.rows.map((cost) => (
                  <tr key={cost.id}>
                    <td className="border border-border px-2 py-1">{cost.cost_name}</td>
                    <td className="border border-border px-2 py-1">{money(cost.cost_value)}</td>
                    <td className="h-8 border border-border px-2">
                      <RowActions onDelete={() => removeCost(cost.id)} />
                    </td>
                  </tr>
                ))}
                <tr>
                  <td className="border border-border px-2 py-1 font-bold">Subtotal</td>
                  <td className="border border-border px-2 py-1 font-bold">{money(summary.additional_total)}</td>
                  <td className="border border-border" />
                </tr>
              </tbody>
            </table>
            <div className="flex flex-wrap gap-2">
              {summary.presets.map((preset) => (
                <button key={preset} type="button" className="border border-border px-2 py-1 text-xs" onClick={() => setName(preset)}>{preset}</button>
              ))}
            </div>
            <form className="flex items-end gap-2" onSubmit={(event) => { event.preventDefault(); addCost(name, value) }}>
              <div className="space-y-1">
                <label className="text-xs">Cost Name</label>
                <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Tooling Cost" className="h-8 w-64" />
              </div>
              <div className="space-y-1">
                <label className="text-xs">Cost Value</label>
                <Input value={value} onChange={(event) => setValue(event.target.value)} type="number" min="0" step="0.01" placeholder="0.00" className="h-8 w-40" />
              </div>
              <Button type="submit" className="ml-auto h-8">Add Cost</Button>
            </form>
          </div>
        )}
      </div>
      </>
      )}
      <Dialog open={Boolean(preview)} onOpenChange={(open) => { if (!open) closePreview() }}>
        <DialogContent className="flex h-[85vh] max-h-[85vh] w-[min(56rem,92vw)] max-w-none flex-col gap-3 overflow-hidden">
          <DialogHeader className="shrink-0 pr-6">
            <DialogTitle>{preview?.item.customer_name}</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-auto rounded-md border border-border bg-white">
            {preview?.url && <iframe title={preview.item.file_name} src={preview.url} className="h-full w-full" />}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Export summary</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-xs font-bold">Customer</label>
              <select className="h-9 w-full border border-input bg-background px-2 text-sm" value={customerId} onChange={(event) => setCustomerId(event.target.value)}>
                <option value="">Select a customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>{customer.company_name}{customer.branch ? ` · ${customer.branch}` : ''}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold">Qty</label>
              <Input
                inputMode="numeric"
                min="1"
                value={exportQty}
                onChange={(event) => setExportQty(event.target.value.replace(/\D/g, ''))}
                className="h-9"
              />
              <p className="text-xs text-muted-foreground">1-qty cost is multiplied by this quantity in the report.</p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={Boolean(exporting)} onClick={() => exportReport('excel')}>
              {exporting === 'excel' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Download Excel
            </Button>
            <Button type="button" disabled={Boolean(exporting)} onClick={() => exportReport('pdf')}>
              {exporting === 'pdf' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Download PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  )
}
