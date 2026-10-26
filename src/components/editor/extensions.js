import { Extension, Node, mergeAttributes } from '@tiptap/react'

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
