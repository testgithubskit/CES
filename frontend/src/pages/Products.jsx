import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
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
import { productsService } from '../services/api/products'
import { TablePager, usePage } from '../components/common/TablePager'

const emptyForm = {
  product_number: '',
  product_name: '',
  quantity: '',
  description: '',
}

function errorMessage(error, fallback) {
  const detail = error.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) return detail.map((item) => item.msg).join(', ')
  return fallback
}

function formatDate(value) {
  if (!value) return '-'
  return new Date(value).toLocaleString()
}

export function Products() {
  const [products, setProducts] = useState([])
  const tools = useTableTools(products, ['product_number', 'product_name', 'description'])
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [formData, setFormData] = useState(emptyForm)

  const loadProducts = async () => {
    setLoading(true)
    try {
      const data = await productsService.getAll()
      setProducts(Array.isArray(data) ? data : data.items || [])
    } catch (error) {
      toast.error(errorMessage(error, 'Failed to load products'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProducts()
  }, [])

  const openCreateDialog = () => {
    setEditingProduct(null)
    setFormData(emptyForm)
    setDialogOpen(true)
  }

  const openEditDialog = (product) => {
    setEditingProduct(product)
    setFormData({
      product_number: product.product_number,
      product_name: product.product_name,
      quantity: String(product.quantity ?? ''),
      description: product.description || '',
    })
    setDialogOpen(true)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const payload = {
      product_number: formData.product_number.trim(),
      product_name: formData.product_name.trim(),
      quantity: Number(formData.quantity),
      description: formData.description.trim() || null,
      version: editingProduct?.version || '1',
    }
    try {
      if (editingProduct) {
        await productsService.update(editingProduct.id, payload)
        toast.success('Product updated')
      } else {
        await productsService.create(payload)
        toast.success('Product created')
      }
      setDialogOpen(false)
      loadProducts()
    } catch (error) {
      toast.error(errorMessage(error, 'Failed to save product'))
    }
  }

  const handleDelete = async (product) => {
    if (!confirm(`Delete ${product.product_name}?`)) return
    try {
      await productsService.delete(product.id)
      toast.success('Product deleted')
      loadProducts()
    } catch (error) {
      toast.error(errorMessage(error, 'Failed to delete product'))
    }
  }

  const page = usePage(tools.rows)

  return (
    <div className="flex h-[calc(100vh-2rem)] flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Products</h1>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          New Product
        </Button>
      </div>

      <TableSearch value={tools.query} onChange={tools.setQuery} placeholder="Search products" />

      <Card className="flex min-h-0 flex-1 flex-col rounded-none">
        <CardContent className="flex min-h-0 flex-1 flex-col p-0">
          <div className="min-h-0 flex-1 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sl No</TableHead>
                <SortHead label="Product No" column="product_number" sort={tools.sort} onSort={tools.toggleSort} />
                <SortHead label="Product" column="product_name" sort={tools.sort} onSort={tools.toggleSort} />
                <SortHead label="Qty" column="quantity" sort={tools.sort} onSort={tools.toggleSort} />
                <SortHead label="Description" column="description" sort={tools.sort} onSort={tools.toggleSort} />
                <TableHead>Created By</TableHead>
                <SortHead label="Created At" column="created_at" sort={tools.sort} onSort={tools.toggleSort} />
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8}>Loading products...</TableCell>
                </TableRow>
              ) : page.rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8}>No products yet</TableCell>
                </TableRow>
              ) : (
                page.rows.map((product, index) => (
                  <TableRow key={product.id}>
                    <TableCell>{(page.page - 1) * page.pageSize + index + 1}</TableCell>
                    <TableCell>{product.product_number}</TableCell>
                    <TableCell>
                      <Link to={`/products/${product.id}`} className="font-medium underline underline-offset-2">
                        {product.product_name}
                      </Link>
                    </TableCell>
                    <TableCell>{Number(product.quantity)}</TableCell>
                    <TableCell>{product.description || '-'}</TableCell>
                    <TableCell>{product.created_by_name || '-'}</TableCell>
                    <TableCell>{formatDate(product.created_at)}</TableCell>
                    <TableCell>
                      <RowActions onEdit={() => openEditDialog(product)} onDelete={() => handleDelete(product)} />
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
            <DialogTitle>{editingProduct ? 'Edit Product' : 'New Product'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
            <div className="space-y-2">
              <Label htmlFor="product_number">Product No</Label>
              <Input
                id="product_number"
                value={formData.product_number}
                onChange={(event) => setFormData({ ...formData, product_number: event.target.value })}
                required
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="product_name">Product Name</Label>
              <Input
                id="product_name"
                value={formData.product_name}
                onChange={(event) => setFormData({ ...formData, product_name: event.target.value })}
                required
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">Qty</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                step="1"
                value={formData.quantity}
                onChange={(event) => setFormData({ ...formData, quantity: event.target.value })}
                required
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(event) => setFormData({ ...formData, description: event.target.value })}
                autoComplete="off"
              />
            </div>
            <DialogFooter>
              <Button type="submit">
                {editingProduct ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
