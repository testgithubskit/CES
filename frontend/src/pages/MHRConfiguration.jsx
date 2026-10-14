import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Download } from 'lucide-react'
import { Input } from '../components/ui/input'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu'
import apiClient, { shareGet } from '../services/api/client'
import { downloadExcel, downloadPdf } from '../components/common/tableExport'
function money(value) {
  if (value === null || value === undefined || value === '') return ''
  const number = Number(value)
  if (Number.isNaN(number)) return ''
  return number.toLocaleString('en-IN', { maximumFractionDigits: 2 })
}

export function MHRConfiguration({ embedded = false }) {
  const [matrix, setMatrix] = useState({ particulars: [], machines: [], values: [] })
  const [filter, setFilter] = useState('')
  const [drafts, setDrafts] = useState({})
  const [recommended, setRecommended] = useState({})

  const load = async () => {
    const data = await shareGet('/api/v1/mhr/matrix')
    setMatrix(data)
    const next = {}
    data.machines.forEach((machine) => {
      next[machine.id] = machine.recommended_mhr ?? machine.mhr ?? ''
    })
    setRecommended(next)
    setDrafts({})
  }

  useEffect(() => {
    load().catch((error) => toast.error(error.response?.data?.detail || 'Failed to load MHR'))
  }, [])

  const valueMap = useMemo(() => {
    const map = new Map()
    matrix.values.forEach((value) => {
      map.set(`${value.machine_id}:${value.particular_id}`, value)
    })
    return map
  }, [matrix.values])

  const machines = matrix.machines.filter((machine) => {
    const query = filter.trim().toLowerCase()
    if (!query) return true
    return `${machine.label} ${machine.make} ${machine.model} ${machine.type}`.toLowerCase().includes(query)
  })

  const cellValue = (machine, particular) => {
    const key = `${machine.id}:${particular.id}`
    if (drafts[key] !== undefined) return drafts[key]
    const stored = valueMap.get(key)
    if (!stored) return ''
    const raw = particular.is_input ? stored.input_value : stored.computed_value
    return raw ?? ''
  }

  const saveInput = async (machine, particular, raw) => {
    if (raw === '' || Number.isNaN(Number(raw))) return
    const stored = valueMap.get(`${machine.id}:${particular.id}`)
    if (stored && Number(stored.input_value) === Number(raw)) return
    try {
      await apiClient.put(`/api/v1/mhr/machines/${machine.id}/inputs`, [
        { particular_id: particular.id, value: Number(raw) },
      ])
      await load()
    } catch (error) {
      const detail = error.response?.data?.detail
      toast.error(typeof detail === 'string' ? detail : 'Failed to calculate MHR')
    }
  }

  const saveRecommended = async (machine) => {
    const next = recommended[machine.id]
    if (next === '' || next === null || next === undefined || Number.isNaN(Number(next))) return
    if (Number(next) === Number(machine.recommended_mhr)) return
    try {
      await apiClient.put(`/api/v1/mhr/machines/${machine.id}/recommended`, null, {
        params: { recommended_mhr: Number(next) },
      })
      await load()
    } catch (error) {
      const detail = error.response?.data?.detail
      toast.error(typeof detail === 'string' ? detail : 'Failed to save recommended MHR')
    }
  }

  const exportColumns = [
    { key: 'sl', label: 'Sl' },
    { key: 'particular', label: 'Particulars' },
    { key: 'code', label: 'Code' },
    { key: 'calculation', label: 'Calculation' },
    ...machines.map((machine) => ({ key: `machine-${machine.id}`, label: machine.label })),
  ]
  const exportRows = [
    ...matrix.particulars.map((particular, index) => ({
      sl: index + 1,
      particular: particular.name,
      code: particular.code,
      calculation: particular.is_input ? 'Manual input' : particular.formula,
      ...Object.fromEntries(machines.map((machine) => [`machine-${machine.id}`, cellValue(machine, particular)])),
    })),
    {
      sl: '',
      particular: 'Calculated MHR',
      code: 'MHR',
      calculation: '(CC + OC) / H',
      ...Object.fromEntries(machines.map((machine) => [`machine-${machine.id}`, machine.mhr ?? ''])),
    },
    {
      sl: '',
      particular: 'Recommended MHR',
      code: 'REC',
      calculation: '',
      ...Object.fromEntries(machines.map((machine) => [`machine-${machine.id}`, recommended[machine.id] ?? ''])),
    },
  ]

  return (
    <div className={`flex flex-col gap-3 ${embedded ? 'h-full min-h-0' : 'h-[calc(100vh-2rem)]'}`}>
      <div className="flex items-center gap-3">
        {!embedded && <h1 className="font-heading text-2xl font-bold">Machine Hour Rates</h1>}
        <Input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Filter machines" className="h-8 w-48" />
        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{machines.length} machines</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="flex h-8 w-8 items-center justify-center border border-border" aria-label="Export" title="Export">
                <Download className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => downloadPdf('Machine Hour Rates', exportColumns, exportRows)}>PDF</DropdownMenuItem>
              <DropdownMenuItem onClick={() => downloadExcel('Machine Hour Rates', exportColumns, exportRows)}>Excel</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto border border-border">
        <table className="w-max min-w-full border-separate border-spacing-0 text-xs">
          <thead className="sticky top-0 z-30">
            <tr>
              <th className="sticky left-0 z-40 box-border h-8 w-10 min-w-10 max-w-10 border border-border bg-muted px-1.5 text-left text-xs font-bold">Sl</th>
              <th className="sticky left-10 z-40 box-border h-8 w-44 min-w-44 max-w-44 border border-border bg-muted px-1.5 text-left text-xs font-bold">Particulars</th>
              <th className="sticky left-[13.5rem] z-40 box-border h-8 w-16 min-w-16 max-w-16 border border-border bg-muted px-1.5 text-left text-xs font-bold">Code</th>
              <th className="sticky left-[17.5rem] z-40 box-border h-8 w-32 min-w-32 max-w-32 border border-border bg-muted px-1.5 text-left text-xs font-bold">Calculation</th>
              {machines.map((machine) => (
                <th key={machine.id} className="h-8 min-w-28 border border-border bg-muted px-1.5 text-left text-xs font-bold">
                  {machine.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.particulars.map((particular, index) => (
              <tr key={particular.id}>
                <td className="sticky left-0 z-20 box-border h-7 w-10 min-w-10 max-w-10 border border-border bg-background px-1.5">{index + 1}</td>
                <td className="sticky left-10 z-20 box-border h-7 w-44 min-w-44 max-w-44 border border-border bg-background px-1.5">{particular.name}</td>
                <td className="sticky left-[13.5rem] z-20 box-border h-7 w-16 min-w-16 max-w-16 border border-border bg-background px-1.5 font-semibold">{particular.code}</td>
                <td className="sticky left-[17.5rem] z-20 box-border h-7 w-32 min-w-32 max-w-32 border border-border bg-background px-1.5 text-muted-foreground">{particular.is_input ? 'Manual input' : particular.formula}</td>
                {machines.map((machine) => {
                  const key = `${machine.id}:${particular.id}`
                  const value = cellValue(machine, particular)
                  return (
                    <td key={machine.id} className="border border-border px-1 py-1 text-right">
                      {particular.is_input ? (
                        <input
                          className="h-6 w-full border border-input bg-background px-1 text-right text-xs"
                          value={value}
                          onChange={(event) => setDrafts((current) => ({ ...current, [key]: event.target.value }))}
                          onBlur={(event) => saveInput(machine, particular, event.target.value)}
                        />
                      ) : (
                        <span>{money(value)}</span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
            <tr className="bg-accent">
              <td className="sticky left-0 z-20 box-border h-7 w-10 min-w-10 max-w-10 border border-border bg-accent px-1.5 font-bold" />
              <td className="sticky left-10 z-20 box-border h-7 w-44 min-w-44 max-w-44 border border-border bg-accent px-1.5 font-bold">Calculated MHR</td>
              <td className="sticky left-[13.5rem] z-20 box-border h-7 w-16 min-w-16 max-w-16 border border-border bg-accent px-1.5 font-bold">MHR</td>
              <td className="sticky left-[17.5rem] z-20 box-border h-7 w-32 min-w-32 max-w-32 border border-border bg-accent px-1.5 font-bold">(CC + OC) / H</td>
              {machines.map((machine) => (
                <td key={machine.id} className="border border-border bg-accent px-2 text-right font-bold">{money(machine.mhr)}</td>
              ))}
            </tr>
            <tr className="bg-accent">
              <td className="sticky left-0 z-20 box-border h-7 w-10 min-w-10 max-w-10 border border-border bg-accent px-1.5 font-bold" />
              <td className="sticky left-10 z-20 box-border h-7 w-44 min-w-44 max-w-44 border border-border bg-accent px-1.5 font-bold">Recommended MHR</td>
              <td className="sticky left-[13.5rem] z-20 box-border h-7 w-16 min-w-16 max-w-16 border border-border bg-accent px-1.5 font-bold">REC</td>
              <td className="sticky left-[17.5rem] z-20 box-border h-7 w-32 min-w-32 max-w-32 border border-border bg-accent" />
              {machines.map((machine) => (
                <td key={machine.id} className="border border-border bg-accent px-1 py-1">
                  <input
                    className="h-6 w-full border border-input bg-background px-1 text-right text-xs font-bold"
                    value={recommended[machine.id] ?? ''}
                    onChange={(event) => setRecommended((current) => ({ ...current, [machine.id]: event.target.value }))}
                    onBlur={() => saveRecommended(machine)}
                  />
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
