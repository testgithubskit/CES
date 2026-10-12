import { useEffect, useState } from 'react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog'
import { Label } from '../components/ui/label'
import { Plus } from 'lucide-react'
import { RowActions } from '../components/common/RowActions'
import { SortHead, TableSearch, useTableTools } from '../components/common/TableTools'
import { toast } from 'sonner'
import { customersService } from '../services/api/customers'
import { TablePager, usePage } from '../components/common/TablePager'

export function Customers() {
  const [customers, setCustomers] = useState([])
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
      const data = await customersService.getAll()
      setCustomers(data.items || data)
    } catch (error) {
      toast.error('Failed to load customers')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      await customersService.create(formData)
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
      await customersService.update(editingItem.id, formData)
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
    if (!confirm('Are you sure you want to delete this customer?')) return
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
    setDialogOpen(true)
  }

  const tools = useTableTools(customers, ['company_name', 'branch', 'contact_person', 'email', 'contact_number'])
  const page = usePage(tools.rows)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Customers</h1>
        </div>
        <div className="flex items-center gap-2">
          <TableSearch value={tools.query} onChange={tools.setQuery} placeholder="Search customers" />
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

      <Card>
        <CardHeader>
          <CardTitle>Customers List</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sl No</TableHead>
                <SortHead label="Company" column="company_name" sort={tools.sort} onSort={tools.toggleSort} />
                <SortHead label="Branch" column="branch" sort={tools.sort} onSort={tools.toggleSort} />
                <SortHead label="Contact" column="contact_person" sort={tools.sort} onSort={tools.toggleSort} />
                <SortHead label="Email" column="email" sort={tools.sort} onSort={tools.toggleSort} />
                <SortHead label="Phone" column="contact_number" sort={tools.sort} onSort={tools.toggleSort} />
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No customers found
                  </TableCell>
                </TableRow>
              ) : (
                page.rows.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell>{(page.page - 1) * page.pageSize + index + 1}</TableCell>
                    <TableCell className="font-medium">{item.company_name}</TableCell>
                    <TableCell>{item.branch || '-'}</TableCell>
                    <TableCell>{item.contact_person || '-'}</TableCell>
                    <TableCell>{item.email || '-'}</TableCell>
                    <TableCell>{item.contact_number || '-'}</TableCell>
                    <TableCell>
                      <RowActions onEdit={() => openEditDialog(item)} onDelete={() => handleDelete(item.id)} />
                    </TableCell>
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
