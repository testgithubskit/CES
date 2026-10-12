import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { Card, CardContent } from '../components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { RowActions } from '../components/common/RowActions'
import { SortHead, TableSearch, useTableTools } from '../components/common/TableTools'
import { TablePager, usePage } from '../components/common/TablePager'
import { useAuth } from '../hooks/use-auth'
import apiClient from '../services/api/client'

const emptyForm = { name: '', email: '', role: 'user', is_active: true, password: '' }

export function AccessControl() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const tools = useTableTools(users, ['name', 'email', 'role'])
  const page = usePage(tools.rows, 220)

  const load = async () => {
    setLoading(true)
    try {
      const response = await apiClient.get('/api/v1/users/')
      setUsers(response.data)
    } catch (error) {
      const detail = error.response?.data?.detail
      toast.error(typeof detail === 'string' ? detail : 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (currentUser?.role === 'admin') load()
  }, [currentUser])

  const openCreate = () => {
    setEditing('new')
    setForm(emptyForm)
  }

  const openEdit = (user) => {
    setEditing(user)
    setForm({
      name: user.name,
      email: user.email,
      role: user.role,
      is_active: user.is_active,
      password: '',
    })
  }

  const save = async (event) => {
    event.preventDefault()
    const payload = {
      name: form.name,
      email: form.email,
      role: form.role,
      is_active: form.is_active,
    }
    if (form.password) payload.password = form.password
    try {
      if (editing === 'new') {
        if (form.password.length !== 6) {
          toast.error('Password must be exactly 6 characters')
          return
        }
        await apiClient.post('/api/v1/users/', { ...payload, password: form.password })
        toast.success('User created')
      } else {
        await apiClient.put(`/api/v1/users/${editing.id}`, payload)
        toast.success('User updated')
      }
      setEditing(null)
      load()
    } catch (error) {
      const detail = error.response?.data?.detail
      toast.error(typeof detail === 'string' ? detail : 'Failed to update user')
    }
  }

  const remove = async (user) => {
    if (!confirm(`Delete ${user.name}?`)) return
    try {
      await apiClient.delete(`/api/v1/users/${user.id}`)
      toast.success('User deleted')
      load()
    } catch (error) {
      const detail = error.response?.data?.detail
      toast.error(typeof detail === 'string' ? detail : 'Failed to delete user')
    }
  }

  if (currentUser && currentUser.role !== 'admin') {
    return <p className="text-sm">Access control is available to admins only.</p>
  }

  return (
    <div className="flex h-[calc(100vh-2rem)] flex-col gap-3">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold">Access Control</h1>
        <div className="flex items-center gap-2">
          <TableSearch value={tools.query} onChange={tools.setQuery} placeholder="Search users" />
          <Button type="button" className="h-8" onClick={openCreate}><Plus className="mr-2 h-4 w-4" />New User</Button>
        </div>
      </div>
      <Card className="flex min-h-0 flex-1 flex-col rounded-none border-0 shadow-none">
        <CardContent className="flex min-h-0 flex-1 flex-col p-0">
          <div className="min-h-0 flex-1 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sl No</TableHead>
                  <SortHead label="Name" column="name" sort={tools.sort} onSort={tools.toggleSort} />
                  <SortHead label="Email" column="email" sort={tools.sort} onSort={tools.toggleSort} />
                  <SortHead label="Role" column="role" sort={tools.sort} onSort={tools.toggleSort} />
                  <SortHead label="Status" column="is_active" sort={tools.sort} onSort={tools.toggleSort} />
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6}>Loading...</TableCell></TableRow>
                ) : page.rows.length === 0 ? (
                  <TableRow><TableCell colSpan={6}>No users</TableCell></TableRow>
                ) : page.rows.map((user, index) => (
                  <TableRow key={user.id}>
                    <TableCell>{(page.page - 1) * page.pageSize + index + 1}</TableCell>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell className="uppercase">{user.role}</TableCell>
                    <TableCell>{user.is_active ? 'Active' : 'Inactive'}</TableCell>
                    <TableCell>
                      <RowActions onEdit={() => openEdit(user)} onDelete={user.id !== currentUser?.id ? () => remove(user) : undefined} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <TablePager page={page.page} pages={page.pages} total={page.total} onPage={page.setPage} />
        </CardContent>
      </Card>

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing === 'new' ? 'New user' : 'Edit user'}</DialogTitle></DialogHeader>
          <form onSubmit={save} className="space-y-3">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
            </div>
            <div className="space-y-1">
              <Label>Role</Label>
              <select className="flex h-9 w-full border border-input bg-background px-3 text-sm" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
                <option value="admin">Admin</option>
                <option value="user">User</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <select className="flex h-9 w-full border border-input bg-background px-3 text-sm" value={form.is_active ? 'active' : 'inactive'} onChange={(event) => setForm({ ...form, is_active: event.target.value === 'active' })}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label>{editing === 'new' ? 'Password' : 'New password'}</Label>
              <Input type="password" maxLength={6} minLength={editing === 'new' ? 6 : (form.password ? 6 : undefined)} required={editing === 'new'} autoComplete="new-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder={editing === 'new' ? 'Exactly 6 characters' : 'Leave blank to keep current'} />
            </div>
            <DialogFooter><Button type="submit">Save</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
