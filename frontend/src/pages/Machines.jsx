import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Card, CardContent } from '../components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { machinesService } from '../services/api/machines'
import { TablePager, usePage } from '../components/common/TablePager'
import { SortHead, TableSearch, useTableTools } from '../components/common/TableTools'
import { workCentersService } from '../services/api/workCenters'

function errorMessage(error, fallback) {
  const detail = error.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) return detail.map((item) => item.msg).join(', ')
  return fallback
}

function text(value) {
  if (value === null || value === undefined || value === '') return '-'
  return value
}

export function Machines() {
  const { workCenterId } = useParams()
  const [workCenter, setWorkCenter] = useState(null)
  const [machines, setMachines] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const [center, machineList] = await Promise.all([
          workCentersService.getById(workCenterId),
          machinesService.getAll({ work_center_id: workCenterId }),
        ])
        if (cancelled) return
        setWorkCenter(center)
        setMachines(Array.isArray(machineList) ? machineList : machineList.items || [])
      } catch (error) {
        if (!cancelled) toast.error(errorMessage(error, 'Failed to load machines'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [workCenterId])

  const tools = useTableTools(machines, ['type', 'make', 'model', 'cnc_controller', 'cnc_controller_service', 'remarks', 'name'])
  const page = usePage(tools.rows)

  return (
    <div className="space-y-6">
      <div>
        <Link to="/configuration/work-centers" className="mb-3 inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Work Centers
        </Link>
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-heading text-2xl font-bold">{workCenter?.name || 'Machines'}</h1>
          <TableSearch value={tools.query} onChange={tools.setQuery} placeholder="Search machines" />
        </div>
      </div>

      <Card>
        <CardContent className="overflow-x-auto pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Sl No</TableHead>
                <SortHead label="Type" column="type" sort={tools.sort} onSort={tools.toggleSort} />
                <SortHead label="Make" column="make" sort={tools.sort} onSort={tools.toggleSort} />
                <SortHead label="Model" column="model" sort={tools.sort} onSort={tools.toggleSort} />
                <SortHead label="Year" column="year_of_installation" sort={tools.sort} onSort={tools.toggleSort} />
                <SortHead label="CNC Controller" column="cnc_controller" sort={tools.sort} onSort={tools.toggleSort} />
                <SortHead label="Service" column="cnc_controller_service" sort={tools.sort} onSort={tools.toggleSort} />
                <SortHead label="Remarks" column="remarks" sort={tools.sort} onSort={tools.toggleSort} />
                <SortHead label="MHR" column="mhr" sort={tools.sort} onSort={tools.toggleSort} className="text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center">Loading...</TableCell>
                </TableRow>
              ) : page.rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground">No machines found</TableCell>
                </TableRow>
              ) : (
                page.rows.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell>{(page.page - 1) * page.pageSize + index + 1}</TableCell>
                    <TableCell>{text(item.type)}</TableCell>
                    <TableCell>{text(item.make)}</TableCell>
                    <TableCell>{text(item.model)}</TableCell>
                    <TableCell>{text(item.year_of_installation)}</TableCell>
                    <TableCell>{text(item.cnc_controller)}</TableCell>
                    <TableCell>{text(item.cnc_controller_service)}</TableCell>
                    <TableCell className="max-w-xs whitespace-pre-wrap">{text(item.remarks)}</TableCell>
                    <TableCell className="text-right">{text(item.recommended_mhr ?? item.mhr)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <TablePager page={page.page} pages={page.pages} total={page.total} onPage={page.setPage} />
        </CardContent>
      </Card>
    </div>
  )
}
