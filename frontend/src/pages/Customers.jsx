import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent } from '../components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog'
import { Label } from '../components/ui/label'
import { Plus } from 'lucide-react'
import { RowActions } from '../components/common/RowActions'
import { SortHead, TableSearch, useTableTools } from '../components/common/TableTools'
import { toast } from 'sonner'
import { customersService } from '../services/api/customers'
import { TablePager, useMeasuredPage } from '../components/common/TablePager'
import { useAuth } from '../hooks/use-auth'
import { useConfirm } from '../components/common/ConfirmDialog'
import { readList } from '../services/api/client'
import { CustomFieldInputs, TableToolsMenu, useShownColumns } from '../components/common/entityColumns'

export function Customers({ embedded = false }) {
  const { user } = useAuth()
  const confirm = useConfirm()
  const isAdmin = String(user?.role || '').toLowerCase() === 'admin'
  const [fields, setFields] = useState([])
  const [customers, setCustomers] = useState([])
  const [customValues, setCustomValues] = useState({})
  const scrollerRef = useRef(null)
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [formData, setFormData] = useState({
    company_name: '',
    branch: '',
    contact_person: '',
    email: '',
    contact_number: '',
    address: '',
  })

  useEffect(() => {
    loadCustomers()
  }, [])

  const loadCustomers = async () => {
    setLoading(true)
    try {
      const data = readList(await customersService.getAll())
      setCustomers(data.items)
      setFields(data.custom_columns)
    } catch (error) {
      toast.error('Failed to load customers')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      await customersService.create({ ...formData, custom_fields: customValues })
      toast.success('Customer created successfully')
      setDialogOpen(false)
      setFormData({ company_name: '', branch: '', contact_person: '', email: '', contact_number: '', address: '' })
      loadCustomers()
    } catch (error) {
      toast.error('Failed to create customer')
    }
  }

  const handleUpdate = async (e) => {
    e.preventDefault()
    try {
      await customersService.update(editingItem.id, { ...formData, custom_fields: customValues })
      toast.success('Customer updated successfully')
      setDialogOpen(false)
      setEditingItem(null)
      setFormData({ company_name: '', branch: '', contact_person: '', email: '', contact_number: '', address: '' })
      loadCustomers()
    } catch (error) {
      toast.error('Failed to update customer')
    }
  }

  const handleDelete = async (id) => {
    if (!(await confirm({ title: 'Delete customer', description: 'Delete this customer? This cannot be undone.' }))) return
    try {
      await customersService.delete(id)
      toast.success('Customer deleted successfully')
      loadCustomers()
    } catch (error) {
      toast.error('Failed to delete customer')
    }
  }

  const openCreateDialog = () => {
    setEditingItem(null)
    setFormData({ company_name: '', branch: '', contact_person: '', email: '', contact_number: '', address: '' })
    setCustomValues(Object.fromEntries(fields.map((field) => [field.field_key, ''])))
    setDialogOpen(true)
  }

  const openEditDialog = (item) => {
    setEditingItem(item)
    setFormData({
      company_name: item.company_name || '',
      branch: item.branch || '',
      contact_person: item.contact_person || '',
      email: item.email || '',
      contact_number: item.contact_number || '',
      address: item.address || '',
    })
    setCustomValues(Object.fromEntries(fields.map((field) => [field.field_key, item.custom_fields?.[field.field_key] || ''])))
    setDialogOpen(true)
  }

  const columns = useMemo(() => [
    { key: 'company_name', label: 'Company' },
    { key: 'branch', label: 'Branch' },
    { key: 'contact_person', label: 'Contact' },
    { key: 'email', label: 'Email' },
    { key: 'contact_number', label: 'Phone' },
    ...fields.map((field) => ({ key: field.field_key, label: field.label, custom: true })),
  ], [fields])
  const shown = useShownColumns('ces-columns-customer', columns)
  const tools = useTableTools(customers.map((item) => ({ ...item, ...(item.custom_fields || {}) })), columns.map((column) => column.key))
  const page = useMeasuredPage(tools.rows, scrollerRef)

  return (
    <div className={`flex flex-col gap-3 ${embedded ? 'h-full min-h-0' : 'h-[calc(100vh-2rem)]'}`}>
      <div className="flex items-center gap-3">
        {!embedded && <h1 className="font-heading text-2xl font-bold">Customers</h1>}
        <TableSearch value={tools.query} onChange={tools.setQuery} placeholder="Search customers" />
        <div className="ml-auto flex items-center gap-2">
          <TableToolsMenu entityType="customer" isAdmin={isAdmin} fields={fields} onFields={loadCustomers} columns={columns} isShown={shown.isShown} onToggle={shown.toggle} rows={tools.rows} title="Customers" />
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              New Customer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Edit Customer' : 'Create Customer'}</DialogTitle>
              <DialogDescription>
                {editingItem ? 'Update customer information' : 'Add a new customer'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={editingItem ? handleUpdate : handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company_name">Company</Label>
                  <Input
                    id="company_name"
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                  <Label htmlFor="contact_number">Phone</Label>
                  <Input
                    id="contact_number"
                    value={formData.contact_number}
                    onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                  />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="branch">Branch</Label>
                  <Input id="branch" value={formData.branch} onChange={(e) => setFormData({ ...formData, branch: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact_person">Contact</Label>
                  <Input id="contact_person" value={formData.contact_person} onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })} />
                </div>
              </div>
              <CustomFieldInputs fields={fields} values={customValues} onChange={setCustomValues} />
              <DialogFooter>
                <Button type="submit">
                  {editingItem ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <Card className="flex min-h-0 flex-1 flex-col rounded-none border-0 shadow-none">
        <CardContent className="flex min-h-0 flex-1 flex-col p-0">
          <div ref={scrollerRef} className="min-h-0 flex-1 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sl No</TableHead>
                {shown.visible.map((column) => (
                  <SortHead key={column.key} label={column.label} column={column.key} sort={tools.sort} onSort={tools.toggleSort} />
                ))}
                <TableHead className="w-20 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={shown.visible.length + 2} className="text-center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : page.rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={shown.visible.length + 2} className="text-center text-muted-foreground">
                    No customers found
                  </TableCell>
                </TableRow>
              ) : (
                page.rows.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell>{(page.page - 1) * page.pageSize + index + 1}</TableCell>
                    {shown.visible.map((column) => (
                      <TableCell key={column.key} className={column.key === 'company_name' ? 'font-medium' : ''}>
                        {(column.custom ? item.custom_fields?.[column.key] : item[column.key]) || '-'}
                      </TableCell>
                    ))}
                    <TableCell className="text-right">
                      <RowActions onEdit={() => openEditDialog(item)} onDelete={() => handleDelete(item.id)} />
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
    </div>
  )
}
