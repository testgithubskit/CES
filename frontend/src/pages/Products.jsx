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
import { Plus, Trash2 } from 'lucide-react'
import { RowActions } from '../components/common/RowActions'
import { ClearFilter, SortHead, TableSearch, useTableTools } from '../components/common/TableTools'
import { toast } from 'sonner'
import { productsService } from '../services/api/products'
import { TablePager, useMeasuredPage } from '../components/common/TablePager'
import { useAuth } from '../hooks/use-auth'
import { useConfirm } from '../components/common/ConfirmDialog'
import { readList } from '../services/api/client'
import { CustomFieldInputs, TableToolsMenu, keepWithin, useShownColumns } from '../components/common/entityColumns'

const LIMITS = { product_number: 20, product_name: 60, description: 160 }

const productSchema = z.object({
  product_number: z.string().trim().min(1, 'Product number is required').max(LIMITS.product_number),
  product_name: z.string().trim().min(1, 'Product name is required').max(LIMITS.product_name),
  quantity: z.string().trim().regex(/^[1-9]\d*$/, 'Enter a whole number'),
  description: z.string().trim().max(LIMITS.description),
})

const emptyForm = { product_number: '', product_name: '', quantity: '1', description: '' }

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
  return new Date(value).toLocaleDateString('en-IN')
}

function localDay(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function Products() {
  const { user } = useAuth()
  const confirm = useConfirm()
  const isAdmin = String(user?.role || '').toLowerCase() === 'admin'
  const [fields, setFields] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [customValues, setCustomValues] = useState({})
  const [limitNote, setLimitNote] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [createRows, setCreateRows] = useState([])
  const scrollerRef = useRef(null)
  const columns = useMemo(
    () => [...builtinColumns, ...fields.map((field) => ({ key: field.field_key, label: field.label, custom: true }))],
    [fields],
  )
  const shown = useShownColumns('ces-columns-product', columns)
  const datedProducts = useMemo(() => products.filter((product) => {
    const day = localDay(product.created_at)
    if (fromDate && day < fromDate) return false
    if (toDate && day > toDate) return false
    return true
  }), [products, fromDate, toDate])
  const tableRows = useMemo(() => datedProducts.map((product) => ({
    ...product,
    ...(product.custom_fields || {}),
    quantity: Number(product.quantity),
  })), [datedProducts])
  const tools = useTableTools(tableRows, columns.map((column) => column.key))
  const page = useMeasuredPage(tools.rows, scrollerRef)
  const form = useForm({ resolver: zodResolver(productSchema), defaultValues: emptyForm })
  const visibleCount = shown.visible.length + (isAdmin ? 2 : 1)

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

  const emptyCreateRow = () => ({
    product_number: '',
    product_name: '',
    description: '',
    custom_fields: Object.fromEntries(fields.map((field) => [field.field_key, ''])),
  })

  const openCreateDialog = () => {
    setEditingProduct(null)
    setLimitNote('')
    form.reset(emptyForm)
    setCreateRows([emptyCreateRow()])
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
    try {
      await productsService.update(editingProduct.id, {
        product_number: values.product_number,
        product_name: values.product_name,
        quantity: Number(values.quantity),
        description: values.description || null,
        version: editingProduct.version || '1',
        custom_fields: customValues,
      })
      toast.success('Product updated')
      setDialogOpen(false)
      loadProducts()
    } catch (error) {
      toast.error(errorMessage(error, 'Failed to save product'))
    }
  })

  const handleCreate = async (event) => {
    event.preventDefault()
    const rows = createRows.filter((row) => row.product_number.trim() && row.product_name.trim())
    if (!rows.length) {
      toast.error('Add at least one product with number and name')
      return
    }
    try {
      for (const row of rows) {
        await productsService.create({
          product_number: row.product_number.trim().slice(0, LIMITS.product_number),
          product_name: row.product_name.trim().slice(0, LIMITS.product_name),
          quantity: 1,
          description: row.description.trim().slice(0, LIMITS.description) || null,
          version: '1',
          custom_fields: row.custom_fields,
        })
      }
      toast.success(`${rows.length} product${rows.length === 1 ? '' : 's'} created`)
      setDialogOpen(false)
      loadProducts()
    } catch (error) {
      toast.error(errorMessage(error, 'Failed to save product'))
    }
  }

  const updateCreateRow = (index, patch) => {
    setCreateRows((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)))
  }

  const handleDelete = async (product) => {
    if (!(await confirm({ title: 'Delete product', description: `Delete ${product.product_name}? This cannot be undone.` }))) return
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
    if (column.key === 'created_at') return formatDate(product.created_at)
    if (column.key === 'description') return product.description || '-'
    if (column.custom) return product.custom_fields?.[column.key] || '-'
    return product[column.key] || '-'
  }

  return (
    <div className="flex h-[calc(100vh-2rem)] flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-bold">Products</h1>
        <div className="flex flex-wrap items-center gap-2">
          <TableSearch value={tools.query} onChange={tools.setQuery} placeholder="Search products" />
          <label className="flex items-center gap-1 text-xs text-muted-foreground">
            From
            <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className="h-8 border border-input bg-background px-2 text-xs text-foreground" />
          </label>
          <label className="flex items-center gap-1 text-xs text-muted-foreground">
            To
            <input type="date" value={toDate} min={fromDate || undefined} onChange={(event) => setToDate(event.target.value)} className="h-8 border border-input bg-background px-2 text-xs text-foreground" />
          </label>
          <ClearFilter show={Boolean(fromDate || toDate)} onClear={() => { setFromDate(''); setToDate('') }} />
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
          {isAdmin && (
            <Button className="h-8" onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              New Product
            </Button>
          )}
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
                  {isAdmin && <TableHead className="w-20 text-right">Action</TableHead>}
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
                    {isAdmin && (
                      <TableCell className="w-20 text-right">
                        <RowActions onEdit={() => openEditDialog(product)} onDelete={() => handleDelete(product)} />
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <TablePager page={page.page} pages={page.pages} total={page.total} onPage={page.setPage} />
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className={editingProduct ? 'max-w-2xl' : 'max-w-4xl'}>
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">{editingProduct ? 'Edit Product' : 'New Product'}</DialogTitle>
          </DialogHeader>
          {editingProduct ? (
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
              <Button type="submit">Update</Button>
            </DialogFooter>
          </form>
          ) : (
          <form onSubmit={handleCreate} className="space-y-3" autoComplete="off">
            <div className="max-h-[55vh] space-y-3 overflow-auto pr-1">
              {createRows.map((row, index) => (
                <div key={index} className="grid grid-cols-2 gap-3 rounded-lg border border-border p-3">
                  <div className="space-y-1.5">
                    <Label>Product No</Label>
                    <Input
                      autoComplete="off"
                      value={row.product_number}
                      onChange={(event) => updateCreateRow(index, { product_number: keepWithin(event.target.value, LIMITS.product_number, 'Product number', setLimitNote) })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Product Name</Label>
                    <Input
                      autoComplete="off"
                      value={row.product_name}
                      onChange={(event) => updateCreateRow(index, { product_name: keepWithin(event.target.value, LIMITS.product_name, 'Product name', setLimitNote) })}
                    />
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <Label>Description</Label>
                    <textarea
                      rows={2}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={row.description}
                      onChange={(event) => updateCreateRow(index, { description: keepWithin(event.target.value, LIMITS.description, 'Description', setLimitNote) })}
                    />
                  </div>
                  <CustomFieldInputs
                    fields={fields}
                    values={row.custom_fields}
                    onChange={(custom_fields) => updateCreateRow(index, { custom_fields })}
                  />
                  {createRows.length > 1 && (
                    <div className="col-span-2 flex justify-end">
                      <Button type="button" variant="outline" className="h-8" onClick={() => setCreateRows((current) => current.filter((_, rowIndex) => rowIndex !== index))}>
                        <Trash2 className="mr-1 h-3.5 w-3.5" />Remove
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {limitNote && <p className="text-xs text-muted-foreground">{limitNote}</p>}
            <DialogFooter className="sm:justify-between">
              <Button type="button" variant="outline" onClick={() => setCreateRows((current) => [...current, emptyCreateRow()])}>
                <Plus className="mr-1 h-3.5 w-3.5" />Add
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit">Create</Button>
              </div>
            </DialogFooter>
          </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
