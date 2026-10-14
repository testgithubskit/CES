import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
import { TablePager, useMeasuredPage } from '../components/common/TablePager'
import { useAuth } from '../hooks/use-auth'
import { readList } from '../services/api/client'
import { CustomFieldInputs, TableToolsMenu, keepWithin, useShownColumns } from '../components/common/entityColumns'

const LIMITS = { product_number: 20, product_name: 60, description: 160 }

const productSchema = z.object({
  product_number: z.string().trim().min(1, 'Product number is required').max(LIMITS.product_number),
  product_name: z.string().trim().min(1, 'Product name is required').max(LIMITS.product_name),
  quantity: z.string().trim().regex(/^[1-9]\d*$/, 'Enter a whole number'),
  description: z.string().trim().max(LIMITS.description),
})

const emptyForm = { product_number: '', product_name: '', quantity: '', description: '' }

const builtinColumns = [
  { key: 'product_number', label: 'Product No' },
  { key: 'product_name', label: 'Product' },
  { key: 'quantity', label: 'Qty' },
  { key: 'description', label: 'Description' },
  { key: 'created_by_name', label: 'Created By' },
  { key: 'created_at', label: 'Created At' },
]

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
  const { user } = useAuth()
  const isAdmin = String(user?.role || '').toLowerCase() === 'admin'
  const [fields, setFields] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [customValues, setCustomValues] = useState({})
  const [limitNote, setLimitNote] = useState('')
  const scrollerRef = useRef(null)
  const columns = useMemo(
    () => [...builtinColumns, ...fields.map((field) => ({ key: field.field_key, label: field.label, custom: true }))],
    [fields],
  )
  const shown = useShownColumns('ces-columns-product', columns)
  const tableRows = useMemo(() => products.map((product) => ({
    ...product,
    ...(product.custom_fields || {}),
    quantity: Number(product.quantity),
    created_at: formatDate(product.created_at),
  })), [products])
  const tools = useTableTools(tableRows, columns.map((column) => column.key))
  const page = useMeasuredPage(tools.rows, scrollerRef)
  const form = useForm({ resolver: zodResolver(productSchema), defaultValues: emptyForm })
  const visibleCount = shown.visible.length + 2

  const loadProducts = async () => {
    setLoading(true)
    try {
      const data = readList(await productsService.getAll())
      setProducts(data.items)
      setFields(data.custom_columns)
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
    setLimitNote('')
    form.reset(emptyForm)
    setCustomValues(Object.fromEntries(fields.map((field) => [field.field_key, ''])))
    setDialogOpen(true)
  }

  const openEditDialog = (product) => {
    setEditingProduct(product)
    setLimitNote('')
    form.reset({
      product_number: product.product_number || '',
      product_name: product.product_name || '',
      quantity: String(product.quantity ?? ''),
      description: product.description || '',
    })
    setCustomValues(Object.fromEntries(fields.map((field) => [field.field_key, product.custom_fields?.[field.field_key] || ''])))
    setDialogOpen(true)
  }

  const handleSubmit = form.handleSubmit(async (values) => {
    const payload = {
      product_number: values.product_number,
      product_name: values.product_name,
      quantity: Number(values.quantity),
      description: values.description || null,
      version: editingProduct?.version || '1',
      custom_fields: customValues,
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
  })

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

  const bindLimited = (name, max, label) => form.register(name, {
    onChange: (event) => {
      const next = keepWithin(event.target.value, max, label, setLimitNote)
      if (next !== event.target.value) form.setValue(name, next)
    },
  })

  const cellValue = (product, column) => {
    if (column.key === 'product_name') {
      return (
        <Link to={`/products/${product.id}`} className="font-medium underline underline-offset-2">
          {product.product_name}
        </Link>
      )
    }
    if (column.key === 'description') return product.description || '-'
    if (column.custom) return product.custom_fields?.[column.key] || '-'
    return product[column.key] || '-'
  }

  return (
    <div className="flex h-[calc(100vh-2rem)] flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-bold">Products</h1>
        <div className="flex items-center gap-2">
          <TableSearch value={tools.query} onChange={tools.setQuery} placeholder="Search products" />
          <TableToolsMenu
            entityType="product"
            isAdmin={isAdmin}
            fields={fields}
            onFields={loadProducts}
            columns={columns}
            isShown={shown.isShown}
            onToggle={shown.toggle}
            rows={tools.rows}
            title="Products"
          />
          <Button className="h-8" onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            New Product
          </Button>
        </div>
      </div>

      <Card className="flex min-h-0 flex-1 flex-col rounded-none border-0 shadow-none">
        <CardContent className="flex min-h-0 flex-1 flex-col p-0">
          <div ref={scrollerRef} className="min-h-0 flex-1 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">Sl No</TableHead>
                  {shown.visible.map((column) => (
                    <SortHead key={column.key} label={column.label} column={column.key} sort={tools.sort} onSort={tools.toggleSort} />
                  ))}
                  <TableHead className="w-20 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={visibleCount}>Loading products...</TableCell></TableRow>
                ) : page.rows.length === 0 ? (
                  <TableRow><TableCell colSpan={visibleCount}>No products yet</TableCell></TableRow>
                ) : page.rows.map((product, index) => (
                  <TableRow key={product.id}>
                    <TableCell>{(page.page - 1) * page.pageSize + index + 1}</TableCell>
                    {shown.visible.map((column) => (
                      <TableCell key={column.key}>{cellValue(product, column)}</TableCell>
                    ))}
                    <TableCell className="w-20 text-right">
                      <RowActions onEdit={() => openEditDialog(product)} onDelete={() => handleDelete(product)} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <TablePager page={page.page} pages={page.pages} total={page.total} onPage={page.setPage} />
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">{editingProduct ? 'Edit Product' : 'New Product'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4" autoComplete="off">
            <div className="space-y-1.5">
              <Label htmlFor="product_number">Product No</Label>
              <Input id="product_number" autoComplete="off" {...bindLimited('product_number', LIMITS.product_number, 'Product number')} />
              {form.formState.errors.product_number && <p className="text-xs text-muted-foreground">{form.formState.errors.product_number.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="product_name">Product Name</Label>
              <Input id="product_name" autoComplete="off" {...bindLimited('product_name', LIMITS.product_name, 'Product name')} />
              {form.formState.errors.product_name && <p className="text-xs text-muted-foreground">{form.formState.errors.product_name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="quantity">Qty</Label>
              <Input
                id="quantity"
                inputMode="numeric"
                autoComplete="off"
                value={form.watch('quantity')}
                onChange={(event) => form.setValue('quantity', event.target.value.replace(/\D/g, ''), { shouldValidate: true })}
              />
              {form.formState.errors.quantity && <p className="text-xs text-muted-foreground">{form.formState.errors.quantity.message}</p>}
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                {...bindLimited('description', LIMITS.description, 'Description')}
              />
              {form.formState.errors.description && <p className="text-xs text-muted-foreground">{form.formState.errors.description.message}</p>}
            </div>
            <CustomFieldInputs fields={fields} values={customValues} onChange={setCustomValues} />
            {limitNote && <p className="col-span-2 text-xs text-muted-foreground">{limitNote}</p>}
            <DialogFooter className="col-span-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit">{editingProduct ? 'Update' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
