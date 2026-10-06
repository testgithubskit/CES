import { useState, useEffect } from 'react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog'
import { Label } from '../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Plus, Edit, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { machinesService } from '../services/api/machines'
import { workCentersService } from '../services/api/workCenters'

export function Machines() {
  const [machines, setMachines] = useState([])
  const [workCenters, setWorkCenters] = useState([])
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    work_center_id: '',
    machine_type: '',
    manufacturer: '',
    model: '',
    capacity: '',
    status: 'active',
  })

  useEffect(() => {
    loadMachines()
    loadWorkCenters()
  }, [])

  const loadMachines = async () => {
    setLoading(true)
    try {
      const data = await machinesService.getAll()
      setMachines(data.items || data)
    } catch (error) {
      toast.error('Failed to load machines')
    } finally {
      setLoading(false)
    }
  }

  const loadWorkCenters = async () => {
    try {
      const data = await workCentersService.getAll()
      setWorkCenters(data.items || data)
    } catch (error) {
      console.error('Failed to load work centers')
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      await machinesService.create(formData)
      toast.success('Machine created successfully')
      setDialogOpen(false)
      setFormData({ name: '', description: '', work_center_id: '', machine_type: '', manufacturer: '', model: '', capacity: '', status: 'active' })
      loadMachines()
    } catch (error) {
      toast.error('Failed to create machine')
    }
  }

  const handleUpdate = async (e) => {
    e.preventDefault()
    try {
      await machinesService.update(editingItem.id, formData)
      toast.success('Machine updated successfully')
      setDialogOpen(false)
      setEditingItem(null)
      setFormData({ name: '', description: '', work_center_id: '', machine_type: '', manufacturer: '', model: '', capacity: '', status: 'active' })
      loadMachines()
    } catch (error) {
      toast.error('Failed to update machine')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this machine?')) return
    try {
      await machinesService.delete(id)
      toast.success('Machine deleted successfully')
      loadMachines()
    } catch (error) {
      toast.error('Failed to delete machine')
    }
  }

  const openCreateDialog = () => {
    setEditingItem(null)
    setFormData({ name: '', description: '', work_center_id: '', machine_type: '', manufacturer: '', model: '', capacity: '', status: 'active' })
    setDialogOpen(true)
  }

  const openEditDialog = (item) => {
    setEditingItem(item)
    setFormData({
      name: item.name,
      description: item.description,
      work_center_id: item.work_center_id,
      machine_type: item.machine_type,
      manufacturer: item.manufacturer,
      model: item.model,
      capacity: item.capacity,
      status: item.status,
    })
    setDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Machines</h1>
          <p className="text-muted-foreground">Manage manufacturing machines</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-brand-500 hover:bg-brand-600" onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              New Machine
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Edit Machine' : 'Create Machine'}</DialogTitle>
              <DialogDescription>
                {editingItem ? 'Update machine information' : 'Add a new machine'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={editingItem ? handleUpdate : handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="work_center_id">Work Center</Label>
                  <Select value={formData.work_center_id} onValueChange={(value) => setFormData({ ...formData, work_center_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select work center" />
                    </SelectTrigger>
                    <SelectContent>
                      {workCenters.map((wc) => (
                        <SelectItem key={wc.id} value={wc.id}>
                          {wc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="machine_type">Machine Type</Label>
                  <Input
                    id="machine_type"
                    value={formData.machine_type}
                    onChange={(e) => setFormData({ ...formData, machine_type: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="manufacturer">Manufacturer</Label>
                  <Input
                    id="manufacturer"
                    value={formData.manufacturer}
                    onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="model">Model</Label>
                  <Input
                    id="model"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="capacity">Capacity</Label>
                  <Input
                    id="capacity"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="submit" className="bg-brand-500 hover:bg-brand-600">
                  {editingItem ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Machines List</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Work Center</TableHead>
                <TableHead>Manufacturer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : machines.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No machines found
                  </TableCell>
                </TableRow>
              ) : (
                machines.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.machine_type || '-'}</TableCell>
                    <TableCell>{workCenters.find((wc) => wc.id === item.work_center_id)?.name || '-'}</TableCell>
                    <TableCell>{item.manufacturer || '-'}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        item.status === 'active' ? 'bg-green-100 text-green-800' :
                        item.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {item.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(item)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
