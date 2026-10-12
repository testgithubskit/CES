import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { Label } from '../components/ui/label'
import { ArrowLeft, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { machinesService } from '../services/api/machines'
import { TablePager, usePage } from '../components/common/TablePager'
import { SortHead, TableSearch, useTableTools } from '../components/common/TableTools'
import { workCentersService } from '../services/api/workCenters'

const emptyForm = {
  name: '',
  machine_code: '',
  type: '',
  make: '',
  model: '',
  year_of_installation: '',
  cnc_controller: '',
  cnc_controller_service: '',
  remarks: '',
  is_active: true,
}

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
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState(emptyForm)

  const load = async () => {
    setLoading(true)
    try {
      const [center, machineList] = await Promise.all([
        workCentersService.getById(workCenterId),
        machinesService.getAll({ work_center_id: workCenterId }),
      ])
      setWorkCenter(center)
      setMachines(Array.isArray(machineList) ? machineList : machineList.items || [])
    } catch (error) {
      toast.error(errorMessage(error, 'Failed to load machines'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [workCenterId])

  const openCreate = () => {
    setFormData(emptyForm)
    setDialogOpen(true)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const payload = {
      work_center_id: Number(workCenterId),
      name: formData.name.trim(),
      machine_code: formData.machine_code.trim(),
      type: formData.type.trim(),
      make: formData.make.trim(),
      model: formData.model.trim(),
      year_of_installation: formData.year_of_installation === '' ? 0 : Number(formData.year_of_installation),
      cnc_controller: formData.cnc_controller.trim(),
      cnc_controller_service: formData.cnc_controller_service.trim(),
      remarks: formData.remarks.trim(),
      is_active: formData.is_active,
    }
    setSaving(true)
    try {
      await machinesService.create(payload)
      toast.success('Machine added')
      setDialogOpen(false)
      setFormData(emptyForm)
      await load()
    } catch (error) {
      toast.error(errorMessage(error, 'Failed to add machine'))
    } finally {
      setSaving(false)
    }
  }

  const setField = (key) => (event) => setFormData((current) => ({ ...current, [key]: event.target.value }))

  const tools = useTableTools(machines, ['name', 'machine_code', 'type', 'make', 'model', 'cnc_controller', 'cnc_controller_service', 'remarks'])
  const page = usePage(tools.rows)

  return (
    <div className="flex h-[calc(100vh-2rem)] flex-col gap-3">
      <div>
        <Link to="/configuration/work-centers" className="mb-3 inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Work Centers
        </Link>
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-heading text-2xl font-bold">{workCenter?.name || 'Machines'}</h1>
          <div className="flex items-center gap-2">
            <TableSearch value={tools.query} onChange={tools.setQuery} placeholder="Search machines" />
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Add Machine
            </Button>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-auto">
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
        </div>
        <TablePager page={page.page} pages={page.pages} total={page.total} onPage={page.setPage} />
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Machine</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={formData.name} onChange={setField('name')} required autoComplete="off" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="machine_code">Machine Code</Label>
                <Input id="machine_code" value={formData.machine_code} onChange={setField('machine_code')} required autoComplete="off" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Input id="type" value={formData.type} onChange={setField('type')} autoComplete="off" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="make">Make</Label>
                <Input id="make" value={formData.make} onChange={setField('make')} autoComplete="off" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Input id="model" value={formData.model} onChange={setField('model')} autoComplete="off" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="year_of_installation">Year</Label>
                <Input id="year_of_installation" type="number" min="0" value={formData.year_of_installation} onChange={setField('year_of_installation')} autoComplete="off" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cnc_controller">CNC Controller</Label>
                <Input id="cnc_controller" value={formData.cnc_controller} onChange={setField('cnc_controller')} autoComplete="off" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cnc_controller_service">Service</Label>
                <Input id="cnc_controller_service" value={formData.cnc_controller_service} onChange={setField('cnc_controller_service')} autoComplete="off" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="remarks">Remarks</Label>
              <Input id="remarks" value={formData.remarks} onChange={setField('remarks')} autoComplete="off" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(event) => setFormData((current) => ({ ...current, is_active: event.target.checked }))}
              />
              Active
            </label>
            <DialogFooter>
              <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Add Machine'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
