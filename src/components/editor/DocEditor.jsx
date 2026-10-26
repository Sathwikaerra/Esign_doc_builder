import { useEffect, useRef, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import TextStyle from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import FontFamily from '@tiptap/extension-font-family'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import Placeholder from '@tiptap/extension-placeholder'
import Icon from '../ui/Icon'
import { FontSize, LineHeight, MergeField, PageBreak, SignatureBlock } from './extensions'
import { MARGINS, PAGE_SIZES, pageGeometry } from './pageSetup'

const FONTS = ['Calibri', 'Arial', 'Times New Roman', 'Georgia', 'Garamond', 'Verdana', 'Tahoma', 'Courier New']
const SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 72]
const LINE_SPACING = ['1', '1.15', '1.5', '2', '2.5', '3']
const MAX_IMAGE_BYTES = 1024 * 1024

export default function DocEditor({ content, onChange, pageSetup, onPageSetupChange, fields = [], parties = [] }) {
  const [tab, setTab] = useState('home')
  const [zoom, setZoom] = useState(1)
  const [pages, setPages] = useState(1)
  const pageRef = useRef(null)
  const imageRef = useRef(null)
  const g = pageGeometry(pageSetup)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      TextStyle,
      Color,
      FontFamily,
      FontSize,
      LineHeight,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Image.configure({ allowBase64: true }),
      Link.configure({ openOnClick: false }),
      Subscript,
      Superscript,
      Placeholder.configure({ placeholder: 'Start typing your document…' }),
      PageBreak,
      MergeField,
      SignatureBlock,
    ],
    content,
    onUpdate: ({ editor: ed }) => onChange(ed.getHTML()),
  })

  // Rough page count from the content height, like Word's status bar.
  useEffect(() => {
    const el = pageRef.current
    if (!el) return
    const measure = () => setPages(Math.max(1, Math.ceil(el.scrollHeight / g.height)))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [g.height])

  // Show the Table tab automatically while the cursor is in a table.
  const inTable = editor?.isActive('table')
  useEffect(() => {
    if (!inTable && tab === 'table') setTab('home')
  }, [inTable, tab])

  if (!editor) return null
  const chain = () => editor.chain().focus()
  const textStyle = editor.getAttributes('textStyle')
  const currentFont = textStyle.fontFamily?.replace(/['"]/g, '') ?? ''
  const currentSize = textStyle.fontSize?.replace('px', '') ?? ''
  const blockStyle = editor.isActive('heading', { level: 1 })
    ? 'h1'
    : editor.isActive('heading', { level: 2 })
      ? 'h2'
      : editor.isActive('heading', { level: 3 })
        ? 'h3'
        : editor.isActive('blockquote')
          ? 'quote'
          : 'p'
  const text = editor.getText()
  const words = text.trim() ? text.trim().split(/\s+/).length : 0

  const applyStyle = (style) => {
    const c = chain()
    if (editor.isActive('blockquote') && style !== 'quote') c.lift('blockquote')
    if (style === 'p') c.setParagraph().run()
    else if (style === 'quote') c.setParagraph().setBlockquote().run()
    else c.setHeading({ level: Number(style[1]) }).run()
  }

  const addImage = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > MAX_IMAGE_BYTES) return window.alert('Please use an image smaller than 1 MB.')
    const reader = new FileReader()
    reader.onload = () => chain().setImage({ src: reader.result, alt: file.name }).run()
    reader.readAsDataURL(file)
  }

  const addLink = () => {
    const prev = editor.getAttributes('link').href ?? 'https://'
    const url = window.prompt('Link address', prev)
    if (url === null) return
    if (!url.trim()) chain().extendMarkRange('link').unsetLink().run()
    else chain().extendMarkRange('link').setLink({ href: url.trim() }).run()
  }

  const setup = (patch) => onPageSetupChange({ ...pageSetup, ...patch })

  return (
    <div className="doc-editor">
      <div className="ribbon">
        <div className="ribbon-tabs" role="tablist">
          {[
            ['home', 'Home'],
            ['insert', 'Insert'],
            ['layout', 'Layout'],
          ].map(([id, label]) => (
            <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>
              {label}
            </button>
          ))}
          {inTable && (
            <button role="tab" aria-selected={tab === 'table'} className={`contextual ${tab === 'table' ? 'on' : ''}`} onClick={() => setTab('table')}>
              Table
            </button>
          )}
        </div>

        <div className="ribbon-body">
          {tab === 'home' && (
            <>
              <Group label="Undo">
                <RBtn icon="undo" title="Undo (Ctrl+Z)" onClick={() => chain().undo().run()} disabled={!editor.can().undo()} />
                <RBtn icon="redo" title="Redo (Ctrl+Y)" onClick={() => chain().redo().run()} disabled={!editor.can().redo()} />
              </Group>

              <Group label="Font">
                <div className="ribbon-row">
                  <select
                    className="rb-select font"
                    value={currentFont}
                    title="Font"
                    onChange={(e) => (e.target.value ? chain().setFontFamily(e.target.value).run() : chain().unsetFontFamily().run())}
                  >
                    <option value="">Default font</option>
                    {FONTS.map((f) => (
                      <option key={f} value={f} style={{ fontFamily: f }}>
                        {f}
                      </option>
                    ))}
                  </select>
                  <select
                    className="rb-select size"
                    value={currentSize}
                    title="Font size"
                    onChange={(e) => chain().setFontSize(e.target.value ? `${e.target.value}px` : null).run()}
                  >
                    <option value="">Size</option>
                    {SIZES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="ribbon-row">
                  <RBtn icon="bold" title="Bold (Ctrl+B)" active={editor.isActive('bold')} onClick={() => chain().toggleBold().run()} />
                  <RBtn icon="italic" title="Italic (Ctrl+I)" active={editor.isActive('italic')} onClick={() => chain().toggleItalic().run()} />
                  <RBtn icon="underline" title="Underline (Ctrl+U)" active={editor.isActive('underline')} onClick={() => chain().toggleUnderline().run()} />
                  <RBtn icon="strike" title="Strikethrough" active={editor.isActive('strike')} onClick={() => chain().toggleStrike().run()} />
                  <RBtn icon="subscript" title="Subscript" active={editor.isActive('subscript')} onClick={() => chain().toggleSubscript().run()} />
                  <RBtn icon="superscript" title="Superscript" active={editor.isActive('superscript')} onClick={() => chain().toggleSuperscript().run()} />
                  <ColorBtn icon="textColor" title="Font color" value={textStyle.color} onPick={(c) => chain().setColor(c).run()} />
                  <ColorBtn
                    icon="highlighter"
                    title="Highlight"
                    value={editor.getAttributes('highlight').color ?? '#fff176'}
                    onPick={(c) => chain().setHighlight({ color: c }).run()}
                  />
                  <RBtn icon="eraser" title="Clear formatting" onClick={() => chain().unsetAllMarks().clearNodes().run()} />
                </div>
              </Group>

              <Group label="Paragraph">
                <div className="ribbon-row">
                  <RBtn icon="list" title="Bullets" active={editor.isActive('bulletList')} onClick={() => chain().toggleBulletList().run()} />
                  <RBtn icon="listOrdered" title="Numbering" active={editor.isActive('orderedList')} onClick={() => chain().toggleOrderedList().run()} />
                  <RBtn icon="outdent" title="Decrease indent" disabled={!editor.can().liftListItem('listItem')} onClick={() => chain().liftListItem('listItem').run()} />
                  <RBtn icon="indent" title="Increase indent" disabled={!editor.can().sinkListItem('listItem')} onClick={() => chain().sinkListItem('listItem').run()} />
                  <select className="rb-select spacing" title="Line spacing" value="" onChange={(e) => e.target.value && chain().setLineHeight(e.target.value).run()}>
                    <option value="">↕ Spacing</option>
                    {LINE_SPACING.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="ribbon-row">
                  {[
                    ['left', 'alignLeft', 'Align left'],
                    ['center', 'alignCenter', 'Center'],
                    ['right', 'alignRight', 'Align right'],
                    ['justify', 'alignJustify', 'Justify'],
                  ].map(([a, icon, title]) => (
                    <RBtn key={a} icon={icon} title={title} active={editor.isActive({ textAlign: a })} onClick={() => chain().setTextAlign(a).run()} />
                  ))}
                </div>
              </Group>

              <Group label="Styles">
                <div className="style-gallery">
                  {[
                    ['p', 'Normal'],
                    ['h1', 'Heading 1'],
                    ['h2', 'Heading 2'],
                    ['h3', 'Heading 3'],
                    ['quote', 'Quote'],
                  ].map(([id, label]) => (
                    <button key={id} className={`style-card s-${id} ${blockStyle === id ? 'on' : ''}`} onClick={() => applyStyle(id)}>
                      <span>AaBb</span>
                      {label}
                    </button>
                  ))}
                </div>
              </Group>
            </>
          )}

          {tab === 'insert' && (
            <>
              <Group label="Tables">
                <TablePicker onPick={(rows, cols) => chain().insertTable({ rows, cols, withHeaderRow: true }).run()} />
              </Group>
              <Group label="Illustrations">
                <RBtn big icon="image" label="Picture" onClick={() => imageRef.current?.click()} />
                <input ref={imageRef} type="file" accept="image/*" hidden onChange={addImage} />
              </Group>
              <Group label="Links">
                <RBtn big icon="link" label="Link" active={editor.isActive('link')} onClick={addLink} />
              </Group>
              <Group label="Pages">
                <RBtn big icon="pageBreak" label="Page Break" onClick={() => chain().setPageBreak().run()} />
                <RBtn big icon="hr" label="Line" onClick={() => chain().setHorizontalRule().run()} />
              </Group>
              <Group label="Contract fields">
                <MenuBtn icon="braces" label="Field" title="Insert a merge field">
                  {(close) =>
                    fields.map((f) => (
                      <button
                        key={f}
                        onClick={() => {
                          chain().insertMergeField(f).run()
                          close()
                        }}
                      >
                        {`{{${f}}}`}
                      </button>
                    ))
                  }
                </MenuBtn>
                <MenuBtn icon="signature" label="Signature" title="Insert a signature block">
                  {(close) =>
                    parties.length ? (
                      parties.map((p) => (
                        <button
                          key={p}
                          onClick={() => {
                            chain().insertSignatureBlock(p).run()
                            close()
                          }}
                        >
                          {p}
                        </button>
                      ))
                    ) : (
                      <p className="menu-note">Add signers in Signing Setup first.</p>
                    )
                  }
                </MenuBtn>
                <RBtn
                  big
                  icon="calendarDays"
                  label="Date"
                  onClick={() =>
                    chain()
                      .insertContent(new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }))
                      .run()
                  }
                />
              </Group>
            </>
          )}

          {tab === 'layout' && (
            <>
              <Group label="Orientation">
                <RBtn big icon="portrait" label="Portrait" active={!g.landscape} onClick={() => setup({ orientation: 'portrait' })} />
                <RBtn big icon="landscape" label="Landscape" active={g.landscape} onClick={() => setup({ orientation: 'landscape' })} />
              </Group>
              <Group label="Size">
                {Object.entries(PAGE_SIZES).map(([id, s]) => (
                  <button key={id} className={`option-tile ${pageSetup.size === id ? 'on' : ''}`} onClick={() => setup({ size: id })}>
                    <strong>{s.label}</strong>
                    <span>{s.note}</span>
                  </button>
                ))}
              </Group>
              <Group label="Margins">
                {Object.entries(MARGINS).map(([id, m]) => (
                  <button key={id} className={`option-tile ${pageSetup.margin === id ? 'on' : ''}`} onClick={() => setup({ margin: id })}>
                    <strong>{m.label}</strong>
                    <span>{m.note}</span>
                  </button>
                ))}
              </Group>
            </>
          )}

          {tab === 'table' && inTable && (
            <>
              <Group label="Rows">
                <RBtn label="Insert above" onClick={() => chain().addRowBefore().run()} />
                <RBtn label="Insert below" onClick={() => chain().addRowAfter().run()} />
                <RBtn label="Delete row" onClick={() => chain().deleteRow().run()} />
              </Group>
              <Group label="Columns">
                <RBtn label="Insert left" onClick={() => chain().addColumnBefore().run()} />
                <RBtn label="Insert right" onClick={() => chain().addColumnAfter().run()} />
                <RBtn label="Delete column" onClick={() => chain().deleteColumn().run()} />
              </Group>
              <Group label="Merge">
                <RBtn label="Merge cells" disabled={!editor.can().mergeCells()} onClick={() => chain().mergeCells().run()} />
                <RBtn label="Split cell" disabled={!editor.can().splitCell()} onClick={() => chain().splitCell().run()} />
                <RBtn label="Header row" onClick={() => chain().toggleHeaderRow().run()} />
              </Group>
              <Group label="Table">
                <RBtn label="Delete table" danger onClick={() => chain().deleteTable().run()} />
              </Group>
            </>
          )}
        </div>
      </div>

      <div className="doc-canvas">
        <div className="doc-zoom" style={{ zoom }}>
          <div
            ref={pageRef}
            className="doc-page"
            style={{ width: g.width, minHeight: g.height, padding: `${g.top}px ${g.side}px`, '--page-h': `${g.height}px` }}
            onMouseDown={(e) => e.target === e.currentTarget && editor.commands.focus('end')}
          >
            <EditorContent editor={editor} className="doc-content" />
          </div>
        </div>
      </div>

      <div className="doc-status">
        <span>
          Page {pages > 1 ? `1–${pages}` : 1} of {pages}
        </span>
        <span>{words} words</span>
        <span>
          {PAGE_SIZES[pageSetup.size]?.label} · {g.landscape ? 'Landscape' : 'Portrait'}
        </span>
        <div className="zoom-ctrl">
          <button onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(1)))} aria-label="Zoom out">
            −
          </button>
          <input type="range" min="0.5" max="2" step="0.1" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} aria-label="Zoom" />
          <button onClick={() => setZoom((z) => Math.min(2, +(z + 0.1).toFixed(1)))} aria-label="Zoom in">
            +
          </button>
          <span>{Math.round(zoom * 100)}%</span>
        </div>
      </div>
    </div>
  )
}

function Group({ label, children }) {
  return (
    <div className="rb-group">
      <div className="rb-group-body">{children}</div>
      <span className="rb-group-label">{label}</span>
    </div>
  )
}

function RBtn({ icon, label, title, active, disabled, onClick, big, danger }) {
  return (
    <button
      type="button"
      className={`rb-btn ${big ? 'big' : ''} ${active ? 'on' : ''} ${danger ? 'danger' : ''} ${!icon ? 'text' : ''}`}
      title={title ?? label}
      aria-label={title ?? label}
      aria-pressed={active ?? undefined}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {icon && <Icon name={icon} size={big ? 22 : 16} />}
      {label && <span>{label}</span>}
    </button>
  )
}

function ColorBtn({ icon, title, value, onPick }) {
  return (
    <label className="rb-btn color-btn" title={title}>
      <Icon name={icon} size={16} />
      <span className="color-bar" style={{ background: value || '#000000' }} />
      <input type="color" value={value || '#000000'} onChange={(e) => onPick(e.target.value)} aria-label={title} />
    </label>
  )
}

function useOutsideClose(open, setOpen) {
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open, setOpen])
  return ref
}

function MenuBtn({ icon, label, title, children }) {
  const [open, setOpen] = useState(false)
  const ref = useOutsideClose(open, setOpen)
  return (
    <div className="rb-menu" ref={ref}>
      <RBtn big icon={icon} label={`${label} ▾`} title={title} active={open} onClick={() => setOpen((o) => !o)} />
      {open && <div className="rb-dropdown">{children(() => setOpen(false))}</div>}
    </div>
  )
}

function TablePicker({ onPick }) {
  const [open, setOpen] = useState(false)
  const [hover, setHover] = useState([0, 0])
  const ref = useOutsideClose(open, setOpen)
  return (
    <div className="rb-menu" ref={ref}>
      <RBtn big icon="table" label="Table ▾" active={open} onClick={() => setOpen((o) => !o)} />
      {open && (
        <div className="rb-dropdown table-picker">
          <p>{hover[0] ? `${hover[1]} × ${hover[0]} Table` : 'Insert Table'}</p>
          <div className="tp-grid" onMouseLeave={() => setHover([0, 0])}>
            {Array.from({ length: 8 }, (_, r) =>
              Array.from({ length: 10 }, (_, c) => (
                <button
                  key={`${r}-${c}`}
                  className={r < hover[0] && c < hover[1] ? 'on' : ''}
                  onMouseEnter={() => setHover([r + 1, c + 1])}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onPick(r + 1, c + 1)
                    setOpen(false)
                  }}
                  aria-label={`${r + 1} rows, ${c + 1} columns`}
                />
              )),
            )}
          </div>
        </div>
      )}
    </div>
  )
}
