import { useEffect, useMemo, useRef, useState } from 'react'
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
import { TablePager, useMeasuredPage } from '../components/common/TablePager'
import { useAuth } from '../hooks/use-auth'
import { useConfirm } from '../components/common/ConfirmDialog'
import apiClient, { readList, shareGet } from '../services/api/client'
import { CustomFieldInputs, TableToolsMenu, useShownColumns } from '../components/common/entityColumns'
import { PasswordInput } from '../components/common/PasswordInput'

function sanitizeName(value) {
  return value.replace(/^\s+/, '').replace(/\s{2,}/g, ' ')
}

const emptyForm = { name: '', email: '', role: 'user', is_active: true, password: '' }

export function AccessControl({ embedded = false }) {
  const { user: currentUser } = useAuth()
  const confirm = useConfirm()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [customValues, setCustomValues] = useState({})
  const scrollerRef = useRef(null)
  const [fields, setFields] = useState([])
  const columns = useMemo(() => [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Role' },
    { key: 'is_active', label: 'Status' },
    ...fields.map((field) => ({ key: field.field_key, label: field.label, custom: true })),
  ], [fields])
  const shown = useShownColumns('ces-columns-user', columns)
  const tools = useTableTools(users.map((item) => ({ ...item, ...(item.custom_fields || {}), is_active: item.is_active ? 'Active' : 'Inactive' })), columns.map((column) => column.key))
  const page = useMeasuredPage(tools.rows, scrollerRef)

  const load = async () => {
    setLoading(true)
    try {
      const data = readList(await shareGet('/api/v1/users'))
      setUsers(data.items)
      setFields(data.custom_columns)
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
    setCustomValues(Object.fromEntries(fields.map((field) => [field.field_key, ''])))
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
    setCustomValues(Object.fromEntries(fields.map((field) => [field.field_key, user.custom_fields?.[field.field_key] || ''])))
  }

  const save = async (event) => {
    event.preventDefault()
    const name = form.name.trim()
    if (!name) {
      toast.error('Name is required')
      return
    }
    if (form.password && /\s/.test(form.password)) {
      toast.error('Password cannot contain spaces')
      return
    }
    const payload = {
      name,
      email: form.email,
      role: form.role,
      is_active: form.is_active,
      custom_fields: customValues,
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
    if (!(await confirm({ title: 'Delete user', description: `Delete ${user.name}? This cannot be undone.` }))) return
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
    <div className={`flex flex-col gap-3 ${embedded ? 'h-full min-h-0' : 'h-[calc(100vh-2rem)]'}`}>
      <div className="flex items-center gap-3">
        {!embedded && <h1 className="font-heading text-2xl font-bold">Access Control</h1>}
        <TableSearch value={tools.query} onChange={tools.setQuery} placeholder="Search users" />
        <div className="ml-auto flex items-center gap-2">
          <TableToolsMenu entityType="user" isAdmin fields={fields} onFields={load} columns={columns} isShown={shown.isShown} onToggle={shown.toggle} rows={tools.rows} title="Access Control" />
          <Button type="button" className="h-8" onClick={openCreate}><Plus className="mr-2 h-4 w-4" />New User</Button>
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
                  <TableHead className="w-20 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={shown.visible.length + 2}>Loading...</TableCell></TableRow>
                ) : page.rows.length === 0 ? (
                  <TableRow><TableCell colSpan={shown.visible.length + 2}>No users</TableCell></TableRow>
                ) : page.rows.map((user, index) => (
                  <TableRow key={user.id}>
                    <TableCell>{(page.page - 1) * page.pageSize + index + 1}</TableCell>
                    {shown.visible.map((column) => (
                      <TableCell key={column.key} className={column.key === 'role' ? 'uppercase' : column.key === 'name' ? 'font-medium' : ''}>
                        {(column.custom ? user.custom_fields?.[column.key] : user[column.key]) || '-'}
                      </TableCell>
                    ))}
                    <TableCell className="text-right">
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
              <Input
                value={form.name}
                required
                onChange={(event) => setForm({ ...form, name: sanitizeName(event.target.value) })}
                onBlur={() => setForm((current) => ({ ...current, name: current.name.trim() }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
            </div>
            <div className="space-y-1">
              <Label>Role</Label>
              <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
                <option value="admin">Admin</option>
                <option value="user">User</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.is_active ? 'active' : 'inactive'} onChange={(event) => setForm({ ...form, is_active: event.target.value === 'active' })}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label>{editing === 'new' ? 'Password' : 'New password'}</Label>
              <PasswordInput
                maxLength={6}
                minLength={editing === 'new' ? 6 : (form.password ? 6 : undefined)}
                required={editing === 'new'}
                autoComplete="new-password"
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value.replace(/\s/g, '') })}
                onKeyDown={(event) => { if (event.key === ' ') event.preventDefault() }}
                placeholder={editing === 'new' ? 'Exactly 6 characters' : 'Leave blank to keep current'}
              />
            </div>
            <CustomFieldInputs fields={fields} values={customValues} onChange={setCustomValues} />
            <DialogFooter><Button type="submit">Save</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
