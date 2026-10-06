import { useState } from 'react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog'
import { Label } from '../components/ui/label'
import { Plus, Edit, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { workCentersService } from '../services/api/workCenters'

export function WorkCenters() {
  const [workCenters, setWorkCenters] = useState([])
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: '',
  })

  const loadWorkCenters = async () => {
    setLoading(true)
    try {
      const data = await workCentersService.getAll()
      setWorkCenters(data.items || data)
    } catch (error) {
      toast.error('Failed to load work centers')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      await workCentersService.create(formData)
      toast.success('Work center created successfully')
      setDialogOpen(false)
      setFormData({ name: '', description: '', location: '' })
      loadWorkCenters()
    } catch (error) {
      toast.error('Failed to create work center')
    }
  }

  const handleUpdate = async (e) => {
    e.preventDefault()
    try {
      await workCentersService.update(editingItem.id, formData)
      toast.success('Work center updated successfully')
      setDialogOpen(false)
      setEditingItem(null)
      setFormData({ name: '', description: '', location: '' })
      loadWorkCenters()
    } catch (error) {
      toast.error('Failed to update work center')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this work center?')) return
    try {
      await workCentersService.delete(id)
      toast.success('Work center deleted successfully')
      loadWorkCenters()
    } catch (error) {
      toast.error('Failed to delete work center')
    }
  }

  const openCreateDialog = () => {
    setEditingItem(null)
    setFormData({ name: '', description: '', location: '' })
    setDialogOpen(true)
  }

  const openEditDialog = (item) => {
    setEditingItem(item)
    setFormData({
      name: item.name,
      description: item.description,
      location: item.location,
    })
    setDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Work Centers</h1>
          <p className="text-muted-foreground">Manage manufacturing work centers</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-brand-500 hover:bg-brand-600" onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              New Work Center
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Edit Work Center' : 'Create Work Center'}</DialogTitle>
              <DialogDescription>
                {editingItem ? 'Update work center information' : 'Add a new work center'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={editingItem ? handleUpdate : handleCreate} className="space-y-4">
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
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
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
          <CardTitle>Work Centers List</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : workCenters.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No work centers found
                  </TableCell>
                </TableRow>
              ) : (
                workCenters.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.description || '-'}</TableCell>
                    <TableCell>{item.location || '-'}</TableCell>
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
