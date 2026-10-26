import { useEffect, useState } from 'react'
import { parsePageList } from '../../../utils/format'
import { Modal } from '../../../components/ui/Overlay'

export default function CopyToPagesModal({ box, numPages, onClose, onCopy }) {
  const [mode, setMode] = useState('all')
  const [range, setRange] = useState({ from: 1, to: numPages })
  const [specific, setSpecific] = useState('')

  useEffect(() => {
    setMode('all')
    setRange({ from: 1, to: numPages })
    setSpecific('')
  }, [box, numPages])

  if (!box) return null

  const pages =
    mode === 'all'
      ? Array.from({ length: numPages }, (_, i) => i + 1)
      : mode === 'range'
        ? parsePageList(`${range.from}-${range.to}`, numPages)
        : parsePageList(specific, numPages)
  const targets = pages.filter((p) => p !== box.page)

  const option = (value, title, children) => (
    <label key={value} className={`option-card ${mode === value ? 'on' : ''}`}>
      <span className="radio">
        <input type="radio" checked={mode === value} onChange={() => setMode(value)} />
        <strong>{title}</strong>
      </span>
      {children}
    </label>
  )

  return (
    <Modal
      open
      onClose={onClose}
      title="Copy Signature Box to Pages"
      subtitle="This will copy the signature box at the same position to selected pages."
      width={460}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" disabled={!targets.length} onClick={() => onCopy(targets)}>
            Copy to {targets.length || ''} Page{targets.length === 1 ? '' : 's'}
          </button>
        </>
      }
    >
      {option('all', 'All Pages', <span className="muted small">Copy to all {numPages} pages in the document</span>)}
      {option(
        'range',
        'Page Range',
        <div className="range-inputs">
          <input type="number" min="1" max={numPages} value={range.from} disabled={mode !== 'range'} onChange={(e) => setRange({ ...range, from: e.target.value })} />
          to
          <input type="number" min="1" max={numPages} value={range.to} disabled={mode !== 'range'} onChange={(e) => setRange({ ...range, to: e.target.value })} />
        </div>,
      )}
      {option(
        'specific',
        'Specific Pages',
        <>
          <input placeholder="e.g., 1, 3, 4" value={specific} disabled={mode !== 'specific'} onChange={(e) => setSpecific(e.target.value)} />
          <span className="muted small">Enter page numbers (e.g. 1, 3-5, 8)</span>
        </>,
      )}
    </Modal>
  )
}
