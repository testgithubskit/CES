import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowLeft01Icon, CubeIcon } from '@hugeicons/core-free-icons'
import { toast } from 'sonner'
import { ChevronDown, ChevronRight, MoreVertical, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { productsService } from '../services/api/products'
import { bomService, lookupService, operationsService } from '../services/api/bom'
import { documentsService } from '../services/api/documents'
import { PartPreview } from '../components/bom/PartPreview'
import { ProductCost } from '../components/bom/ProductCost'
import { RowActions } from '../components/common/RowActions'
import { SortHead, TableSearch, useTableTools } from '../components/common/TableTools'
import { TablePager, usePage } from '../components/common/TablePager'

function errorMessage(error, fallback) {
  const detail = error.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) return detail.map((item) => item.msg).join(', ')
  return fallback
}

function normalizeSetupTime(value) {
  if (/^\d{2}:\d{2}$/.test(value)) return `${value}:00`
  return value
}

function normalizeCycleTime(value) {
  return value.slice(0, 5)
}

function fileKind(document) {
  return (document.file_type || document.file_name?.split('.').pop() || '').toLowerCase()
}

function previewKind(document) {
  return ['stl', 'step', 'stp'].includes(fileKind(document)) ? '3d' : '2d'
}

function suggestDocumentType(fileName) {
  const extension = fileName.split('.').pop()?.toLowerCase()
  if (extension === 'pdf') return '2d'
  if (['stl', 'step', 'stp'].includes(extension)) return '3d'
  return '2d'
}

const emptyPart = () => ({ part_number: '', part_name: '', quantity: '1', part_type_id: '' })
const emptyOperation = () => ({
  operation_name: '',
  operation_type: 'in_house',
  setup_time: '00:00:00',
  cycle_time: '00:00',
  work_center_id: '',
  machine_id: '',
  work_instructions: '',
  notes: '',
})
const emptyDocument = () => ({ file: null, fileName: '', document_type: '2d', version: '', inputKey: 0 })

const fieldClass = 'flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm'

function updatePart(tree, partId, updater) {
  const mapPart = (part) => (part.id === partId ? updater(part) : part)
  const mapAssembly = (assembly) => ({
    ...assembly,
    parts: (assembly.parts || []).map(mapPart),
    sub_assemblies: (assembly.sub_assemblies || []).map(mapAssembly),
  })
  return {
    ...tree,
    direct_parts: (tree.direct_parts || []).map(mapPart),
    assemblies: (tree.assemblies || []).map(mapAssembly),
  }
}

function insertAssembly(tree, assembly) {
  const node = { ...assembly, parts: assembly.parts || [], sub_assemblies: assembly.sub_assemblies || [] }
  if (!node.parent_assembly_id) return { ...tree, assemblies: [...(tree.assemblies || []), node] }
  const mapAssembly = (current) => current.id === node.parent_assembly_id
    ? { ...current, sub_assemblies: [...(current.sub_assemblies || []), node] }
    : { ...current, sub_assemblies: (current.sub_assemblies || []).map(mapAssembly) }
  return { ...tree, assemblies: (tree.assemblies || []).map(mapAssembly) }
}

function removeAssembly(tree, assemblyId) {
  const mapAssembly = (assembly) => ({
    ...assembly,
    sub_assemblies: (assembly.sub_assemblies || []).filter((child) => child.id !== assemblyId).map(mapAssembly),
  })
  return {
    ...tree,
    assemblies: (tree.assemblies || []).filter((assembly) => assembly.id !== assemblyId).map(mapAssembly),
  }
}

function insertPart(tree, part) {
  const node = { ...part, operations: part.operations || [], documents: part.documents || [] }
  if (!node.assembly_id) return { ...tree, direct_parts: [...(tree.direct_parts || []), node] }
  const mapAssembly = (assembly) => assembly.id === node.assembly_id
    ? { ...assembly, parts: [...(assembly.parts || []), node] }
    : { ...assembly, sub_assemblies: (assembly.sub_assemblies || []).map(mapAssembly) }
  return { ...tree, assemblies: (tree.assemblies || []).map(mapAssembly) }
}

function updateAssembly(tree, assemblyId, updater) {
  const mapAssembly = (assembly) => {
    const next = assembly.id === assemblyId ? updater(assembly) : assembly
    return { ...next, sub_assemblies: (next.sub_assemblies || []).map(mapAssembly) }
  }
  return { ...tree, assemblies: (tree.assemblies || []).map(mapAssembly) }
}

function removePart(tree, partId) {
  const mapAssembly = (assembly) => ({
    ...assembly,
    parts: (assembly.parts || []).filter((part) => part.id !== partId),
    sub_assemblies: (assembly.sub_assemblies || []).map(mapAssembly),
  })
  return {
    ...tree,
    direct_parts: (tree.direct_parts || []).filter((part) => part.id !== partId),
    assemblies: (tree.assemblies || []).map(mapAssembly),
  }
}

export function ProductBom() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [hierarchy, setHierarchy] = useState(null)
  const [showProduct, setShowProduct] = useState(false)
  const [partTypes, setPartTypes] = useState([])
  const [workCenters, setWorkCenters] = useState([])
  const [machines, setMachines] = useState([])
  const [selectedPart, setSelectedPart] = useState(null)
  const [operations, setOperations] = useState([])
  const [documents, setDocuments] = useState([])
  const [previewMode, setPreviewMode] = useState('2d')
  const [previewDocId, setPreviewDocId] = useState(null)
  const [previewFile, setPreviewFile] = useState({ id: null, data: null })
  const [expanded, setExpanded] = useState({})
  const [dialog, setDialog] = useState(null)
  const [assemblyRows, setAssemblyRows] = useState([{ assembly_number: '', assembly_name: '' }])
  const [partRows, setPartRows] = useState([emptyPart()])
  const [operationRows, setOperationRows] = useState([emptyOperation()])
  const [documentRows, setDocumentRows] = useState([emptyDocument()])
  const [editingOperation, setEditingOperation] = useState(null)
  const [detailTab, setDetailTab] = useState('plan')
  const [zoomed, setZoomed] = useState(false)
  const operationTools = useTableTools(operations, ['operation_number', 'operation_name', 'operation_type', 'work_center_name', 'machine_name'])
  const documentTools = useTableTools(documents, ['file_name', 'document_type', 'version', 'file_type'])
  const operationPage = usePage(operationTools.rows, 420)
  const documentPage = usePage(documentTools.rows, 420)

  useEffect(() => {
    let active = true
    productsService.getHierarchy(id).then((data) => {
      if (active) setHierarchy(data)
    }).catch((error) => {
      if (active) toast.error(errorMessage(error, 'Failed to load BOM'))
    })
    return () => {
      active = false
    }
  }, [id])

  const rememberPart = (partId, updater) => {
    setHierarchy((current) => current && updatePart(current, partId, updater))
    setSelectedPart((current) => (current?.id === partId ? updater(current) : current))
  }

  const openPart = (part) => {
    const partDocuments = part.documents || []
    const chosen = partDocuments.find((document) => previewKind(document) === '2d') || partDocuments[0] || null
    setShowProduct(false)
    setSelectedPart(part)
    setOperations(part.operations || [])
    setDocuments(partDocuments)
    setPreviewMode(chosen ? previewKind(chosen) : '2d')
    setPreviewDocId(chosen?.id ?? null)
  }

  const ensurePartTypes = async () => {
    if (partTypes.length) return partTypes
    const types = await lookupService.partTypes()
    setPartTypes(types)
    return types
  }

  const ensureMachines = async () => {
    if (workCenters.length && machines.length) return
    const [centers, machineList] = await Promise.all([
      lookupService.workCenters(),
      lookupService.machines(),
    ])
    setWorkCenters(centers)
    setMachines(machineList)
  }

  const previewDocuments = useMemo(() => {
    return documents.filter((document) => previewKind(document) === previewMode)
  }, [documents, previewMode])

  useEffect(() => {
    setPreviewDocId((current) => (current && previewDocuments.some((document) => document.id === current) ? current : previewDocuments[0]?.id ?? null))
  }, [previewDocuments])

  if (previewFile.id !== (previewDocId ?? null)) {
    setPreviewFile({ id: previewDocId ?? null, data: null })
  }

  useEffect(() => {
    let cancelled = false
    const loadPreview = async () => {
      if (!previewDocId) return
      try {
        const blob = await documentsService.downloadDocument(previewDocId)
        const buffer = new Uint8Array(await blob.arrayBuffer())
        if (!cancelled) setPreviewFile({ id: previewDocId, data: buffer })
      } catch (error) {
        if (!cancelled) {
          setPreviewFile({ id: previewDocId, data: null })
          toast.error(errorMessage(error, 'Failed to load preview'))
        }
      }
    }
    loadPreview()
    return () => {
      cancelled = true
    }
  }, [previewDocId])

  const previewDocument = documents.find((document) => document.id === previewDocId)

  const openAssemblyDialog = (parentAssemblyId = null) => {
    setAssemblyRows([{ assembly_number: '', assembly_name: '' }])
    setDialog({ type: 'assembly', parentAssemblyId, editing: null })
  }

  const openEditAssembly = (assembly) => {
    setAssemblyRows([{ assembly_number: assembly.assembly_number, assembly_name: assembly.assembly_name }])
    setDialog({ type: 'assembly', parentAssemblyId: assembly.parent_assembly_id, editing: assembly })
  }

  const openPartDialog = (assemblyId = null) => {
    setPartRows([emptyPart()])
    setDialog({ type: 'part', assemblyId, editing: null })
    ensurePartTypes().catch((error) => toast.error(errorMessage(error, 'Failed to load part types')))
  }

  const openEditPart = (part) => {
    setPartRows([{
      part_number: part.part_number,
      part_name: part.part_name,
      quantity: String(part.quantity),
      part_type_id: String(part.part_type_id),
    }])
    setDialog({ type: 'part', assemblyId: part.assembly_id, editing: part })
    ensurePartTypes().catch((error) => toast.error(errorMessage(error, 'Failed to load part types')))
  }

  const openOperationDialog = (operation = null) => {
    ensureMachines().catch((error) => toast.error(errorMessage(error, 'Failed to load machines')))
    setEditingOperation(operation)
    setOperationRows([operation ? {
      operation_name: operation.operation_name,
      operation_type: operation.operation_type,
      setup_time: operation.setup_time,
      cycle_time: operation.cycle_time,
      work_center_id: String(operation.work_center_id),
      machine_id: String(operation.machine_id),
      work_instructions: operation.work_instructions || '',
      notes: operation.notes || '',
    } : emptyOperation()])
    setDialog({ type: 'operation' })
  }

  const openDocumentDialog = (document = null) => {
    setDocumentRows([document ? {
      file: null,
      fileName: document.file_name,
      document_type: document.document_type || '2d',
      version: document.version || '',
      inputKey: Date.now(),
    } : emptyDocument()])
    setDialog({ type: 'document', editing: document })
  }

  const saveAssemblies = async (event) => {
    event.preventDefault()
    try {
      if (dialog.editing) {
        const row = assemblyRows[0]
        const saved = await bomService.updateAssembly(dialog.editing.id, {
          assembly_number: row.assembly_number,
          assembly_name: row.assembly_name,
        })
        setHierarchy((current) => current && updateAssembly(current, saved.id, (assembly) => ({
          ...assembly,
          assembly_number: saved.assembly_number,
          assembly_name: saved.assembly_name,
        })))
      } else {
        for (const row of assemblyRows) {
          const saved = await bomService.createAssembly({
            product_id: Number(id),
            parent_assembly_id: dialog.parentAssemblyId,
            assembly_number: row.assembly_number,
            assembly_name: row.assembly_name,
          })
          setHierarchy((current) => current && insertAssembly(current, saved))
        }
      }
      toast.success(dialog.parentAssemblyId ? 'Sub assembly saved' : 'Assembly saved')
      setDialog(null)
    } catch (error) {
      toast.error(errorMessage(error, 'Failed to save assembly'))
    }
  }

  const saveParts = async (event) => {
    event.preventDefault()
    try {
      if (dialog.editing) {
        const row = partRows[0]
        const saved = await bomService.updatePart(dialog.editing.id, {
          part_number: row.part_number,
          part_name: row.part_name,
          quantity: Number(row.quantity),
          part_type_id: Number(row.part_type_id),
        })
        const typeName = partTypes.find((type) => type.id === saved.part_type_id)?.name
        rememberPart(saved.id, (part) => ({
          ...part,
          part_number: saved.part_number,
          part_name: saved.part_name,
          quantity: Number(saved.quantity),
          part_type_id: saved.part_type_id,
          part_type_name: typeName || part.part_type_name,
        }))
      } else {
        for (const row of partRows) {
          const saved = await bomService.createPart({
            product_id: Number(id),
            assembly_id: dialog.assemblyId,
            part_number: row.part_number,
            part_name: row.part_name,
            quantity: Number(row.quantity),
            part_type_id: Number(row.part_type_id),
          })
          setHierarchy((current) => current && insertPart(current, {
            ...saved,
            quantity: Number(saved.quantity),
            part_type_name: partTypes.find((type) => type.id === saved.part_type_id)?.name || null,
          }))
        }
      }
      toast.success('Part saved')
      setDialog(null)
    } catch (error) {
      toast.error(errorMessage(error, 'Failed to save part'))
    }
  }

  const saveOperations = async (event) => {
    event.preventDefault()
    try {
      const withNames = (saved) => ({
        ...saved,
        work_center_name: workCenters.find((center) => center.id === saved.work_center_id)?.name || null,
        machine_name: machines.find((machine) => machine.id === saved.machine_id)?.name || null,
      })
      if (editingOperation) {
        const row = operationRows[0]
        const saved = withNames(await operationsService.update(editingOperation.id, {
          operation_name: row.operation_name,
          operation_type: row.operation_type,
          setup_time: normalizeSetupTime(row.setup_time),
          cycle_time: normalizeCycleTime(row.cycle_time),
          work_center_id: Number(row.work_center_id),
          machine_id: Number(row.machine_id),
          work_instructions: row.work_instructions || null,
          notes: row.notes || null,
        }))
        const next = operations.map((operation) => (operation.id === saved.id ? { ...operation, ...saved } : operation))
        setOperations(next)
        rememberPart(selectedPart.id, (part) => ({ ...part, operations: next }))
      } else {
        const created = []
        for (const row of operationRows) {
          created.push(withNames(await operationsService.create({
            part_id: selectedPart.id,
            operation_name: row.operation_name,
            operation_type: row.operation_type,
            setup_time: normalizeSetupTime(row.setup_time),
            cycle_time: normalizeCycleTime(row.cycle_time),
            work_center_id: Number(row.work_center_id),
            machine_id: Number(row.machine_id),
            work_instructions: row.work_instructions || null,
            notes: row.notes || null,
          })))
        }
        const next = [...operations, ...created]
        setOperations(next)
        rememberPart(selectedPart.id, (part) => ({ ...part, operations: next }))
      }
      toast.success('Operation saved')
      setDialog(null)
    } catch (error) {
      toast.error(errorMessage(error, 'Failed to save operation'))
    }
  }

  const saveDocuments = async (event) => {
    event.preventDefault()
    try {
      if (dialog.editing) {
        const row = documentRows[0]
        const saved = await documentsService.updateDocument(dialog.editing.id, {
          file_name: row.fileName,
          document_type: row.document_type,
          version: row.version,
        })
        const next = documents.map((document) => (document.id === saved.id ? { ...document, ...saved } : document))
        setDocuments(next)
        rememberPart(selectedPart.id, (part) => ({ ...part, documents: next }))
      } else {
        const created = []
        for (const row of documentRows) {
          created.push(await documentsService.uploadDocument({
            partId: selectedPart.id,
            file: row.file,
            documentType: row.document_type,
            version: row.version,
          }))
        }
        const next = [...documents, ...created]
        setDocuments(next)
        rememberPart(selectedPart.id, (part) => ({ ...part, documents: next }))
      }
      toast.success(dialog.editing ? 'Document updated' : 'Document uploaded')
      setDialog(null)
    } catch (error) {
      toast.error(errorMessage(error, 'Failed to upload document'))
    }
  }

  const deleteAssembly = async (assembly) => {
    if (!confirm(`Delete ${assembly.assembly_name} and everything under it?`)) return
    try {
      await bomService.deleteAssembly(assembly.id)
      setHierarchy((current) => current && removeAssembly(current, assembly.id))
      toast.success('Assembly deleted')
    } catch (error) {
      toast.error(errorMessage(error, 'Failed to delete assembly'))
    }
  }

  const deletePart = async (part) => {
    if (!confirm(`Delete ${part.part_name}?`)) return
    try {
      await bomService.deletePart(part.id)
      if (selectedPart?.id === part.id) setSelectedPart(null)
      setHierarchy((current) => current && removePart(current, part.id))
      toast.success('Part deleted')
    } catch (error) {
      toast.error(errorMessage(error, 'Failed to delete part'))
    }
  }

  const deleteOperation = async (operation) => {
    if (!confirm(`Delete operation ${operation.operation_number}?`)) return
    try {
      await operationsService.delete(operation.id)
      const next = operations.filter((item) => item.id !== operation.id)
      setOperations(next)
      rememberPart(selectedPart.id, (part) => ({ ...part, operations: next }))
    } catch (error) {
      toast.error(errorMessage(error, 'Failed to delete operation'))
    }
  }

  const deleteDocument = async (document) => {
    if (!confirm(`Delete ${document.file_name}?`)) return
    try {
      await documentsService.deleteDocument(document.id)
      const next = documents.filter((item) => item.id !== document.id)
      setDocuments(next)
      if (previewDocId === document.id) setPreviewDocId(null)
      rememberPart(selectedPart.id, (part) => ({ ...part, documents: next }))
    } catch (error) {
      toast.error(errorMessage(error, 'Failed to delete document'))
    }
  }

  const deleteProduct = async () => {
    if (!hierarchy || !confirm(`Delete product ${hierarchy.product_name}?`)) return
    try {
      await productsService.delete(hierarchy.id)
      navigate('/products')
    } catch (error) {
      toast.error(errorMessage(error, 'Failed to delete product'))
    }
  }

  const nextOperationNumber = (index) => {
    const numbers = operations.map((operation) => Number(operation.operation_number)).filter((value) => !Number.isNaN(value))
    const start = numbers.length ? Math.max(...numbers) + 10 : 10
    return editingOperation ? editingOperation.operation_number : start + index * 10
  }

  const toggle = (key) => setExpanded((current) => ({ ...current, [key]: !current[key] }))

  const renderPart = (part, depth) => (
    <div key={`part-${part.id}`} className={`flex items-start gap-2 px-2 py-1 hover:bg-accent ${selectedPart?.id === part.id ? 'bg-accent' : ''}`} style={{ paddingLeft: 28 + depth * 14 }}>
      <button type="button" className="flex min-w-0 flex-1 items-start gap-2 text-left" onClick={() => openPart(part)}>
        <HugeiconsIcon icon={CubeIcon} size={16} className="mt-0.5 shrink-0" />
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">{part.part_name}</span>
          <span className="block truncate text-xs text-muted-foreground">{part.part_number}{part.description ? ` (${part.description})` : ''} · Qty {Number(part.quantity)}</span>
        </span>
      </button>
      <NodeMenu>
        <DropdownMenuItem onClick={() => openEditPart(part)}><Pencil className="mr-2 h-4 w-4" />Edit Part</DropdownMenuItem>
        <DropdownMenuItem onClick={() => deletePart(part)}><Trash2 className="mr-2 h-4 w-4" />Delete Part</DropdownMenuItem>
      </NodeMenu>
    </div>
  )

  const renderAssembly = (assembly, depth) => {
    const key = `assembly-${assembly.id}`
    const isOpen = expanded[key] === true
    return (
      <div key={key}>
        <div className="flex items-start gap-1 px-2 py-1 text-sm hover:bg-accent" style={{ paddingLeft: 8 + depth * 14 }}>
          <button type="button" onClick={() => toggle(key)} className="mt-0.5 p-0.5">
            {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold">{assembly.assembly_name}</span>
            <span className="block truncate text-xs text-muted-foreground">{assembly.assembly_number}</span>
          </span>
          <span className="mt-0.5 border border-border px-1.5 py-0.5 text-[10px] font-semibold uppercase">Assembly</span>
          <NodeMenu>
            <DropdownMenuItem onClick={() => openAssemblyDialog(assembly.id)}><Plus className="mr-2 h-4 w-4" />Add Sub Assembly</DropdownMenuItem>
            <DropdownMenuItem onClick={() => openPartDialog(assembly.id)}><Plus className="mr-2 h-4 w-4" />Add Part</DropdownMenuItem>
            <DropdownMenuItem onClick={() => openEditAssembly(assembly)}><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
            <DropdownMenuItem onClick={() => deleteAssembly(assembly)} className="text-red-600"><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
          </NodeMenu>
        </div>
        {isOpen && (
          <div>
            {assembly.sub_assemblies?.map((child) => renderAssembly(child, depth + 1))}
            {assembly.parts?.map((part) => renderPart(part, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  if (!hierarchy) {
    return <div className="p-6 text-sm text-muted-foreground">Loading BOM...</div>
  }

  return (
    <div className="-m-4 flex h-screen min-h-0 overflow-hidden">
      <section className="flex w-[34rem] shrink-0 flex-col border-r border-border bg-background">
        <div className="flex items-center gap-2 border-b border-border px-2 py-2">
          <button type="button" className="p-1" onClick={() => navigate('/products')} aria-label="Back to products">
            <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
          </button>
          <button type="button" className={`min-w-0 flex-1 px-1 py-1 text-left ${showProduct ? 'bg-accent' : ''}`} onClick={() => { setSelectedPart(null); setShowProduct(true) }}>
            <span className="block truncate text-sm font-bold">{hierarchy.product_name}</span>
            <span className="block truncate text-xs text-muted-foreground">{hierarchy.product_number} · Qty {Number(hierarchy.quantity)}</span>
          </button>
          <span className="shrink-0 border border-border px-1.5 py-0.5 text-[10px] font-semibold uppercase">Product</span>
          <NodeMenu>
            <DropdownMenuItem onClick={() => openAssemblyDialog(null)}><Plus className="mr-2 h-4 w-4" />Add Assembly</DropdownMenuItem>
            <DropdownMenuItem onClick={() => openPartDialog(null)}><Plus className="mr-2 h-4 w-4" />Add Part</DropdownMenuItem>
            <DropdownMenuItem onClick={deleteProduct} className="text-red-600"><Trash2 className="mr-2 h-4 w-4" />Delete Product</DropdownMenuItem>
          </NodeMenu>
        </div>
        <div className="flex-1 overflow-auto p-2">
          {hierarchy.assemblies?.map((assembly) => renderAssembly(assembly, 0))}
          {hierarchy.direct_parts?.map((part) => renderPart(part, 0))}
          {!hierarchy.assemblies?.length && !hierarchy.direct_parts?.length && (
            <p className="px-2 py-4 text-sm text-muted-foreground">Add an assembly or a part under this product.</p>
          )}
        </div>
      </section>

      <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {showProduct ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <ProductCost productId={id} />
          </div>
        ) : !selectedPart ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Select the product or a part</div>
        ) : (
          <>
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-3 py-2">
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-bold">{selectedPart.part_name}</h2>
                  <p className="truncate text-xs text-muted-foreground">{selectedPart.part_number} · Qty {Number(selectedPart.quantity)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex border border-border">
                    {['2d', '3d'].map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setPreviewMode(mode)}
                        className={`px-2.5 py-1 text-xs font-bold uppercase ${previewMode === mode ? 'bg-foreground text-background' : 'text-muted-foreground'}`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                  <select className="h-8 max-w-[220px] border border-input bg-background px-2 text-xs" value={previewDocId || ''} onChange={(event) => setPreviewDocId(event.target.value ? Number(event.target.value) : null)}>
                    {previewDocuments.length === 0 && <option value="">No document</option>}
                    {previewDocuments.map((document) => (
                      <option key={document.id} value={document.id}>{document.file_name} · Rev {document.version}</option>
                    ))}
                  </select>
                  <button type="button" className="border border-border px-2 py-1 text-xs font-bold" disabled={!previewDocId} onClick={() => setZoomed(true)}>Zoom</button>
                </div>
              </div>
            <div className="relative min-h-0 flex-[7] overflow-hidden border-b border-border bg-background">
              <div className="absolute inset-0">
                <PartPreview key={`${previewMode}-${previewDocId || 'none'}`} fileType={previewDocument?.file_type} fileName={previewDocument?.file_name} data={previewFile.data} />
              </div>
            </div>

            <div className="flex min-h-0 flex-[3] flex-col overflow-hidden">
            <div className="flex shrink-0 border-b border-border">
              {[['plan', 'Process Plan'], ['documents', 'Part Documents']].map(([key, label]) => (
                <button key={key} type="button" className={`px-4 py-2 text-sm font-bold ${detailTab === key ? 'border-b-2 border-foreground' : 'text-muted-foreground'}`} onClick={() => setDetailTab(key)}>
                  {label}
                </button>
              ))}
            </div>

            {detailTab === 'plan' && (
            <div className="min-h-0 flex-1 overflow-auto px-3 py-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <TableSearch value={operationTools.query} onChange={operationTools.setQuery} placeholder="Search operations" />
                <Button size="sm" className="h-7" onClick={() => openOperationDialog()}>
                  <Plus className="mr-1 h-3.5 w-3.5" />Create Operation
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortHead label="Op No" column="operation_number" sort={operationTools.sort} onSort={operationTools.toggleSort} />
                    <SortHead label="Operation" column="operation_name" sort={operationTools.sort} onSort={operationTools.toggleSort} />
                    <SortHead label="Type" column="operation_type" sort={operationTools.sort} onSort={operationTools.toggleSort} />
                    <SortHead label="Setup" column="setup_time" sort={operationTools.sort} onSort={operationTools.toggleSort} />
                    <SortHead label="Cycle" column="cycle_time" sort={operationTools.sort} onSort={operationTools.toggleSort} />
                    <SortHead label="Work Center" column="work_center_name" sort={operationTools.sort} onSort={operationTools.toggleSort} />
                    <SortHead label="Machine" column="machine_name" sort={operationTools.sort} onSort={operationTools.toggleSort} />
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {operations.length === 0 ? (
                    <TableRow><TableCell colSpan={8}>No operations yet</TableCell></TableRow>
                  ) : operationPage.rows.map((operation) => (
                    <TableRow key={operation.id}>
                      <TableCell>{operation.operation_number}</TableCell>
                      <TableCell>{operation.operation_name}</TableCell>
                      <TableCell>{operation.operation_type === 'out_source' ? 'Out source' : 'In house'}</TableCell>
                      <TableCell>{operation.setup_time}</TableCell>
                      <TableCell>{operation.cycle_time}</TableCell>
                      <TableCell>{operation.work_center_name || workCenters.find((center) => center.id === operation.work_center_id)?.name || operation.work_center_id}</TableCell>
                      <TableCell>{operation.machine_name || machines.find((machine) => machine.id === operation.machine_id)?.name || operation.machine_id}</TableCell>
                      <TableCell>
                        <RowActions onEdit={() => openOperationDialog(operation)} onDelete={() => deleteOperation(operation)} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePager page={operationPage.page} pages={operationPage.pages} total={operationPage.total} onPage={operationPage.setPage} />
            </div>
            )}

            {detailTab === 'documents' && (
            <div className="min-h-0 flex-1 overflow-auto px-3 py-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <TableSearch value={documentTools.query} onChange={documentTools.setQuery} placeholder="Search documents" />
                <Button size="sm" className="h-7" onClick={() => openDocumentDialog()}>
                  <Plus className="mr-1 h-3.5 w-3.5" />Upload Document
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortHead label="Document Name" column="file_name" sort={documentTools.sort} onSort={documentTools.toggleSort} />
                    <SortHead label="Type" column="document_type" sort={documentTools.sort} onSort={documentTools.toggleSort} />
                    <SortHead label="Revision" column="version" sort={documentTools.sort} onSort={documentTools.toggleSort} />
                    <SortHead label="File" column="file_type" sort={documentTools.sort} onSort={documentTools.toggleSort} />
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.length === 0 ? (
                    <TableRow><TableCell colSpan={5}>No documents yet</TableCell></TableRow>
                  ) : documentPage.rows.map((document) => (
                    <TableRow key={document.id} className="cursor-pointer" onClick={() => {
                      setPreviewMode(previewKind(document))
                      setPreviewDocId(document.id)
                    }}>
                      <TableCell>{document.file_name}</TableCell>
                      <TableCell className="uppercase">{document.document_type}</TableCell>
                      <TableCell>{document.version}</TableCell>
                      <TableCell className="uppercase">{document.file_type}</TableCell>
                      <TableCell onClick={(event) => event.stopPropagation()}>
                        <RowActions onEdit={() => openDocumentDialog(document)} onDelete={() => deleteDocument(document)} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePager page={documentPage.page} pages={documentPage.pages} total={documentPage.total} onPage={documentPage.setPage} />
            </div>
            )}
            </div>
          </>
        )}
      </section>

      <Dialog open={zoomed} onOpenChange={setZoomed}>
        <DialogContent className="h-[90vh] max-w-6xl">
          <DialogHeader>
            <DialogTitle>{selectedPart?.part_name}</DialogTitle>
          </DialogHeader>
          <div className="h-[calc(90vh-7rem)] min-h-0">
            {zoomed && <PartPreview key={`zoom-${previewMode}-${previewDocId || 'none'}`} fileType={previewDocument?.file_type} fileName={previewDocument?.file_name} data={previewFile.data} />}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog?.type === 'assembly'} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{dialog?.editing ? 'Edit Assembly' : dialog?.parentAssemblyId ? 'Add Sub Assembly' : 'Add Assembly'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={saveAssemblies} className="space-y-3" autoComplete="off">
            {assemblyRows.map((row, index) => (
              <div key={index} className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Assembly Number</Label>
                  <Input value={row.assembly_number} required autoComplete="off" onChange={(event) => updateRow(setAssemblyRows, index, { assembly_number: event.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Assembly Name</Label>
                  <Input value={row.assembly_name} required autoComplete="off" onChange={(event) => updateRow(setAssemblyRows, index, { assembly_name: event.target.value })} />
                </div>
              </div>
            ))}
            {!dialog?.editing && (
              <Button type="button" variant="outline" onClick={() => setAssemblyRows((rows) => [...rows, { assembly_number: '', assembly_name: '' }])}>
                Add another
              </Button>
            )}
            <DialogFooter><Button type="submit" className="">Save</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog?.type === 'part'} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>{dialog?.editing ? 'Edit Part' : 'Add Part'}</DialogTitle></DialogHeader>
          <form onSubmit={saveParts} className="space-y-3" autoComplete="off">
            {partRows.map((row, index) => (
              <div key={index} className="grid grid-cols-4 gap-3">
                <Input placeholder="Part number" value={row.part_number} required autoComplete="off" onChange={(event) => updateRow(setPartRows, index, { part_number: event.target.value })} />
                <Input placeholder="Part name" value={row.part_name} required autoComplete="off" onChange={(event) => updateRow(setPartRows, index, { part_name: event.target.value })} />
                <Input placeholder="Qty" type="number" min="1" step="1" value={row.quantity} required autoComplete="off" onChange={(event) => updateRow(setPartRows, index, { quantity: event.target.value })} />
                <select className={fieldClass} required value={row.part_type_id} onChange={(event) => updateRow(setPartRows, index, { part_type_id: event.target.value })}>
                  <option value="">Part type</option>
                  {partTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
                </select>
              </div>
            ))}
            {!dialog?.editing && (
              <Button type="button" variant="outline" onClick={() => setPartRows((rows) => [...rows, emptyPart()])}>Add another</Button>
            )}
            <DialogFooter><Button type="submit" className="">Save</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog?.type === 'operation'} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader><DialogTitle>{editingOperation ? 'Edit Operation' : 'Create Operation'}</DialogTitle></DialogHeader>
          <form onSubmit={saveOperations} className="max-h-[70vh] space-y-4 overflow-auto" autoComplete="off">
            {operationRows.map((row, index) => (
              <div key={index} className="grid grid-cols-2 gap-3 rounded-md border p-3">
                <div className="space-y-1">
                  <Label>Op Number</Label>
                  <Input value={nextOperationNumber(index)} disabled />
                </div>
                <div className="space-y-1">
                  <Label>Operation</Label>
                  <Input value={row.operation_name} required autoComplete="off" onChange={(event) => updateRow(setOperationRows, index, { operation_name: event.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Operation Type</Label>
                  <select className={fieldClass} value={row.operation_type} onChange={(event) => updateRow(setOperationRows, index, { operation_type: event.target.value })}>
                    <option value="in_house">In house</option>
                    <option value="out_source">Out source</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Setup Time</Label>
                  <Input type="time" step="1" value={row.setup_time} required onChange={(event) => updateRow(setOperationRows, index, { setup_time: event.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Cycle Time</Label>
                  <Input type="time" value={row.cycle_time} required onChange={(event) => updateRow(setOperationRows, index, { cycle_time: event.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Work Center</Label>
                  <select className={fieldClass} required value={row.work_center_id} onChange={(event) => updateRow(setOperationRows, index, { work_center_id: event.target.value, machine_id: '' })}>
                    <option value="">Select work center</option>
                    {workCenters.map((center) => <option key={center.id} value={center.id}>{center.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Machine</Label>
                  <select className={fieldClass} required disabled={!row.work_center_id} value={row.machine_id} onChange={(event) => updateRow(setOperationRows, index, { machine_id: event.target.value })}>
                    <option value="">Select machine</option>
                    {machines.filter((machine) => String(machine.work_center_id) === String(row.work_center_id)).map((machine) => (
                      <option key={machine.id} value={machine.id}>{machine.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Work Instructions</Label>
                  <Input value={row.work_instructions} autoComplete="off" onChange={(event) => updateRow(setOperationRows, index, { work_instructions: event.target.value })} />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label>Notes</Label>
                  <Input value={row.notes} autoComplete="off" onChange={(event) => updateRow(setOperationRows, index, { notes: event.target.value })} />
                </div>
              </div>
            ))}
            {!editingOperation && (
              <Button type="button" variant="outline" onClick={() => setOperationRows((rows) => [...rows, emptyOperation()])}>Add another</Button>
            )}
            <DialogFooter><Button type="submit" className="">Save</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog?.type === 'document'} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>{dialog?.editing ? 'Edit Part Document' : 'Upload Part Document'}</DialogTitle></DialogHeader>
          <form onSubmit={saveDocuments} className="space-y-3" autoComplete="off">
            {documentRows.map((row, index) => (
              <div key={row.inputKey + '-' + index} className="space-y-3 border border-border p-3">
                <div className="space-y-1">
                  <Label>{dialog?.editing ? 'Document name' : 'File'}</Label>
                  {dialog?.editing ? (
                    <Input value={row.fileName} required onChange={(event) => updateRow(setDocumentRows, index, { fileName: event.target.value })} />
                  ) : (
                    <div className="flex items-center gap-2">
                      <Input
                        key={row.inputKey}
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,.stl,.step,.stp"
                        required={!row.file}
                        onChange={(event) => {
                          const file = event.target.files?.[0] || null
                          updateRow(setDocumentRows, index, {
                            file,
                            fileName: file?.name || '',
                            document_type: file ? suggestDocumentType(file.name) : row.document_type,
                          })
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        disabled={!row.file}
                        onClick={() => updateRow(setDocumentRows, index, { file: null, fileName: '', inputKey: Date.now() })}
                      >
                        Clear
                      </Button>
                    </div>
                  )}
                  {!dialog?.editing && <p className="text-xs text-muted-foreground">{row.fileName || 'No file selected'}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Type</Label>
                    <select className={fieldClass} value={row.document_type} onChange={(event) => updateRow(setDocumentRows, index, { document_type: event.target.value })}>
                      <option value="2d">2D</option>
                      <option value="3d">3D</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label>Revision</Label>
                    <Input placeholder="Revision" required value={row.version} autoComplete="off" onChange={(event) => updateRow(setDocumentRows, index, { version: event.target.value })} />
                  </div>
                </div>
                {documentRows.length > 1 && (
                  <Button type="button" variant="outline" onClick={() => setDocumentRows((rows) => rows.filter((_, rowIndex) => rowIndex !== index))}>Remove</Button>
                )}
              </div>
            ))}
            {!dialog?.editing && (
              <Button type="button" variant="outline" onClick={() => setDocumentRows((rows) => [...rows, emptyDocument()])}>Add another</Button>
            )}
            <DialogFooter><Button type="submit">{dialog?.editing ? 'Save' : 'Upload'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function updateRow(setter, index, patch) {
  setter((rows) => rows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)))
}

function NodeMenu({ children }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" type="button">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">{children}</DropdownMenuContent>
    </DropdownMenu>
  )
}
