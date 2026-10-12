import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Input } from '../components/ui/input'
import apiClient from '../services/api/client'

function money(value) {
  if (value === null || value === undefined || value === '') return ''
  const number = Number(value)
  if (Number.isNaN(number)) return ''
  return number.toLocaleString('en-IN', { maximumFractionDigits: 2 })
}

export function MHRConfiguration() {
  const [matrix, setMatrix] = useState({ particulars: [], machines: [], values: [] })
  const [filter, setFilter] = useState('')
  const [drafts, setDrafts] = useState({})
  const [recommended, setRecommended] = useState({})

  const load = async () => {
    const response = await apiClient.get('/api/v1/mhr/matrix')
    setMatrix(response.data)
    const next = {}
    response.data.machines.forEach((machine) => {
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

  return (
    <div className="flex h-[calc(100vh-2rem)] flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-bold">Machine Hour Rates</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{machines.length} machines</span>
          <Input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Filter machines" className="h-8 w-48" />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto border border-border">
        <table className="w-max min-w-full border-collapse text-xs">
          <thead className="sticky top-0 z-10 bg-background">
            <tr>
              <th className="sticky left-0 z-20 h-8 border border-border bg-neutral-100 px-2 text-left text-xs font-bold dark:bg-neutral-900">Sl</th>
              <th className="sticky left-10 z-20 h-8 min-w-56 border border-border bg-neutral-100 px-2 text-left text-xs font-bold dark:bg-neutral-900">Particulars</th>
              <th className="h-8 border border-border bg-neutral-100 px-2 text-left text-xs font-bold dark:bg-neutral-900">Code</th>
              <th className="h-8 min-w-40 border border-border bg-neutral-100 px-2 text-left text-xs font-bold dark:bg-neutral-900">Calculation</th>
              {machines.map((machine) => (
                <th key={machine.id} className="h-8 min-w-36 border border-border bg-neutral-100 px-2 text-left text-xs font-bold dark:bg-neutral-900">
                  {machine.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.particulars.map((particular, index) => (
              <tr key={particular.id}>
                <td className="sticky left-0 border border-border bg-background px-2 py-1">{index + 1}</td>
                <td className="sticky left-10 border border-border bg-background px-2 py-1">{particular.name}</td>
                <td className="border border-border px-2 py-1 font-semibold">{particular.code}</td>
                <td className="border border-border px-2 py-1 text-muted-foreground">{particular.is_input ? 'Manual input' : particular.formula}</td>
                {machines.map((machine) => {
                  const key = `${machine.id}:${particular.id}`
                  const value = cellValue(machine, particular)
                  return (
                    <td key={machine.id} className="border border-border px-1 py-1 text-right">
                      {particular.is_input ? (
                        <input
                          className="h-7 w-full border border-input bg-background px-1 text-right"
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
            <tr>
              <td className="sticky left-0 border border-border bg-background px-2 py-2 font-bold" colSpan={2}>Calculated MHR</td>
              <td className="border border-border px-2 py-2 font-bold">MHR</td>
              <td className="border border-border px-2 py-2 text-muted-foreground">(CC + OC) / H</td>
              {machines.map((machine) => (
                <td key={machine.id} className="border border-border px-2 py-2 text-right font-bold">{money(machine.mhr)}</td>
              ))}
            </tr>
            <tr>
              <td className="sticky left-0 border border-border bg-background px-2 py-2 font-bold" colSpan={2}>Recommended MHR</td>
              <td className="border border-border px-2 py-2 font-bold">REC</td>
              <td className="border border-border" />
              {machines.map((machine) => (
                <td key={machine.id} className="border border-border px-1 py-1">
                  <input
                    className="h-7 w-full border border-input bg-background px-1 text-right font-bold"
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
