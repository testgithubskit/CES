import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent } from '../components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { Label } from '../components/ui/label'
import { Plus } from 'lucide-react'
import { RowActions } from '../components/common/RowActions'
import { SortHead, TableSearch, useTableTools } from '../components/common/TableTools'
import { toast } from 'sonner'
import { workCentersService } from '../services/api/workCenters'
import { TablePager, usePage } from '../components/common/TablePager'

const emptyForm = { code: '', name: '', description: '' }

function errorMessage(error, fallback) {
  const detail = error.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) return detail.map((item) => item.msg).join(', ')
  return fallback
}

export function WorkCenters() {
  const navigate = useNavigate()
  const [workCenters, setWorkCenters] = useState([])
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [formData, setFormData] = useState(emptyForm)

  const loadWorkCenters = async () => {
    setLoading(true)
    try {
      const data = await workCentersService.getAll()
      setWorkCenters(Array.isArray(data) ? data : data.items || [])
    } catch (error) {
      toast.error(errorMessage(error, 'Failed to load work centers'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadWorkCenters()
  }, [])

  const handleSubmit = async (event) => {
    event.preventDefault()
    const payload = {
      code: formData.code.trim(),
      name: formData.name.trim(),
      description: formData.description.trim() || null,
    }
    try {
      if (editingItem) {
        await workCentersService.update(editingItem.id, payload)
        toast.success('Work center updated')
      } else {
        await workCentersService.create({ ...payload, is_active: true })
        toast.success('Work center created')
      }
      setDialogOpen(false)
      setEditingItem(null)
      setFormData(emptyForm)
      loadWorkCenters()
    } catch (error) {
      toast.error(errorMessage(error, editingItem ? 'Failed to update work center' : 'Failed to create work center'))
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this work center?')) return
    try {
      await workCentersService.delete(id)
      toast.success('Work center deleted')
      loadWorkCenters()
    } catch (error) {
      toast.error(errorMessage(error, 'Failed to delete work center'))
    }
  }

  const openCreate = () => {
    setEditingItem(null)
    setFormData(emptyForm)
    setDialogOpen(true)
  }

  const openEdit = (item) => {
    setEditingItem(item)
    setFormData({
      code: item.code || '',
      name: item.name || '',
      description: item.description || '',
    })
    setDialogOpen(true)
  }

  const tools = useTableTools(workCenters, ['code', 'name', 'description'])
  const page = usePage(tools.rows)

  return (
    <div className="flex h-[calc(100vh-2rem)] flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Work Centers</h1>
        </div>
        <TableSearch value={tools.query} onChange={tools.setQuery} placeholder="Search work centers" />
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          New Work Center
        </Button>
      </div>

      <Card className="flex min-h-0 flex-1 flex-col rounded-none">
        <CardContent className="flex min-h-0 flex-1 flex-col p-0">
          <div className="min-h-0 flex-1 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Sl No</TableHead>
                <SortHead label="Code" column="code" sort={tools.sort} onSort={tools.toggleSort} />
                <SortHead label="Work Center" column="name" sort={tools.sort} onSort={tools.toggleSort} />
                <SortHead label="Description" column="description" sort={tools.sort} onSort={tools.toggleSort} />
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">Loading...</TableCell>
                </TableRow>
              ) : workCenters.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">No work centers found</TableCell>
                </TableRow>
              ) : (
                page.rows.map((item, index) => (
                  <TableRow key={item.id} className="cursor-pointer" onClick={() => navigate(`/configuration/work-centers/${item.id}`)}>
                    <TableCell>{(page.page - 1) * page.pageSize + index + 1}</TableCell>
                    <TableCell>{item.code}</TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.description || '-'}</TableCell>
                    <TableCell onClick={(event) => event.stopPropagation()}>
                      <RowActions onEdit={() => openEdit(item)} onDelete={() => handleDelete(item.id)} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>
          <TablePager page={page.page} pages={page.pages} total={page.total} onPage={page.setPage} />
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Work Center' : 'New Work Center'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Code</Label>
              <Input id="code" name="code" value={formData.code} required autoComplete="off" onChange={(event) => setFormData({ ...formData, code: event.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Work Center</Label>
              <Input id="name" name="name" value={formData.name} required autoComplete="off" onChange={(event) => setFormData({ ...formData, name: event.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input id="description" name="description" value={formData.description} autoComplete="off" onChange={(event) => setFormData({ ...formData, description: event.target.value })} />
            </div>
            <DialogFooter>
              <Button type="submit">{editingItem ? 'Update' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
