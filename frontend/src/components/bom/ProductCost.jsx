import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { ArrowDown, ArrowUp, ArrowUpDown, Download } from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog'
import { RowActions } from '../common/RowActions'
import { TableSearch, useTableTools } from '../common/TableTools'
import { TablePager } from '../common/TablePager'
import { productsService } from '../../services/api/products'
import { customersService } from '../../services/api/customers'
import { downloadCostExcel, downloadCostPdf } from './productCostExport'

function money(value) {
  return Number(value || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 })
}

const cards = [
  ['Total Setup Time', 'total_setup_time'],
  ['Total Cycle Time', 'total_cycle_time'],
  ['Total (Setup + Cycle)', 'total_time'],
  ['Total Machining Cost', 'total_machining_cost', true],
  ['Grand Total', 'grand_total', true],
]

export function ProductCost({ productId }) {
  const [summary, setSummary] = useState(null)
  const [name, setName] = useState('')
  const [value, setValue] = useState('')
  const [open, setOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(12)
  const [exportOpen, setExportOpen] = useState(false)
  const [customers, setCustomers] = useState([])
  const [customerId, setCustomerId] = useState('')
  const scrollerRef = useRef(null)
  const tools = useTableTools(summary?.operations || [], ['machine_name', 'part_name', 'part_number', 'operation_name', 'operation_number'])
  const costTools = useTableTools(summary?.additional_costs || [], ['cost_name', 'cost_value'])

  const load = async () => {
    const data = await productsService.getCost(productId)
    setSummary(data)
    setPage(1)
  }

  useEffect(() => {
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
    setExportOpen(true)
    if (customers.length) return
    try {
      const data = await customersService.getAll()
      setCustomers(Array.isArray(data) ? data : data.items || [])
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to load customers')
    }
  }

  const exportReport = (kind) => {
    const customer = customers.find((item) => String(item.id) === String(customerId))
    if (!customer) {
      toast.error('Select a customer')
      return
    }
    if (kind === 'pdf') downloadCostPdf(summary, customer)
    else downloadCostExcel(summary, customer)
    setExportOpen(false)
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
    <div className="flex h-full min-h-0 flex-col gap-2 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate font-heading text-lg font-bold">{summary.product_name}</h2>
        </div>
        <button type="button" className="flex h-8 w-8 shrink-0 items-center justify-center border border-border" aria-label="Export" title="Export" onClick={openExport}>
          <Download className="h-4 w-4" />
        </button>
      </div>

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
      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Export summary</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-xs font-bold">Customer</label>
            <select className="h-9 w-full border border-input bg-background px-2 text-sm" value={customerId} onChange={(event) => setCustomerId(event.target.value)}>
              <option value="">Select a customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>{customer.company_name}{customer.branch ? ` · ${customer.branch}` : ''}</option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => exportReport('excel')}>Download Excel</Button>
            <Button type="button" onClick={() => exportReport('pdf')}>Download PDF</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
