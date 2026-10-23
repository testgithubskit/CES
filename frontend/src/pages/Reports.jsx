import { useEffect, useMemo, useState } from 'react'
import { FileText, LayoutGrid, List, Pencil, Plus, RefreshCw, Star, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '../components/ui/button'
import { ReportTemplateEditor } from '../components/reports/ReportTemplateEditor'
import { useConfirm } from '../components/common/ConfirmDialog'
import { useAuth } from '../hooks/use-auth'
import { deleteReportTemplate, listReportTemplates, starReportTemplate, templateError } from '../services/api/reportTemplates'
import { ClearFilter } from '../components/common/TableTools'

function timeAgo(value) {
  if (!value) return ''
  const minutes = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 60000))
  if (minutes < 60) return `Updated ${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `Updated ${hours}h ago`
  const days = Math.round(hours / 24)
  return `Updated ${days}d ago`
}

function Preview({ template }) {
  const data = template.template_data || {}
  const landscape = data.orientation === 'landscape'
  const scale = landscape ? 0.28 : 0.22
  return (
    <div className="relative aspect-[16/10] overflow-hidden bg-muted">
      <div className="absolute inset-0 flex items-start justify-center pt-3">
        <div className="overflow-hidden bg-white shadow-sm" style={{ width: (landscape ? 900 : 640) * scale, height: (landscape ? 640 : 900) * scale }}>
          <div
            className="template-preview origin-top-left text-black"
            style={{ width: landscape ? 900 : 640, transform: `scale(${scale})`, fontFamily: data.fontFamily || 'Times New Roman', fontSize: data.fontSize || '12px', padding: '16px' }}
            dangerouslySetInnerHTML={{ __html: `${data.headerHtml || ''}${data.bodyHtml || ''}${data.footerHtml || ''}` || `<p>${template.name}</p>` }}
          />
        </div>
      </div>
    </div>
  )
}

export function Reports() {
  const { user } = useAuth()
  const isAdmin = String(user?.role || '').toLowerCase() === 'admin'
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [view, setView] = useState('grid')
  const [sortBy, setSortBy] = useState('recent')
  const [editorId, setEditorId] = useState(null)
  const [designing, setDesigning] = useState(false)
  const confirm = useConfirm()

  const reload = async () => {
    try {
      setRows(await listReportTemplates())
    } catch (error) {
      toast.error(templateError(error, 'Failed to load templates'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reload()
  }, [])

  const starTemplate = async (template) => {
    try {
      await starReportTemplate(template.id)
      await reload()
    } catch (error) {
      toast.error(templateError(error, 'Failed to star template'))
    }
  }

  const removeTemplate = async (template) => {
    const ok = await confirm({
      title: 'Delete template',
      description: `Delete ${template.name}? This cannot be undone.`,
    })
    if (!ok) return
    try {
      await deleteReportTemplate(template.id)
      await reload()
    } catch (error) {
      toast.error(templateError(error, 'Failed to delete template'))
    }
  }

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    const list = rows.filter((item) => !query || item.name.toLowerCase().includes(query))
    return [...list].sort((left, right) => {
      if (Boolean(left.is_default) !== Boolean(right.is_default)) return Number(right.is_default) - Number(left.is_default)
      if (sortBy === 'name') return left.name.localeCompare(right.name)
      return new Date(right.updated_at || right.created_at) - new Date(left.updated_at || left.created_at)
    })
  }, [rows, search, sortBy])

  if (designing) {
    return (
      <ReportTemplateEditor
        templateId={editorId}
        readOnly={!isAdmin}
        onBack={() => {
          setDesigning(false)
          setEditorId(null)
          reload()
        }}
      />
    )
  }

  return (
    <div className="flex h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-lg border border-border bg-background">
      <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h1 className="font-heading text-lg font-bold">Design template</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            {isAdmin
              ? 'Create and manage report templates. Star one template — users generate cost reports with that template only.'
              : 'View and download report templates. Cost reports use the starred template.'}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => { setEditorId(null); setDesigning(true) }}>
            <Plus className="mr-2 h-4 w-4" />
            Create new template
          </Button>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-3">
        <div className="relative">
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search templates..." className={`h-9 w-64 border border-input bg-background px-3 text-sm ${search ? 'pr-8' : ''}`} />
          <ClearFilter show={Boolean(search)} className="absolute right-0 top-0 h-9" onClear={() => setSearch('')} />
        </div>
        <div className="flex overflow-hidden rounded-md border border-border">
          <button type="button" className={`px-2.5 py-1.5 ${view === 'grid' ? 'bg-primary text-primary-foreground' : ''}`} onClick={() => setView('grid')} aria-label="Grid view"><LayoutGrid className="h-4 w-4" /></button>
          <button type="button" className={`px-2.5 py-1.5 ${view === 'list' ? 'bg-primary text-primary-foreground' : ''}`} onClick={() => setView('list')} aria-label="List view"><List className="h-4 w-4" /></button>
        </div>
        <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="h-9 border border-input bg-background px-2 text-sm">
          <option value="recent">Sort by recently edited</option>
          <option value="name">Sort by name</option>
        </select>
        <button type="button" className="rounded-md p-2 hover:bg-accent" onClick={reload} aria-label="Refresh"><RefreshCw className="h-4 w-4" /></button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-5 py-4">
        {loading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">Loading templates...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">No templates yet.</div>
        ) : view === 'grid' ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {filtered.map((template) => (
              <div key={template.id} className="overflow-hidden rounded-lg border border-border bg-background">
                <div className="relative">
                  <button type="button" className="block w-full text-left" onClick={() => { setEditorId(template.id); setDesigning(true) }}>
                    <Preview template={template} />
                  </button>
                  {isAdmin ? (
                    <button type="button" className="absolute right-2 top-2 z-10 rounded-full border border-border bg-background p-1.5" onClick={() => starTemplate(template)} aria-label="Star template">
                      <Star className={`h-4 w-4 ${template.is_default ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'}`} />
                    </button>
                  ) : template.is_default && (
                    <span className="absolute right-2 top-2 z-10 rounded-full border border-border bg-background p-1.5">
                      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 border-t border-border px-3 py-2">
                  <FileText className="h-4 w-4" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{template.name}</p>
                    <p className="text-[11px] text-muted-foreground">{timeAgo(template.updated_at)}</p>
                  </div>
                  {isAdmin && (
                    <>
                      <button type="button" className="rounded p-1 hover:bg-accent" onClick={() => { setEditorId(template.id); setDesigning(true) }} aria-label="Edit template"><Pencil className="h-4 w-4" /></button>
                      <button type="button" className="rounded p-1 hover:bg-accent" onClick={() => removeTemplate(template)} aria-label="Delete template"><Trash2 className="h-4 w-4" /></button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((template) => (
              <div key={template.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
                <Star className={`h-4 w-4 ${template.is_default ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'}`} />
                <FileText className="h-4 w-4" />
                <button type="button" className="min-w-0 flex-1 text-left" onClick={() => { setEditorId(template.id); setDesigning(true) }}>
                  <p className="truncate text-sm font-semibold">{template.name}</p>
                  <p className="text-xs text-muted-foreground">{template.template_data?.pageSize || 'A4'} · {timeAgo(template.updated_at)}{template.is_default ? ' · Starred' : ''}</p>
                </button>
                {isAdmin && <button type="button" onClick={() => removeTemplate(template)} aria-label="Delete template"><Trash2 className="h-4 w-4" /></button>}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="border-t border-border px-5 py-2 text-xs uppercase tracking-wide text-muted-foreground">
        Total {filtered.length} template{filtered.length === 1 ? '' : 's'}
        {rows.some((item) => item.is_default) ? ` · Starred: ${rows.find((item) => item.is_default)?.name}` : ''}
      </div>
    </div>
  )
}
