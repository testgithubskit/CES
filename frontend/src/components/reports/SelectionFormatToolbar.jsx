import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  AlignCenter, AlignLeft, AlignRight, Baseline, Bold, Highlighter, Italic, List, PaintBucket, Strikethrough, Underline as UnderlineIcon, X,
} from 'lucide-react'

const FONTS = ['Times New Roman', 'Arial', 'Calibri', 'Cambria', 'Georgia', 'Verdana', 'Tahoma', 'Courier New']
const SIZES = ['8px', '9px', '10px', '11px', '12px', '14px', '16px', '18px', '20px', '24px', '28px', '36px']

function Btn({ title, active, onClick, children }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onMouseDown={(event) => {
        event.preventDefault()
        event.stopPropagation()
      }}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        onClick()
      }}
      className={`inline-flex h-8 min-w-8 items-center justify-center rounded px-1.5 ${active ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-accent'}`}
    >
      {children}
    </button>
  )
}

export function SelectionFormatToolbar({ editor }) {
  const [box, setBox] = useState(null)
  const hoveringRef = useRef(false)
  const selectionRef = useRef(null)

  useEffect(() => {
    if (!editor) return undefined
    const dom = editor.view.dom

    const onContextMenu = (event) => {
      event.preventDefault()
      event.stopPropagation()
      const { view } = editor
      const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })
      const { empty, from, to } = editor.state.selection
      if (pos != null) {
        const clicked = pos.pos
        if (empty || clicked < from || clicked > to) {
          editor.chain().focus().setTextSelection(clicked).run()
          selectionRef.current = { from: clicked, to: clicked }
        } else {
          editor.chain().focus().run()
          selectionRef.current = { from, to }
        }
      } else {
        editor.chain().focus().run()
        selectionRef.current = { from, to }
      }
      const left = Math.min(event.clientX + 8, window.innerWidth - 460)
      const top = Math.min(event.clientY + 8, window.innerHeight - 160)
      setBox({ left: Math.max(8, left), top: Math.max(8, top) })
    }

    const onDocMouseDown = (event) => {
      if (hoveringRef.current) return
      if (event.target?.closest?.('.selection-format-toolbar')) return
      setBox(null)
    }

    const onKey = (event) => {
      if (event.key === 'Escape') setBox(null)
    }

    dom.addEventListener('contextmenu', onContextMenu)
    document.addEventListener('mousedown', onDocMouseDown, true)
    document.addEventListener('keydown', onKey)
    return () => {
      dom.removeEventListener('contextmenu', onContextMenu)
      document.removeEventListener('mousedown', onDocMouseDown, true)
      document.removeEventListener('keydown', onKey)
    }
  }, [editor])

  if (!box || !editor) return null

  const run = (apply) => {
    const sel = selectionRef.current
    let chain = editor.chain().focus()
    if (sel) chain = chain.setTextSelection(sel)
    apply(chain).run()
  }

  const textStyle = editor.getAttributes('textStyle') || {}
  const color = textStyle.color || '#111111'
  const highlight = editor.getAttributes('highlight')?.color || '#fef08a'

  return createPortal(
    <div
      className="selection-format-toolbar w-[min(520px,calc(100vw-16px))] rounded-lg border border-border bg-background p-2.5 shadow-xl"
      style={{ position: 'fixed', top: box.top, left: box.left, zIndex: 80 }}
      onMouseEnter={() => { hoveringRef.current = true }}
      onMouseLeave={() => { hoveringRef.current = false }}
      onContextMenu={(event) => event.preventDefault()}
    >
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Format Text</span>
        <button
          type="button"
          className="inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
          title="Close"
          aria-label="Close"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setBox(null)}
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <select
          className="h-8 w-[132px] rounded-md border border-input bg-background px-2 text-xs"
          style={{ fontFamily: textStyle.fontFamily || 'inherit' }}
          value={textStyle.fontFamily || ''}
          onMouseDown={(event) => event.stopPropagation()}
          onChange={(event) => {
            const value = event.target.value
            run((chain) => (value ? chain.setFontFamily(value) : chain.unsetFontFamily()))
          }}
        >
          <option value="">Font</option>
          {FONTS.map((font) => <option key={font} value={font} style={{ fontFamily: font }}>{font}</option>)}
        </select>
        <select
          className="h-8 w-[72px] rounded-md border border-input bg-background px-2 text-xs"
          value={textStyle.fontSize || ''}
          onMouseDown={(event) => event.stopPropagation()}
          onChange={(event) => {
            const value = event.target.value
            run((chain) => (value ? chain.setFontSize(value) : chain.unsetFontSize()))
          }}
        >
          <option value="">Size</option>
          {SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
        </select>
        <Btn title="Bold" active={editor.isActive('bold')} onClick={() => run((chain) => chain.toggleBold())}><Bold className="h-3.5 w-3.5" /></Btn>
        <Btn title="Italic" active={editor.isActive('italic')} onClick={() => run((chain) => chain.toggleItalic())}><Italic className="h-3.5 w-3.5" /></Btn>
        <Btn title="Underline" active={editor.isActive('underline')} onClick={() => run((chain) => chain.toggleUnderline())}><UnderlineIcon className="h-3.5 w-3.5" /></Btn>
        <Btn title="Strike" active={editor.isActive('strike')} onClick={() => run((chain) => chain.toggleStrike())}><Strikethrough className="h-3.5 w-3.5" /></Btn>
        <span className="mx-0.5 h-5 w-px bg-border" />
        <Btn title="Align left" active={editor.isActive({ textAlign: 'left' })} onClick={() => run((chain) => chain.setTextAlign('left'))}><AlignLeft className="h-3.5 w-3.5" /></Btn>
        <Btn title="Align center" active={editor.isActive({ textAlign: 'center' })} onClick={() => run((chain) => chain.setTextAlign('center'))}><AlignCenter className="h-3.5 w-3.5" /></Btn>
        <Btn title="Align right" active={editor.isActive({ textAlign: 'right' })} onClick={() => run((chain) => chain.setTextAlign('right'))}><AlignRight className="h-3.5 w-3.5" /></Btn>
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-1 border-t border-border pt-1.5">
        <Btn title="Bullet list" active={editor.isActive('bulletList')} onClick={() => run((chain) => chain.toggleBulletList())}><List className="h-3.5 w-3.5" /></Btn>
        <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded px-2 text-xs hover:bg-accent">
          <Baseline className="h-3.5 w-3.5" />
          Color
          <span className="inline-block h-3.5 w-3.5 rounded-sm border border-border" style={{ background: color }} />
          <input
            type="color"
            className="sr-only"
            value={/^#/.test(color) ? color : '#111111'}
            onChange={(event) => run((chain) => chain.setColor(event.target.value))}
          />
        </label>
        <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded px-2 text-xs hover:bg-accent">
          <Highlighter className="h-3.5 w-3.5" />
          Highlight
          <span className="inline-block h-3.5 w-3.5 rounded-sm border border-border" style={{ background: highlight }} />
          <input
            type="color"
            className="sr-only"
            value={/^#/.test(highlight) ? highlight : '#fef08a'}
            onChange={(event) => run((chain) => chain.toggleHighlight({ color: event.target.value }))}
          />
        </label>
        <Btn title="Clear formatting" onClick={() => run((chain) => chain.unsetAllMarks().clearNodes())}><PaintBucket className="h-3.5 w-3.5" /></Btn>
      </div>
    </div>,
    document.body,
  )
}
