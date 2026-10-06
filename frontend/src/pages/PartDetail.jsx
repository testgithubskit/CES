import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog'
import { Label } from '../components/ui/label'
import { Input } from '../components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Plus, Edit, Trash2, ArrowLeft, Upload, Download, FileText, Box } from 'lucide-react'
import { toast } from 'sonner'
import { bomService } from '../services/api/bom'
import { processPlanService } from '../services/api/processPlan'
import { documentsService } from '../services/api/documents'
import { machinesService } from '../services/api/machines'
import { DocumentViewer } from '../components/common/DocumentViewer'
import { ModelViewer3D } from '../components/common/ModelViewer3D'

export function PartDetail() {
  const { id } = useParams()
  const [part, setPart] = useState(null)
  const [documents, setDocuments] = useState([])
  const [processPlan, setProcessPlan] = useState(null)
  const [operations, setOperations] = useState([])
  const [machines, setMachines] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingOperation, setEditingOperation] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sequence_number: '',
    machine_id: '',
    setup_time: '',
    cycle_time: '',
  })

  useEffect(() => {
    loadPart()
    loadDocuments()
    loadProcessPlan()
    loadMachines()
  }, [id])

  const loadPart = async () => {
    try {
      const data = await bomService.getParts(id)
      setPart(data.find((p) => p.id === id))
    } catch (error) {
      toast.error('Failed to load part')
    }
  }

  const loadDocuments = async () => {
    try {
      const data = await documentsService.getDocuments(id)
      setDocuments(data.items || data)
    } catch (error) {
      console.error('Failed to load documents')
    }
  }

  const loadProcessPlan = async () => {
    try {
      const data = await processPlanService.getByPart(id)
      setProcessPlan(data)
      if (data.id) {
        loadOperations(data.id)
      }
    } catch (error) {
      console.error('Failed to load process plan')
    }
  }

  const loadOperations = async (processPlanId) => {
    try {
      const data = await processPlanService.getOperations(processPlanId)
      setOperations(data.items || data)
    } catch (error) {
      console.error('Failed to load operations')
    }
  }

  const loadMachines = async () => {
    try {
      const data = await machinesService.getAll()
      setMachines(data.items || data)
    } catch (error) {
      console.error('Failed to load machines')
    }
  }

  const handleCreateOperation = async (e) => {
    e.preventDefault()
    try {
      if (!processPlan?.id) {
        const newPlan = await processPlanService.create(id, { name: 'Default Process Plan' })
        setProcessPlan(newPlan)
        await processPlanService.createOperation(newPlan.id, formData)
      } else {
        await processPlanService.createOperation(processPlan.id, formData)
      }
      toast.success('Operation created successfully')
      setDialogOpen(false)
      setFormData({ name: '', description: '', sequence_number: '', machine_id: '', setup_time: '', cycle_time: '' })
      loadProcessPlan()
    } catch (error) {
      toast.error('Failed to create operation')
    }
  }

  const handleUpdateOperation = async (e) => {
    e.preventDefault()
    try {
      await processPlanService.updateOperation(editingOperation.id, formData)
      toast.success('Operation updated successfully')
      setDialogOpen(false)
      setEditingOperation(null)
      setFormData({ name: '', description: '', sequence_number: '', machine_id: '', setup_time: '', cycle_time: '' })
      loadProcessPlan()
    } catch (error) {
      toast.error('Failed to update operation')
    }
  }

  const handleDeleteOperation = async (operationId) => {
    if (!confirm('Are you sure you want to delete this operation?')) return
    try {
      await processPlanService.deleteOperation(operationId)
      toast.success('Operation deleted successfully')
      loadProcessPlan()
    } catch (error) {
      toast.error('Failed to delete operation')
    }
  }

  const openCreateDialog = () => {
    setEditingOperation(null)
    setFormData({ name: '', description: '', sequence_number: '', machine_id: '', setup_time: '', cycle_time: '' })
    setDialogOpen(true)
  }

  const openEditDialog = (operation) => {
    setEditingOperation(operation)
    setFormData({
      name: operation.name,
      description: operation.description,
      sequence_number: operation.sequence_number,
      machine_id: operation.machine_id,
      setup_time: operation.setup_time,
      cycle_time: operation.cycle_time,
    })
    setDialogOpen(true)
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/bom">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{part?.name}</h1>
          <p className="text-muted-foreground">{part?.description}</p>
        </div>
      </div>

      <Tabs defaultValue="info" className="space-y-4">
        <TabsList>
          <TabsTrigger value="info">Part Information</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="process-plan">Process Plan</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Part Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Part Number</Label>
                <p className="text-sm text-muted-foreground">{part?.part_number || '-'}</p>
              </div>
              <div>
                <Label>Material</Label>
                <p className="text-sm text-muted-foreground">{part?.material || '-'}</p>
              </div>
              <div>
                <Label>Weight</Label>
                <p className="text-sm text-muted-foreground">{part?.weight || '-'}</p>
              </div>
              <div>
                <Label>Dimensions</Label>
                <p className="text-sm text-muted-foreground">{part?.dimensions || '-'}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Documents</CardTitle>
                  <CardDescription>2D and 3D files associated with this part</CardDescription>
                </div>
                <Button className="bg-brand-500 hover:bg-brand-600">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Document
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {documents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No documents uploaded yet
                </div>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {doc.document_type === '3d' ? (
                          <Box className="h-8 w-8 text-brand-500" />
                        ) : (
                          <FileText className="h-8 w-8 text-brand-500" />
                        )}
                        <div>
                          <p className="font-medium">{doc.file_name}</p>
                          <p className="text-sm text-muted-foreground">{doc.file_type}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {doc.document_type === '2d' && (
                          <DocumentViewer document={doc} />
                        )}
                        {doc.document_type === '3d' && (
                          <ModelViewer3D document={doc} />
                        )}
                        <Button variant="ghost" size="icon">
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="process-plan" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Process Plan</CardTitle>
                  <CardDescription>Manufacturing operations for this part</CardDescription>
                </div>
                <Button className="bg-brand-500 hover:bg-brand-600" onClick={openCreateDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Operation
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {operations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No operations defined yet
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sequence</TableHead>
                      <TableHead>Operation</TableHead>
                      <TableHead>Machine</TableHead>
                      <TableHead>Setup Time</TableHead>
                      <TableHead>Cycle Time</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {operations.map((op) => (
                      <TableRow key={op.id}>
                        <TableCell>{op.sequence_number}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{op.name}</p>
                            <p className="text-sm text-muted-foreground">{op.description}</p>
                          </div>
                        </TableCell>
                        <TableCell>{machines.find((m) => m.id === op.machine_id)?.name || '-'}</TableCell>
                        <TableCell>{op.setup_time || '-'}</TableCell>
                        <TableCell>{op.cycle_time || '-'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => openEditDialog(op)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteOperation(op.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingOperation ? 'Edit Operation' : 'Create Operation'}</DialogTitle>
            <DialogDescription>
              {editingOperation ? 'Update operation details' : 'Add a new operation to the process plan'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={editingOperation ? handleUpdateOperation : handleCreateOperation} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Operation Name</Label>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sequence_number">Sequence</Label>
                <Input
                  id="sequence_number"
                  type="number"
                  value={formData.sequence_number}
                  onChange={(e) => setFormData({ ...formData, sequence_number: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="machine_id">Machine</Label>
                <Select value={formData.machine_id} onValueChange={(value) => setFormData({ ...formData, machine_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select machine" />
                  </SelectTrigger>
                  <SelectContent>
                    {machines.map((machine) => (
                      <SelectItem key={machine.id} value={machine.id}>
                        {machine.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="setup_time">Setup Time (min)</Label>
                <Input
                  id="setup_time"
                  type="number"
                  value={formData.setup_time}
                  onChange={(e) => setFormData({ ...formData, setup_time: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cycle_time">Cycle Time (min)</Label>
                <Input
                  id="cycle_time"
                  type="number"
                  value={formData.cycle_time}
                  onChange={(e) => setFormData({ ...formData, cycle_time: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" className="bg-brand-500 hover:bg-brand-600">
                {editingOperation ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
