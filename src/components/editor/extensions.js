import { Extension, Node, mergeAttributes } from '@tiptap/react'
import Image from '@tiptap/extension-image'
import { NodeSelection } from '@tiptap/pm/state'

// Font size as an attribute on the textStyle mark (TipTap has no built-in one).
export const FontSize = Extension.create({
  name: 'fontSize',
  addGlobalAttributes() {
    return [
      {
        types: ['textStyle'],
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (el) => el.style.fontSize || null,
            renderHTML: (attrs) => (attrs.fontSize ? { style: `font-size: ${attrs.fontSize}` } : {}),
          },
        },
      },
    ]
  },
  addCommands() {
    return {
      setFontSize:
        (size) =>
        ({ chain }) =>
          chain().setMark('textStyle', { fontSize: size }).run(),
    }
  },
})

// Line spacing on paragraphs and headings.
export const LineHeight = Extension.create({
  name: 'lineHeight',
  addGlobalAttributes() {
    return [
      {
        types: ['paragraph', 'heading'],
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: (el) => el.style.lineHeight || null,
            renderHTML: (attrs) => (attrs.lineHeight ? { style: `line-height: ${attrs.lineHeight}` } : {}),
          },
        },
      },
    ]
  },
  addCommands() {
    return {
      setLineHeight:
        (lineHeight) =>
        ({ commands }) =>
          ['paragraph', 'heading'].map((type) => commands.updateAttributes(type, { lineHeight })).some(Boolean),
    }
  },
})

// Forces the following content onto a new page in the exported PDF.
export const PageBreak = Node.create({
  name: 'pageBreak',
  group: 'block',
  atom: true,
  selectable: true,
  parseHTML() {
    return [{ tag: 'div[data-page-break]' }]
  },
  renderHTML() {
    return ['div', { 'data-page-break': '', class: 'page-break' }]
  },
  addCommands() {
    return {
      setPageBreak:
        () =>
        ({ commands }) =>
          commands.insertContent([{ type: this.name }, { type: 'paragraph' }]),
    }
  },
})

// Placeholder such as {{Borrower Name}}, filled in when a contract is initiated.
export const MergeField = Node.create({
  name: 'mergeField',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  addAttributes() {
    return { label: { default: 'Field', parseHTML: (el) => el.getAttribute('data-field') } }
  },
  parseHTML() {
    return [{ tag: 'span[data-field]' }]
  },
  renderHTML({ node, HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 'data-field': node.attrs.label, class: 'merge-field' }), `{{${node.attrs.label}}}`]
  },
  addCommands() {
    return {
      insertMergeField:
        (label) =>
        ({ commands }) =>
          commands.insertContent([{ type: this.name, attrs: { label } }, { type: 'text', text: ' ' }]),
    }
  },
})

// A "sign here" block for one party.
export const SignatureBlock = Node.create({
  name: 'signatureBlock',
  group: 'block',
  atom: true,
  selectable: true,
  addAttributes() {
    return { party: { default: 'Signer', parseHTML: (el) => el.getAttribute('data-signature') } }
  },
  parseHTML() {
    return [{ tag: 'div[data-signature]' }]
  },
  renderHTML({ node }) {
    return [
      'div',
      { 'data-signature': node.attrs.party, class: 'signature-block' },
      ['div', { class: 'sig-space' }],
      ['div', { class: 'sig-rule' }],
      ['div', { class: 'sig-party' }, node.attrs.party],
      ['div', { class: 'sig-caption' }, 'Signature & Date'],
    ]
  },
  addCommands() {
    return {
      insertSignatureBlock:
        (party) =>
        ({ commands }) =>
          commands.insertContent([{ type: this.name, attrs: { party } }, { type: 'paragraph' }]),
    }
  },
})

// Picture layouts, like Word's "Wrap Text" options. Styles are inline so the saved HTML,
// thumbnails and the exported PDF look the same as the editor.
export const IMAGE_LAYOUTS = {
  inline: { label: 'In line with text', style: 'vertical-align: bottom' },
  left: { label: 'Wrap text, picture on the left', style: 'float: left; margin: 4px 16px 8px 0' },
  right: { label: 'Wrap text, picture on the right', style: 'float: right; margin: 4px 0 8px 16px' },
  center: { label: 'Top and bottom, centered', style: 'display: block; margin: 8px auto' },
  free: { label: 'In front of text: drag it anywhere on the page' },
}
const MIN_IMAGE_WIDTH = 24

// Style for a picture; "free" pictures sit at x/y from the top-left of the page's text area
function imageStyle({ width, layout, x, y }) {
  const place = layout === 'free' ? `position: absolute; left: ${x ?? 0}px; top: ${y ?? 0}px; z-index: 1` : IMAGE_LAYOUTS[layout]?.style
  return [width ? `width: ${width}px` : '', place].filter(Boolean).join('; ')
}

// Keeps a free picture inside the text area, so it never falls off the page in the PDF
function clampPosition(root, x, y, w, h) {
  return {
    x: Math.round(Math.min(Math.max(0, x), Math.max(0, root.clientWidth - w))),
    y: Math.round(Math.min(Math.max(0, y), Math.max(0, root.clientHeight - h))),
  }
}

// Pictures with a width and a layout, resized by dragging their corner handles.
// "In front of text" pictures can also be dragged anywhere, or nudged with the arrow keys.
export const ResizableImage = Image.extend({
  draggable: true,
  addAttributes() {
    const px = (prop) => ({
      default: null,
      parseHTML: (el) => (el.getAttribute('data-layout') === 'free' ? parseInt(el.style[prop], 10) || 0 : null),
      renderHTML: () => ({}),
    })
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (el) => parseInt(el.style.width || el.getAttribute('width'), 10) || null,
        renderHTML: () => ({}),
      },
      layout: {
        default: 'inline',
        parseHTML: (el) => (IMAGE_LAYOUTS[el.getAttribute('data-layout')] ? el.getAttribute('data-layout') : 'inline'),
        renderHTML: () => ({}),
      },
      x: px('left'),
      y: px('top'),
    }
  },
  renderHTML({ node, HTMLAttributes }) {
    return ['img', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { 'data-layout': node.attrs.layout, style: imageStyle(node.attrs) })]
  },
  addCommands() {
    return {
      ...this.parent?.(),
      // Changes the selected picture's layout; switching to "free" keeps it where it is on screen
      setImageLayout:
        (layout) =>
        ({ state, view, tr, dispatch }) => {
          const { selection } = state
          if (!(selection instanceof NodeSelection) || selection.node.type.name !== this.name) return false
          const pos = selection.from
          const attrs = { ...selection.node.attrs, layout }
          if (layout === 'free' && selection.node.attrs.layout !== 'free') {
            const el = view.nodeDOM(pos)
            const root = view.dom
            const r = el.getBoundingClientRect()
            const base = root.getBoundingClientRect()
            const scale = base.width / root.offsetWidth || 1
            Object.assign(attrs, clampPosition(root, (r.left - base.left) / scale, (r.top - base.top) / scale, el.offsetWidth, el.offsetHeight))
          }
          if (dispatch) {
            tr.setNodeMarkup(pos, undefined, attrs)
            tr.setSelection(NodeSelection.create(tr.doc, pos))
          }
          return true
        },
    }
  },
  addKeyboardShortcuts() {
    const nudge = (dx, dy) => () => {
      const { state, view } = this.editor
      const { selection } = state
      if (!(selection instanceof NodeSelection) || selection.node.type.name !== this.name || selection.node.attrs.layout !== 'free') return false
      const { node, from } = selection
      const el = view.nodeDOM(from)
      const tr = state.tr.setNodeMarkup(from, undefined, {
        ...node.attrs,
        ...clampPosition(view.dom, (node.attrs.x ?? 0) + dx, (node.attrs.y ?? 0) + dy, el.offsetWidth, el.offsetHeight),
      })
      view.dispatch(tr.setSelection(NodeSelection.create(tr.doc, from)))
      return true
    }
    return {
      ArrowLeft: nudge(-1, 0),
      ArrowRight: nudge(1, 0),
      ArrowUp: nudge(0, -1),
      ArrowDown: nudge(0, 1),
      'Shift-ArrowLeft': nudge(-10, 0),
      'Shift-ArrowRight': nudge(10, 0),
      'Shift-ArrowUp': nudge(0, -10),
      'Shift-ArrowDown': nudge(0, 10),
    }
  },
  addNodeView() {
    return ({ node, editor, getPos }) => {
      let current = node
      const dom = document.createElement('span')
      dom.className = 'doc-image'
      const img = document.createElement('img')
      img.draggable = false
      dom.append(img)
      const isFree = () => current.attrs.layout === 'free'
      const select = () => {
        const pos = getPos()
        if (editor.isEditable && typeof pos === 'number') editor.commands.setNodeSelection(pos)
      }
      // The first click into an unfocused editor would otherwise just place the text cursor
      img.addEventListener('click', select)
      img.addEventListener('pointerdown', (e) => isFree() && startMove(e))
      for (const dir of ['nw', 'ne', 'sw', 'se']) {
        const handle = document.createElement('span')
        handle.className = `img-handle ${dir}`
        handle.dataset.dir = dir
        handle.addEventListener('pointerdown', (e) => startResize(e, dir))
        dom.append(handle)
      }

      const render = (n) => {
        img.src = n.attrs.src
        img.alt = n.attrs.alt ?? ''
        if (n.attrs.title) img.title = n.attrs.title
        img.style.width = n.attrs.width ? `${n.attrs.width}px` : ''
        dom.dataset.layout = n.attrs.layout
        const free = n.attrs.layout === 'free'
        dom.style.left = free ? `${n.attrs.x ?? 0}px` : ''
        dom.style.top = free ? `${n.attrs.y ?? 0}px` : ''
        // Free pictures follow the mouse; the others are dragged between words like text
        dom.draggable = !free
      }
      render(node)

      const save = (patch) => {
        const pos = getPos()
        if (typeof pos !== 'number') return
        const { tr } = editor.view.state
        tr.setNodeMarkup(pos, undefined, { ...current.attrs, ...patch })
        tr.setSelection(NodeSelection.create(tr.doc, pos))
        editor.view.dispatch(tr)
      }

      // Follows the mouse until the button is released; the page zoom is taken into account
      const track = (e, onMove, onDone) => {
        if (!editor.isEditable || e.button !== 0) return
        e.preventDefault()
        e.stopPropagation()
        const start = { x: e.clientX, y: e.clientY, scale: img.getBoundingClientRect().width / img.offsetWidth || 1 }
        dom.classList.add('resizing')
        const move = (ev) => onMove((ev.clientX - start.x) / start.scale, (ev.clientY - start.y) / start.scale)
        const up = () => {
          window.removeEventListener('pointermove', move)
          window.removeEventListener('pointerup', up)
          dom.classList.remove('resizing')
          delete dom.dataset.size
          onDone()
        }
        window.addEventListener('pointermove', move)
        window.addEventListener('pointerup', up)
      }

      const startMove = (e) => {
        select()
        const root = editor.view.dom
        const from = { x: current.attrs.x ?? 0, y: current.attrs.y ?? 0 }
        let to = from
        track(
          e,
          (dx, dy) => {
            to = clampPosition(root, from.x + dx, from.y + dy, dom.offsetWidth, dom.offsetHeight)
            dom.style.left = `${to.x}px`
            dom.style.top = `${to.y}px`
          },
          () => (to.x !== from.x || to.y !== from.y) && save(to),
        )
      }

      // Dragging a corner keeps the aspect ratio; a free picture keeps its opposite corner in place
      const startResize = (e, dir) => {
        const startWidth = img.offsetWidth
        const startHeight = img.offsetHeight
        const maxWidth = editor.view.dom.clientWidth
        const sign = dir.endsWith('w') ? -1 : 1
        let width = startWidth
        track(
          e,
          (dx) => {
            width = Math.round(Math.min(maxWidth, Math.max(MIN_IMAGE_WIDTH, startWidth + sign * dx)))
            img.style.width = `${width}px`
            dom.dataset.size = `${width} × ${Math.round(img.offsetHeight)} px`
            if (isFree() && dir.endsWith('w')) dom.style.left = `${(current.attrs.x ?? 0) + startWidth - width}px`
            if (isFree() && dir.startsWith('n')) dom.style.top = `${(current.attrs.y ?? 0) + startHeight - img.offsetHeight}px`
          },
          () => {
            if (width === startWidth) return
            const patch = { width }
            if (isFree()) Object.assign(patch, { x: parseInt(dom.style.left, 10) || 0, y: parseInt(dom.style.top, 10) || 0 })
            save(patch)
          },
        )
      }

      return {
        dom,
        update: (n) => {
          if (n.type !== current.type) return false
          current = n
          render(n)
          return true
        },
        // Handles, and the mouse on a free picture, are ours; everything else goes to the editor
        stopEvent: (e) =>
          (e.target instanceof Element && e.target.classList.contains('img-handle')) || (isFree() && /^(mouse|pointer|drag)/.test(e.type)),
        ignoreMutation: () => true,
      }
    }
  },
})
