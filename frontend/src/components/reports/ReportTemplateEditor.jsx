import { useEffect, useRef, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import { Extension } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { Underline } from '@tiptap/extension-underline'
import { TextAlign } from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import FontFamily from '@tiptap/extension-font-family'
import { Highlight } from '@tiptap/extension-highlight'
import Placeholder from '@tiptap/extension-placeholder'
import Image from '@tiptap/extension-image'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlignCenter, AlignJustify, AlignLeft, AlignRight, AlignVerticalJustifyCenter, AlignVerticalJustifyEnd, AlignVerticalJustifyStart,
  ArrowLeft, Baseline, BetweenHorizontalEnd, BetweenHorizontalStart, BetweenVerticalEnd, BetweenVerticalStart,
  Bold, FileSpreadsheet, FileText, Highlighter, ImagePlus, Italic, Minus, Plus, RemoveFormatting, Save, Square, Strikethrough, Table as TableIcon, Trash2, Underline as UnderlineIcon, X, ZoomIn, ZoomOut,
} from 'lucide-react'
import { toast } from 'sonner'
import ExcelJS from 'exceljs'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Switch } from '../ui/switch'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '../ui/dropdown-menu'
import apiClient from '../../services/api/client'
import { COST_PLACEHOLDERS, DEFAULT_PAGE_SETTINGS, PAGE_SIZES, customerColumnPlaceholders } from '../../services/reportTemplates'
import { getReportTemplate, saveReportTemplate, templateError } from '../../services/api/reportTemplates'
import { customFieldsService } from '../../services/api/customFields'
import { SelectionFormatToolbar } from './SelectionFormatToolbar'

const PAGE_PX = {
  A4: [794, 1123],
  A3: [1123, 1587],
  A5: [559, 794],
  Letter: [816, 1056],
  Legal: [816, 1344],
}

const FONTS = ['Times New Roman', 'Arial', 'Calibri', 'Cambria', 'Georgia', 'Verdana', 'Tahoma', 'Courier New']
const SIZES = ['8px', '9px', '10px', '11px', '12px', '14px', '16px', '18px', '20px', '24px', '28px', '36px']
const BORDER_SIDES = ['borderTop', 'borderRight', 'borderBottom', 'borderLeft']

const SECTION_MOTION = {
  header: { initial: { opacity: 0, y: -28 }, delay: 0 },
  body: { initial: { opacity: 0, y: 10 }, delay: 0.12 },
  footer: { initial: { opacity: 0, y: 28 }, delay: 0.24 },
}

const FontSize = Extension.create({
  name: 'fontSize',
  addGlobalAttributes() {
    return [{
      types: ['textStyle'],
      attributes: {
        fontSize: {
          default: null,
          parseHTML: (element) => element.style.fontSize || null,
          renderHTML: (attributes) => (attributes.fontSize ? { style: `font-size: ${attributes.fontSize}` } : {}),
        },
      },
    }]
  },
  addCommands() {
    return {
      setFontSize: (fontSize) => ({ chain }) => chain().setMark('textStyle', { fontSize }),
      unsetFontSize: () => ({ chain }) => chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle(),
    }
  },
})

function ReportSection({ sectionKey, label, editor, spacing, onActive }) {
  const [hover, setHover] = useState(false)
  const motionProps = SECTION_MOTION[sectionKey]
  return (
    <motion.div
      className={sectionKey === 'body' ? 'relative min-h-0 flex-1' : 'relative'}
      style={spacing}
      initial={motionProps.initial}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: motionProps.delay, ease: 'easeOut' }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => onActive(sectionKey)}
    >
      <AnimatePresence>
        {hover && (
          <motion.span
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.18 }}
            className="pointer-events-none absolute left-0 top-1 z-20 -translate-x-[calc(100%+10px)] rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground"
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
      <EditorContent editor={editor} />
    </motion.div>
  )
}

function styleOf(css) {
  return css ? { style: css } : {}
}

function cellAttributes() {
  return {
    backgroundColor: {
      default: null,
      parseHTML: (element) => element.style.backgroundColor || null,
      renderHTML: (attributes) => styleOf(attributes.backgroundColor ? `background-color: ${attributes.backgroundColor}` : ''),
    },
    verticalAlign: {
      default: null,
      parseHTML: (element) => element.style.verticalAlign || null,
      renderHTML: (attributes) => styleOf(attributes.verticalAlign ? `vertical-align: ${attributes.verticalAlign}` : ''),
    },
    borderTop: {
      default: null,
      parseHTML: (element) => element.style.borderTop || null,
      renderHTML: (attributes) => styleOf(attributes.borderTop ? `border-top: ${attributes.borderTop}` : ''),
    },
    borderRight: {
      default: null,
      parseHTML: (element) => element.style.borderRight || null,
      renderHTML: (attributes) => styleOf(attributes.borderRight ? `border-right: ${attributes.borderRight}` : ''),
    },
    borderBottom: {
      default: null,
      parseHTML: (element) => element.style.borderBottom || null,
      renderHTML: (attributes) => styleOf(attributes.borderBottom ? `border-bottom: ${attributes.borderBottom}` : ''),
    },
    borderLeft: {
      default: null,
      parseHTML: (element) => element.style.borderLeft || null,
      renderHTML: (attributes) => styleOf(attributes.borderLeft ? `border-left: ${attributes.borderLeft}` : ''),
    },
  }
}

const Cell = TableCell.extend({
  addAttributes() {
    return { ...this.parent?.(), ...cellAttributes() }
  },
})

const Head = TableHeader.extend({
  addAttributes() {
    return { ...this.parent?.(), ...cellAttributes() }
  },
})

function slug(label, used) {
  const base = label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'field'
  let key = base
  let count = 2
  while (used.has(key)) {
    key = `${base}_${count}`
    count += 1
  }
  return key
}

function extensions(placeholder) {
  return [
    StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
    Underline,
    TextStyle,
    Color,
    FontFamily,
    FontSize,
    Highlight.configure({ multicolor: true }),
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Table.configure({ resizable: true }),
    TableRow,
    Head,
    Cell,
    Image,
    Placeholder.configure({ placeholder }),
  ]
}

function MergeCellsIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect x="3" y="7" width="7" height="10" rx="1.6" stroke="currentColor" strokeWidth="1.8" />
      <rect x="14" y="7" width="7" height="10" rx="1.6" stroke="currentColor" strokeWidth="1.8" />
      <path d="M10 12h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function SplitCellsIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect x="2.5" y="7" width="7" height="10" rx="1.6" stroke="currentColor" strokeWidth="1.8" />
      <rect x="14.5" y="7" width="7" height="10" rx="1.6" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

function textFromHtml(html) {
  const node = document.createElement('div')
  node.innerHTML = html || ''
  return (node.innerText || '').replace(/\n{3,}/g, '\n\n').trim()
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function ToolButton({ label, active, danger, disabled, onClick, children }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={`inline-flex h-8 w-8 items-center justify-center rounded disabled:opacity-40 ${active ? 'bg-primary text-primary-foreground' : danger ? 'text-destructive hover:bg-accent' : 'text-foreground hover:bg-background'}`}
    >
      {children}
    </button>
  )
}

export function ReportTemplateEditor({ templateId, onBack, readOnly = false }) {
  const [name, setName] = useState('Untitled template')
  const [starred, setStarred] = useState(false)
  const [page, setPage] = useState(DEFAULT_PAGE_SETTINGS)
  const [custom, setCustom] = useState([])
  const [customerPlaceholders, setCustomerPlaceholders] = useState([])
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  const [zoom, setZoom] = useState(0.85)
  const [openSection, setOpenSection] = useState({ placeholders: true, page: true, logo: true, type: true, table: true })
  const [active, setActive] = useState('body')
  const [, setTick] = useState(0)
  const [borderColor, setBorderColor] = useState('#111111')
  const [savedId, setSavedId] = useState(templateId || null)
  const [leaveOpen, setLeaveOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef(null)
  const loaded = useRef(false)
  const snapshotRef = useRef('')
  const bump = () => setTick((value) => value + 1)

  const headerEditor = useEditor({ extensions: extensions('Header — click placeholders to insert...'), content: '', editable: !readOnly, onFocus: () => setActive('header'), onSelectionUpdate: bump, onTransaction: bump })
  const bodyEditor = useEditor({ extensions: extensions('Body — click placeholders to insert...'), content: '', editable: !readOnly, onFocus: () => setActive('body'), onSelectionUpdate: bump, onTransaction: bump })
  const footerEditor = useEditor({ extensions: extensions('Footer — click placeholders to insert...'), content: '', editable: !readOnly, onFocus: () => setActive('footer'), onSelectionUpdate: bump, onTransaction: bump })
  const editors = { header: headerEditor, body: bodyEditor, footer: footerEditor }
  const editor = editors[active]
  const inTable = Boolean(editor?.isActive('table'))

  useEffect(() => {
    customFieldsService.list('customer')
      .then((rows) => setCustomerPlaceholders(customerColumnPlaceholders(rows)))
      .catch(() => setCustomerPlaceholders([]))
  }, [])

  useEffect(() => {
    if (!headerEditor || !bodyEditor || !footerEditor || loaded.current) return
    let cancelled = false
    const apply = (existing) => {
      if (cancelled) return
      loaded.current = true
      const data = existing?.template_data || {}
      setName(existing?.name || 'Untitled template')
      setStarred(Boolean(existing?.is_default))
      setPage({
        ...DEFAULT_PAGE_SETTINGS,
        ...data,
        margins: { ...DEFAULT_PAGE_SETTINGS.margins, ...(data.margins || {}) },
      })
      setCustom(Array.isArray(data.customPlaceholders) ? data.customPlaceholders : [])
      headerEditor.commands.setContent(data.headerHtml || '<p></p>')
      bodyEditor.commands.setContent(data.bodyHtml || (existing ? '<p></p>' : '<p>{{product_name}} · {{product_number}}</p><p>Qty {{quantity}} · {{date}}</p><p>{{operations_table}}</p><p><strong>Grand total {{grand_total}}</strong></p>'))
      footerEditor.commands.setContent(data.footerHtml || '<p>{{product_number}}</p>')
      const nextPage = { ...DEFAULT_PAGE_SETTINGS, ...data, margins: { ...DEFAULT_PAGE_SETTINGS.margins, ...(data.margins || {}) } }
      const nextCustom = Array.isArray(data.customPlaceholders) ? data.customPlaceholders : []
      snapshotRef.current = JSON.stringify({
        name: existing?.name || 'Untitled template',
        starred: Boolean(existing?.is_default),
        page: nextPage,
        custom: nextCustom,
        header: headerEditor.getHTML(),
        body: bodyEditor.getHTML(),
        footer: footerEditor.getHTML(),
      })
    }
    if (!templateId) {
      apply(null)
      return () => { cancelled = true }
    }
    getReportTemplate(templateId).then(apply).catch((error) => {
      toast.error(templateError(error, 'Failed to load template'))
      apply(null)
    })
    return () => { cancelled = true }
  }, [templateId, headerEditor, bodyEditor, footerEditor])

  const insertToken = (token) => {
    if (readOnly) return
    editor?.chain().focus().insertContent(token).run()
  }

  const addCustom = () => {
    const label = draft.trim()
    if (!label) return
    const used = new Set([...COST_PLACEHOLDERS, ...customerPlaceholders, ...custom].map((item) => item.token.replace(/[{}]/g, '')))
    setCustom((rows) => [...rows, { token: `{{${slug(label, used)}}}`, label, custom: true }])
    setDraft('')
    setAdding(false)
  }

  const snapshot = () => JSON.stringify({
    name: name.trim() || 'Untitled template',
    starred,
    page,
    custom,
    header: headerEditor?.getHTML() || '',
    body: bodyEditor?.getHTML() || '',
    footer: footerEditor?.getHTML() || '',
  })

  const isDirty = () => snapshotRef.current && snapshot() !== snapshotRef.current

  const persist = async () => {
    if (readOnly) return null
    const saved = await saveReportTemplate({
      id: savedId || undefined,
      name: name.trim() || 'Untitled template',
      is_default: starred,
      template_data: {
        ...page,
        customPlaceholders: custom,
        headerHtml: headerEditor?.getHTML() || '',
        bodyHtml: bodyEditor?.getHTML() || '',
        footerHtml: footerEditor?.getHTML() || '',
      },
    })
    setSavedId(saved.id)
    snapshotRef.current = snapshot()
    return saved
  }

  const save = async () => {
    try {
      await persist()
      toast.success('Template saved')
    } catch (error) {
      toast.error(templateError(error, 'Failed to save template'))
    }
  }

  const requestBack = () => {
    if (!readOnly && isDirty()) {
      setLeaveOpen(true)
      return
    }
    onBack()
  }

  const discardAndLeave = () => {
    setLeaveOpen(false)
    onBack()
  }

  const saveAndLeave = async () => {
    setSaving(true)
    try {
      await persist()
      toast.success('Template saved')
      setLeaveOpen(false)
      onBack()
    } catch (error) {
      toast.error(templateError(error, 'Failed to save template'))
    } finally {
      setSaving(false)
    }
  }

  const exportPdf = async () => {
    const html = `<!DOCTYPE html><html><head><title>${name}</title></head><body>${headerEditor?.getHTML() || ''}<div>${bodyEditor?.getHTML() || ''}</div>${footerEditor?.getHTML() || ''}</body></html>`
    const filename = `${name || 'template'}.pdf`
    try {
      const response = await apiClient.post('/api/v1/reports/pdf', {
        html,
        page_size: page.pageSize,
        orientation: page.orientation,
        filename,
      }, { responseType: 'blob' })
      const blob = response.data instanceof Blob ? response.data : new Blob([response.data], { type: 'application/pdf' })
      downloadBlob(blob, filename)
    } catch {
      toast.error('Chromium PDF is unavailable. Start the API after Chromium is installed.')
    }
  }

  const exportExcel = async () => {
    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('Template')
    sheet.columns = [{ width: 16 }, { width: 80 }]
    sheet.addRow(['Name', name.trim() || 'Untitled template'])
    sheet.addRow(['Page', `${page.pageSize} ${page.orientation}`])
    sheet.addRow(['Header', textFromHtml(headerEditor?.getHTML())])
    sheet.addRow(['Body', textFromHtml(bodyEditor?.getHTML())])
    sheet.addRow(['Footer', textFromHtml(footerEditor?.getHTML())])
    sheet.addRow([])
    sheet.addRow(['Placeholders'])
    ;[...COST_PLACEHOLDERS, ...customerPlaceholders, ...custom].forEach((item) => sheet.addRow([item.label, item.token]))
    const buffer = await workbook.xlsx.writeBuffer()
    downloadBlob(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${name || 'template'}.xlsx`)
  }

  const uploadLogo = (file) => {
    const reader = new FileReader()
    reader.onload = () => editor?.chain().focus().setImage({ src: String(reader.result) }).run()
    reader.readAsDataURL(file)
  }

  const setCells = (patch) => {
    let chain = editor?.chain().focus()
    Object.entries(patch).forEach(([key, value]) => {
      chain = chain?.setCellAttribute(key, value)
    })
    chain?.run()
  }

  const textStyle = editor?.getAttributes('textStyle') || {}
  const [width, height] = PAGE_PX[page.pageSize] || PAGE_PX.A4
  const pageWidth = page.orientation === 'landscape' ? height : width
  const pageHeight = page.orientation === 'landscape' ? width : height
  const panel = (key, title, extra, children) => (
    <div className="border-b border-border">
      <button type="button" className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground" onClick={() => setOpenSection((currentSection) => ({ ...currentSection, [key]: !currentSection[key] }))}>
        {title}
        {extra}
      </button>
      {openSection[key] && <div className="space-y-2 px-3 pb-3">{children}</div>}
    </div>
  )

  return (
    <div className="flex h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-lg border border-border bg-muted text-foreground">
      <div className="flex shrink-0 items-center gap-2 border-b border-border bg-background px-3 py-2">
        <Button type="button" variant="ghost" className="h-8" onClick={requestBack}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
        <Input value={name} onChange={(event) => setName(event.target.value)} className="h-8 max-w-xs" disabled={readOnly} />
        <div className="ml-auto flex items-center gap-1">
          <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => setZoom((value) => Math.max(0.5, +(value - 0.1).toFixed(1)))} aria-label="Zoom out"><ZoomOut className="h-4 w-4" /></Button>
          <span className="w-10 text-center text-xs text-muted-foreground">{Math.round(zoom * 100)}%</span>
          <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => setZoom((value) => Math.min(1.4, +(value + 0.1).toFixed(1)))} aria-label="Zoom in"><ZoomIn className="h-4 w-4" /></Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" className="h-8">Export</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Download as</DropdownMenuLabel>
              <DropdownMenuItem onClick={exportPdf}><FileText className="mr-2 h-4 w-4" />PDF</DropdownMenuItem>
              <DropdownMenuItem onClick={exportExcel}><FileSpreadsheet className="mr-2 h-4 w-4" />Excel</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {!readOnly && <Button type="button" className="h-8" onClick={save}><Save className="mr-1 h-4 w-4" />Save</Button>}
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {!readOnly && <aside className="w-[440px] shrink-0 overflow-auto border-r border-border bg-background">
          {panel('placeholders', 'Placeholders', (
            !readOnly && <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-primary text-primary-foreground" onClick={(event) => { event.stopPropagation(); setAdding(true); setOpenSection((currentSection) => ({ ...currentSection, placeholders: true })) }}><Plus className="h-3.5 w-3.5" /></span>
          ), (
            <>
              {adding && (
                <div className="flex gap-1">
                  <Input autoFocus value={draft} placeholder="Name (e.g. Approved By)" className="h-8" onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') addCustom(); if (event.key === 'Escape') setAdding(false) }} />
                  <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded bg-primary text-primary-foreground" onClick={addCustom} aria-label="Add placeholder"><Plus className="h-4 w-4" /></button>
                </div>
              )}
              <div className="grid grid-cols-2 gap-1.5">
                {COST_PLACEHOLDERS.map((item) => (
                  <div key={item.token} className="flex overflow-hidden rounded-md border border-border bg-muted text-[11px] font-medium text-foreground">
                    <button type="button" className="min-w-0 flex-1 truncate px-2 py-2 text-left" title={item.token} onMouseDown={(event) => event.preventDefault()} onClick={() => insertToken(item.token)}>{item.label}</button>
                  </div>
                ))}
              </div>
              {customerPlaceholders.length > 0 && (
                <>
                  <p className="pt-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Customer columns</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {customerPlaceholders.map((item) => (
                      <div key={item.token} className="flex overflow-hidden rounded-md border border-primary/20 bg-primary/5 text-[11px] font-medium text-foreground">
                        <button type="button" className="min-w-0 flex-1 truncate px-2 py-2 text-left" title={item.token} onMouseDown={(event) => event.preventDefault()} onClick={() => insertToken(item.token)}>{item.label}</button>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {custom.length > 0 && (
                <div className="grid grid-cols-2 gap-1.5">
                  {custom.map((item) => (
                    <div key={item.token} className="flex overflow-hidden rounded-md border border-primary/30 bg-secondary text-[11px] font-medium text-secondary-foreground">
                      <button type="button" className="min-w-0 flex-1 truncate px-2 py-2 text-left" title={item.token} onMouseDown={(event) => event.preventDefault()} onClick={() => insertToken(item.token)}>{item.label}</button>
                      <button type="button" className="w-6 border-l border-border text-destructive" aria-label={`Remove ${item.label}`} onClick={() => setCustom((rows) => rows.filter((entry) => entry.token !== item.token))}><X className="mx-auto h-3 w-3" /></button>
                    </div>
                  ))}
                </div>
              )}
            </>
          ))}

          {panel('page', 'Page setup', null, (
            <>
              <div>
                <p className="mb-1 text-xs text-muted-foreground">Page size</p>
                <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={page.pageSize} onChange={(event) => setPage({ ...page, pageSize: event.target.value })}>
                  {PAGE_SIZES.map((size) => <option key={size.value} value={size.value}>{size.label}</option>)}
                </select>
              </div>
              <div>
                <p className="mb-1 text-xs text-muted-foreground">Orientation</p>
                <div className="grid grid-cols-2 gap-1 rounded-md bg-muted p-1">
                  {['portrait', 'landscape'].map((orientation) => (
                    <button key={orientation} type="button" className={`rounded px-2 py-1.5 text-xs font-medium capitalize ${page.orientation === orientation ? 'bg-primary text-primary-foreground' : 'text-foreground'}`} onClick={() => setPage({ ...page, orientation })}>{orientation}</button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1 text-xs text-muted-foreground">Margins (mm)</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {[['top', 'T'], ['right', 'R'], ['bottom', 'B'], ['left', 'L']].map(([side, short]) => (
                    <label key={side} className="flex h-8 items-center rounded border border-input px-1 text-[10px] text-muted-foreground">
                      {short}
                      <input type="number" min="0" max="50" className="w-full bg-transparent text-center text-xs text-foreground outline-none" value={page.margins[side]} onChange={(event) => setPage({ ...page, margins: { ...page.margins, [side]: Number(event.target.value) || 0 } })} />
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1 text-xs text-muted-foreground">Spacing (mm)</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {[['headerSpacing', 'HDR'], ['footerSpacing', 'FTR']].map(([key, short]) => (
                    <label key={key} className="flex h-8 items-center rounded border border-input px-1 text-[10px] text-muted-foreground">
                      {short}
                      <input type="number" min="0" max="40" className="w-full bg-transparent text-center text-xs text-foreground outline-none" value={page[key] || 0} onChange={(event) => setPage({ ...page, [key]: Number(event.target.value) || 0 })} />
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                Star as default template
                <Switch checked={starred} onCheckedChange={setStarred} />
              </div>
            </>
          ))}

          {panel('logo', 'Logo & branding', null, (
            <>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) uploadLogo(file); event.target.value = '' }} />
              <button type="button" className="flex w-full flex-col items-center gap-2 rounded-lg border border-dashed border-border bg-muted px-3 py-7 text-center hover:border-primary" onClick={() => fileRef.current?.click()}>
                <ImagePlus className="h-6 w-6 text-muted-foreground" />
                <span className="text-sm font-semibold">Upload Logo / Image</span>
                <span className="text-[11px] text-muted-foreground">Click image to resize / align</span>
              </button>
            </>
          ))}

          {panel('type', 'Typography', null, (
            <>
              <div className="grid grid-cols-2 gap-1.5">
                <select className="h-8 rounded-md border border-input bg-background px-2 text-xs" style={{ fontFamily: textStyle.fontFamily || 'inherit' }} value={textStyle.fontFamily || ''} onChange={(event) => { if (event.target.value) editor?.chain().focus().setFontFamily(event.target.value).run() }}>
                  <option value="">Font</option>
                  {FONTS.map((font) => <option key={font} value={font} style={{ fontFamily: font }}>{font}</option>)}
                </select>
                <select className="h-8 rounded-md border border-input bg-background px-2 text-xs" value={textStyle.fontSize || ''} onChange={(event) => { if (event.target.value) editor?.chain().focus().setFontSize(event.target.value).run() }}>
                  <option value="">Size</option>
                  {SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
                </select>
              </div>
              <div className="flex flex-wrap gap-1 rounded-md bg-muted p-1">
                <ToolButton label="Bold" active={editor?.isActive('bold')} onClick={() => editor?.chain().focus().toggleBold().run()}><Bold className="h-3.5 w-3.5" /></ToolButton>
                <ToolButton label="Italic" active={editor?.isActive('italic')} onClick={() => editor?.chain().focus().toggleItalic().run()}><Italic className="h-3.5 w-3.5" /></ToolButton>
                <ToolButton label="Underline" active={editor?.isActive('underline')} onClick={() => editor?.chain().focus().toggleUnderline().run()}><UnderlineIcon className="h-3.5 w-3.5" /></ToolButton>
                <ToolButton label="Strike" active={editor?.isActive('strike')} onClick={() => editor?.chain().focus().toggleStrike().run()}><Strikethrough className="h-3.5 w-3.5" /></ToolButton>
              </div>
              <div className="flex flex-wrap gap-1 rounded-md bg-muted p-1">
                <ToolButton label="Align left" active={editor?.isActive({ textAlign: 'left' })} onClick={() => editor?.chain().focus().setTextAlign('left').run()}><AlignLeft className="h-3.5 w-3.5" /></ToolButton>
                <ToolButton label="Align center" active={editor?.isActive({ textAlign: 'center' })} onClick={() => editor?.chain().focus().setTextAlign('center').run()}><AlignCenter className="h-3.5 w-3.5" /></ToolButton>
                <ToolButton label="Align right" active={editor?.isActive({ textAlign: 'right' })} onClick={() => editor?.chain().focus().setTextAlign('right').run()}><AlignRight className="h-3.5 w-3.5" /></ToolButton>
                <ToolButton label="Justify" active={editor?.isActive({ textAlign: 'justify' })} onClick={() => editor?.chain().focus().setTextAlign('justify').run()}><AlignJustify className="h-3.5 w-3.5" /></ToolButton>
                <ToolButton label="Clear formatting" onClick={() => editor?.chain().focus().unsetAllMarks().clearNodes().run()}><RemoveFormatting className="h-3.5 w-3.5" /></ToolButton>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <label className="flex items-center gap-2 rounded-md bg-muted px-2 py-1.5 text-xs">
                  <Baseline className="h-3.5 w-3.5" /> Font color
                  <input type="color" className="ml-auto h-5 w-5 cursor-pointer border-0 bg-transparent p-0" value={textStyle.color || '#111111'} onChange={(event) => editor?.chain().focus().setColor(event.target.value).run()} />
                </label>
                <label className="flex items-center gap-2 rounded-md bg-muted px-2 py-1.5 text-xs">
                  <Highlighter className="h-3.5 w-3.5" /> Highlight
                  <input type="color" className="ml-auto h-5 w-5 cursor-pointer border-0 bg-transparent p-0" defaultValue="#fff3a0" onChange={(event) => editor?.chain().focus().toggleHighlight({ color: event.target.value }).run()} />
                </label>
              </div>
            </>
          ))}

          {panel('table', 'Table', null, (
            <>
              <div className="flex gap-1">
                <button type="button" className="flex h-9 flex-1 items-center justify-center gap-2 rounded-md bg-primary text-sm font-semibold text-primary-foreground" onMouseDown={(event) => event.preventDefault()} onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
                  <TableIcon className="h-4 w-4" /> Insert
                </button>
                <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-md text-destructive hover:bg-accent disabled:opacity-40" disabled={!inTable} aria-label="Delete table" onMouseDown={(event) => event.preventDefault()} onClick={() => editor?.chain().focus().deleteTable().run()}><Trash2 className="h-4 w-4" /></button>
              </div>
              <div className="flex flex-wrap gap-1 rounded-md bg-muted p-1">
                <ToolButton label="Add row above" disabled={!inTable} onClick={() => editor?.chain().focus().addRowBefore().run()}><BetweenHorizontalStart className="h-3.5 w-3.5" /></ToolButton>
                <ToolButton label="Add row below" disabled={!inTable} onClick={() => editor?.chain().focus().addRowAfter().run()}><BetweenHorizontalEnd className="h-3.5 w-3.5" /></ToolButton>
                <ToolButton label="Delete row" danger disabled={!inTable} onClick={() => editor?.chain().focus().deleteRow().run()}><Minus className="h-3.5 w-3.5" /></ToolButton>
                <ToolButton label="Add column left" disabled={!inTable} onClick={() => editor?.chain().focus().addColumnBefore().run()}><BetweenVerticalStart className="h-3.5 w-3.5" /></ToolButton>
                <ToolButton label="Add column right" disabled={!inTable} onClick={() => editor?.chain().focus().addColumnAfter().run()}><BetweenVerticalEnd className="h-3.5 w-3.5" /></ToolButton>
                <ToolButton label="Delete column" danger disabled={!inTable} onClick={() => editor?.chain().focus().deleteColumn().run()}><X className="h-3.5 w-3.5" /></ToolButton>
                <ToolButton label="Merge cells" disabled={!inTable} onClick={() => editor?.chain().focus().mergeCells().run()}><MergeCellsIcon className="h-3.5 w-3.5" /></ToolButton>
                <ToolButton label="Split cell" disabled={!inTable} onClick={() => editor?.chain().focus().splitCell().run()}><SplitCellsIcon className="h-3.5 w-3.5" /></ToolButton>
              </div>
              <div className="flex flex-wrap gap-1 rounded-md bg-muted p-1">
                <ToolButton label="All borders" disabled={!inTable} onClick={() => setCells(Object.fromEntries(BORDER_SIDES.map((side) => [side, `1px solid ${borderColor}`])))}><Square className="h-3.5 w-3.5" /></ToolButton>
                <ToolButton label="No borders" disabled={!inTable} onClick={() => setCells(Object.fromEntries(BORDER_SIDES.map((side) => [side, 'none'])))}><Square className="h-3.5 w-3.5 opacity-40" /></ToolButton>
              </div>
              <div>
                <p className="mb-1 text-xs text-muted-foreground">Vertical align</p>
                <div className="flex gap-1 rounded-md bg-muted p-1">
                  <ToolButton label="Align top" disabled={!inTable} onClick={() => setCells({ verticalAlign: 'top' })}><AlignVerticalJustifyStart className="h-3.5 w-3.5" /></ToolButton>
                  <ToolButton label="Align middle" disabled={!inTable} onClick={() => setCells({ verticalAlign: 'middle' })}><AlignVerticalJustifyCenter className="h-3.5 w-3.5" /></ToolButton>
                  <ToolButton label="Align bottom" disabled={!inTable} onClick={() => setCells({ verticalAlign: 'bottom' })}><AlignVerticalJustifyEnd className="h-3.5 w-3.5" /></ToolButton>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <label className="flex items-center gap-2 rounded-md bg-muted px-2 py-1.5 text-xs">
                  Cell fill
                  <input type="color" disabled={!inTable} className="ml-auto h-5 w-5 cursor-pointer border-0 bg-transparent p-0" onChange={(event) => setCells({ backgroundColor: event.target.value })} />
                </label>
                <label className="flex items-center gap-2 rounded-md bg-muted px-2 py-1.5 text-xs">
                  Border
                  <input type="color" disabled={!inTable} value={borderColor} className="ml-auto h-5 w-5 cursor-pointer border-0 bg-transparent p-0" onChange={(event) => { setBorderColor(event.target.value); setCells(Object.fromEntries(BORDER_SIDES.map((side) => [side, `1px solid ${event.target.value}`]))) }} />
                </label>
              </div>
            </>
          ))}
        </aside>}

        <div className="min-h-0 flex-1 overflow-auto bg-muted py-6 pl-16">
          <div className="report-page mx-auto origin-top bg-background shadow-xl" style={{ width: pageWidth, minHeight: pageHeight, transform: `scale(${zoom})`, padding: `${page.margins.top}mm ${page.margins.right}mm ${page.margins.bottom}mm ${page.margins.left}mm`, fontFamily: page.fontFamily, fontSize: page.fontSize, display: 'flex', flexDirection: 'column' }}>
            <ReportSection sectionKey="header" label="Header" editor={headerEditor} onActive={setActive} />
            <ReportSection sectionKey="body" label="Body" editor={bodyEditor} onActive={setActive} spacing={{ marginTop: `${page.headerSpacing || 0}mm`, marginBottom: `${page.footerSpacing || 0}mm` }} />
            <ReportSection sectionKey="footer" label="Footer" editor={footerEditor} onActive={setActive} />
          </div>
        </div>
      </div>

      {!readOnly && headerEditor && <SelectionFormatToolbar editor={headerEditor} />}
      {!readOnly && bodyEditor && <SelectionFormatToolbar editor={bodyEditor} />}
      {!readOnly && footerEditor && <SelectionFormatToolbar editor={footerEditor} />}

      <Dialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <DialogContent className="max-w-[460px]">
          <div className="flex gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-500">
              <Save className="h-5 w-5" />
            </div>
            <DialogHeader className="space-y-1 text-left">
              <DialogTitle className="uppercase tracking-wide">Unsaved changes</DialogTitle>
              <DialogDescription>You haven&apos;t saved this template. Do you want to save your changes before leaving?</DialogDescription>
            </DialogHeader>
          </div>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setLeaveOpen(false)}>Cancel</Button>
            <Button type="button" variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive/10" onClick={discardAndLeave}>No (Discard)</Button>
            <Button type="button" onClick={saveAndLeave} disabled={saving}><Save className="mr-1 h-4 w-4" />Yes (Save)</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
