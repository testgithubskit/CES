import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog'
import { productsService } from '../../services/api/products'

function partIds(assembly) {
  return [
    ...(assembly.parts || []).map((part) => part.id),
    ...(assembly.sub_assemblies || []).flatMap(partIds),
  ]
}

function allPartIds(hierarchy) {
  return [
    ...(hierarchy.direct_parts || []).map((part) => part.id),
    ...(hierarchy.assemblies || []).flatMap(partIds),
  ]
}

function isFirstVersion(version) {
  const text = String(version || '').trim().toLowerCase().replace(/^v/, '')
  return text === '1'
}

export function ProductVersionDialog({ open, hierarchy, onOpenChange, onCreated }) {
  const [picked, setPicked] = useState([])
  const [version, setVersion] = useState('')
  const [busy, setBusy] = useState(false)
  const ids = useMemo(() => (hierarchy ? allPartIds(hierarchy) : []), [hierarchy])

  useEffect(() => {
    if (open && hierarchy) {
      setPicked(allPartIds(hierarchy))
      setVersion('')
    }
  }, [open, hierarchy])

  const openChange = (next) => {
    if (next && hierarchy) setPicked(allPartIds(hierarchy))
    if (!busy) onOpenChange(next)
  }

  const togglePart = (id) => {
    setPicked((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
  }

  const toggleAssembly = (assembly) => {
    const group = partIds(assembly)
    setPicked((current) => {
      const allOn = group.every((id) => current.includes(id))
      return allOn ? current.filter((id) => !group.includes(id)) : [...new Set([...current, ...group])]
    })
  }

  const create = async () => {
    const label = version.trim().replace(/\s+/g, ' ')
    if (!label) {
      toast.error('Enter a version such as v2 or 1.1')
      return
    }
    if (isFirstVersion(label)) {
      toast.error('Use a new version number')
      return
    }
    if (ids.length && !picked.length) {
      toast.error('Select at least one part')
      return
    }
    setBusy(true)
    try {
      const created = await productsService.createVersion(hierarchy.id, picked, label)
      toast.success(`Version ${created.version} created`)
      onOpenChange(false)
      onCreated(created)
    } catch (error) {
      const detail = error.response?.data?.detail
      toast.error(typeof detail === 'string' ? detail : 'Failed to create version')
    } finally {
      setBusy(false)
    }
  }

  const renderAssembly = (assembly, depth) => {
    const group = partIds(assembly)
    const checked = group.length > 0 && group.every((id) => picked.includes(id))
    return (
      <div key={assembly.id}>
        <label className="flex items-center gap-2 py-1 text-sm" style={{ paddingLeft: depth * 16 }}>
          <input type="checkbox" checked={checked} onChange={() => toggleAssembly(assembly)} />
          <span className="truncate font-semibold">{assembly.assembly_name}</span>
          <span className="text-xs text-muted-foreground">{assembly.assembly_number}</span>
        </label>
        {(assembly.sub_assemblies || []).map((child) => renderAssembly(child, depth + 1))}
        {(assembly.parts || []).map((part) => (
          <label key={part.id} className="flex items-center gap-2 py-1 text-sm" style={{ paddingLeft: (depth + 1) * 16 }}>
            <input type="checkbox" checked={picked.includes(part.id)} onChange={() => togglePart(part.id)} />
            <span className="truncate">{part.part_name}</span>
            <span className="text-xs text-muted-foreground">{part.part_number}</span>
          </label>
        ))}
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={openChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading">Create version</DialogTitle>
        </DialogHeader>
        <div className="space-y-1">
          <Label>Version</Label>
          <Input value={version} maxLength={50} placeholder="v2 or 1.1" onChange={(event) => setVersion(event.target.value)} />
        </div>
        <p className="text-sm text-muted-foreground">
          Uncheck parts you do not want. Copied documents keep the same revision and are stored separately from this version.
        </p>
        <div className="max-h-80 overflow-auto border border-border p-2">
          {!hierarchy || ids.length === 0 ? (
            <p className="px-1 py-2 text-sm text-muted-foreground">This product has no parts. The new version will be empty.</p>
          ) : (
            <>
              {(hierarchy.assemblies || []).map((assembly) => renderAssembly(assembly, 0))}
              {(hierarchy.direct_parts || []).map((part) => (
                <label key={part.id} className="flex items-center gap-2 py-1 text-sm">
                  <input type="checkbox" checked={picked.includes(part.id)} onChange={() => togglePart(part.id)} />
                  <span className="truncate">{part.part_name}</span>
                  <span className="text-xs text-muted-foreground">{part.part_number}</span>
                </label>
              ))}
            </>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button type="button" onClick={create} disabled={busy}>Create version</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
