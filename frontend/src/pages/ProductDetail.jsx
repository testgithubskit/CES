import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog'
import { Label } from '../components/ui/label'
import { Input } from '../components/ui/input'
import { Plus, ChevronRight, ChevronDown, Edit, Trash2, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { productsService } from '../services/api/products'
import { bomService } from '../services/api/bom'

export function ProductDetail() {
  const { id } = useParams()
  const [product, setProduct] = useState(null)
  const [assemblies, setAssemblies] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogType, setDialogType] = useState('assembly')
  const [parentId, setParentId] = useState(null)
  const [editingItem, setEditingItem] = useState(null)
  const [formData, setFormData] = useState({ name: '', description: '' })
  const [expandedItems, setExpandedItems] = useState({})

  useEffect(() => {
    loadProduct()
    loadAssemblies()
  }, [id])

  const loadProduct = async () => {
    try {
      const data = await productsService.getById(id)
      setProduct(data)
    } catch (error) {
      toast.error('Failed to load product')
    }
  }

  const loadAssemblies = async () => {
    setLoading(true)
    try {
      const data = await bomService.getAssemblies(id)
      setAssemblies(data.items || data)
    } catch (error) {
      toast.error('Failed to load BOM')
    } finally {
      setLoading(false)
    }
  }

  const toggleExpand = (itemId) => {
    setExpandedItems((prev) => ({ ...prev, [itemId]: !prev[itemId] }))
  }

  const openCreateDialog = (type, parentId = null) => {
    setDialogType(type)
    setParentId(parentId)
    setEditingItem(null)
    setFormData({ name: '', description: '' })
    setDialogOpen(true)
  }

  const openEditDialog = (type, item) => {
    setDialogType(type)
    setParentId(item.parent_id)
    setEditingItem(item)
    setFormData({ name: item.name, description: item.description })
    setDialogOpen(true)
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      if (dialogType === 'assembly') {
        await bomService.createAssembly(id, formData)
      } else if (dialogType === 'subassembly') {
        await bomService.createSubAssembly(parentId, formData)
      } else if (dialogType === 'part') {
        await bomService.createPart(parentId, formData)
      }
      toast.success(`${dialogType} created successfully`)
      setDialogOpen(false)
      setFormData({ name: '', description: '' })
      loadAssemblies()
    } catch (error) {
      toast.error(`Failed to create ${dialogType}`)
    }
  }

  const handleUpdate = async (e) => {
    e.preventDefault()
    try {
      if (dialogType === 'assembly') {
        await bomService.updateAssembly(editingItem.id, formData)
      } else if (dialogType === 'subassembly') {
        await bomService.updateSubAssembly(editingItem.id, formData)
      } else if (dialogType === 'part') {
        await bomService.updatePart(editingItem.id, formData)
      }
      toast.success(`${dialogType} updated successfully`)
      setDialogOpen(false)
      setEditingItem(null)
      setFormData({ name: '', description: '' })
      loadAssemblies()
    } catch (error) {
      toast.error(`Failed to update ${dialogType}`)
    }
  }

  const handleDelete = async (type, itemId) => {
    if (!confirm(`Are you sure you want to delete this ${type}?`)) return
    try {
      if (type === 'assembly') {
        await bomService.deleteAssembly(itemId)
      } else if (type === 'subassembly') {
        await bomService.deleteSubAssembly(itemId)
      } else if (type === 'part') {
        await bomService.deletePart(itemId)
      }
      toast.success(`${type} deleted successfully`)
      loadAssemblies()
    } catch (error) {
      toast.error(`Failed to delete ${type}`)
    }
  }

  const renderBOMTree = (items, level = 0) => {
    if (!items || items.length === 0) return null

    return items.map((item) => (
      <div key={item.id} className="border-l-2 border-muted ml-4 pl-4">
        <div className="flex items-center gap-2 py-2">
          {item.type !== 'part' && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => toggleExpand(item.id)}
            >
              {expandedItems[item.id] ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          )}
          <span className="font-medium">{item.name}</span>
          <span className="text-sm text-muted-foreground">({item.type})</span>
          <div className="ml-auto flex gap-2">
            {item.type === 'part' && (
              <Link to={`/parts/${item.id}`}>
                <Button variant="ghost" size="sm">
                  View Details
                </Button>
              </Link>
            )}
            <Button variant="ghost" size="icon" onClick={() => openEditDialog(item.type, item)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => handleDelete(item.type, item.id)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
        {item.type !== 'part' && expandedItems[item.id] && item.children && (
          <div className="mt-2">
            {renderBOMTree(item.children, level + 1)}
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={() => openCreateDialog(item.type === 'assembly' ? 'subassembly' : 'part', item.id)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add {item.type === 'assembly' ? 'Subassembly' : 'Part'}
            </Button>
          </div>
        )}
      </div>
    ))
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/products">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{product?.name}</h1>
          <p className="text-muted-foreground">{product?.description}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Bill of Materials</CardTitle>
              <CardDescription>Product structure with assemblies, subassemblies, and parts</CardDescription>
            </div>
            <Button className="bg-brand-500 hover:bg-brand-600" onClick={() => openCreateDialog('assembly')}>
              <Plus className="mr-2 h-4 w-4" />
              Add Assembly
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {assemblies.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No assemblies added yet. Click "Add Assembly" to start building the BOM.
            </div>
          ) : (
            <div className="space-y-2">
              {renderBOMTree(assemblies)}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingItem ? `Edit ${dialogType}` : `Create ${dialogType}`}
            </DialogTitle>
            <DialogDescription>
              {editingItem ? `Update ${dialogType} information` : `Add a new ${dialogType} to the BOM`}
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
            <DialogFooter>
              <Button type="submit" className="bg-brand-500 hover:bg-brand-600">
                {editingItem ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
