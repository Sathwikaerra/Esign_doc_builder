import { useEffect, useRef, useState } from 'react'
import { Modal } from '../ui/Overlay'
import Icon from '../ui/Icon'

const INK = '#1e2a78'
const PAD = { w: 520, h: 180 }
// Handwriting-style fonts that ship with Windows / macOS, with generic fallbacks
const TYPE_FONTS = [
  { id: 'script', label: 'Script', css: "'Segoe Script', 'Brush Script MT', 'Snell Roundhand', cursive" },
  { id: 'hand', label: 'Handwriting', css: "'Lucida Handwriting', 'Bradley Hand', cursive" },
  { id: 'ink', label: 'Ink', css: "'Ink Free', 'Segoe Print', 'Chalkboard', cursive" },
]

// Crops a canvas to its inked area (plus a margin) and returns a PNG data URL, or null if empty
function trimToPng(canvas) {
  const ctx = canvas.getContext('2d')
  const { width, height } = canvas
  const data = ctx.getImageData(0, 0, width, height).data
  let top = height, left = width, right = -1, bottom = -1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 10) {
        if (x < left) left = x
        if (x > right) right = x
        if (y < top) top = y
        if (y > bottom) bottom = y
      }
    }
  }
  if (right < 0) return null
  const m = 12
  const out = document.createElement('canvas')
  out.width = Math.min(width, right - left + 1 + m * 2)
  out.height = Math.min(height, bottom - top + 1 + m * 2)
  out.getContext('2d').drawImage(canvas, Math.max(0, left - m), Math.max(0, top - m), out.width, out.height, 0, 0, out.width, out.height)
  return out.toDataURL('image/png')
}

function DrawPad({ onChange }) {
  const ref = useRef(null)
  const drawing = useRef(null)
  const [empty, setEmpty] = useState(true)

  useEffect(() => {
    const canvas = ref.current
    const ratio = window.devicePixelRatio || 1
    canvas.width = PAD.w * ratio
    canvas.height = PAD.h * ratio
    const ctx = canvas.getContext('2d')
    ctx.scale(ratio, ratio)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = INK
    ctx.lineWidth = 2.6
  }, [])

  const point = (e) => {
    const r = ref.current.getBoundingClientRect()
    return { x: ((e.clientX - r.left) / r.width) * PAD.w, y: ((e.clientY - r.top) / r.height) * PAD.h }
  }
  const down = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    const p = point(e)
    drawing.current = { last: p, mid: p }
    const ctx = ref.current.getContext('2d')
    ctx.beginPath()
    ctx.arc(p.x, p.y, 1.2, 0, Math.PI * 2)
    ctx.fillStyle = INK
    ctx.fill()
  }
  const move = (e) => {
    if (!drawing.current) return
    const p = point(e)
    const { last, mid } = drawing.current
    const nextMid = { x: (last.x + p.x) / 2, y: (last.y + p.y) / 2 }
    const ctx = ref.current.getContext('2d')
    ctx.beginPath()
    ctx.moveTo(mid.x, mid.y)
    ctx.quadraticCurveTo(last.x, last.y, nextMid.x, nextMid.y)
    ctx.stroke()
    drawing.current = { last: p, mid: nextMid }
  }
  const up = () => {
    if (!drawing.current) return
    // Finish the stroke: the curve only reaches the midpoint before the last point
    const { last, mid } = drawing.current
    const ctx = ref.current.getContext('2d')
    ctx.beginPath()
    ctx.moveTo(mid.x, mid.y)
    ctx.lineTo(last.x, last.y)
    ctx.stroke()
    drawing.current = null
    setEmpty(false)
    onChange(trimToPng(ref.current))
  }
  const clear = () => {
    const c = ref.current
    c.getContext('2d').clearRect(0, 0, c.width, c.height)
    setEmpty(true)
    onChange(null)
  }

  return (
    <div className="sigpad">
      <canvas ref={ref} className="sigpad-canvas" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} />
      <div className="sigpad-line">
        <span>✕</span>
      </div>
      {empty && <span className="sigpad-hint">Draw your signature here</span>}
      <button type="button" className="btn ghost xs sigpad-clear" onClick={clear} disabled={empty}>
        <Icon name="refresh" size={13} /> Clear
      </button>
    </div>
  )
}

function renderTyped(text, fontCss) {
  const ratio = 2
  const canvas = document.createElement('canvas')
  canvas.width = PAD.w * ratio
  canvas.height = PAD.h * ratio
  const ctx = canvas.getContext('2d')
  ctx.scale(ratio, ratio)
  let size = 56
  ctx.font = `${size}px ${fontCss}`
  while (ctx.measureText(text).width > PAD.w - 40 && size > 20) {
    size -= 2
    ctx.font = `${size}px ${fontCss}`
  }
  ctx.fillStyle = INK
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 20, PAD.h / 2)
  return trimToPng(canvas)
}

// Lets the signer draw or type a signature; onAdopt({ image, type }) gets a trimmed PNG data URL
export default function SignatureModal({ open, onClose, defaultName = '', onAdopt }) {
  const [tab, setTab] = useState('draw')
  const [drawn, setDrawn] = useState(null)
  const [typed, setTyped] = useState(defaultName)
  const [font, setFont] = useState(TYPE_FONTS[0].id)

  useEffect(() => {
    if (open) {
      setDrawn(null)
      setTyped(defaultName)
    }
  }, [open, defaultName])

  const fontCss = TYPE_FONTS.find((f) => f.id === font).css
  const ready = tab === 'draw' ? !!drawn : typed.trim().length > 0

  const adopt = () => {
    const image = tab === 'draw' ? drawn : renderTyped(typed.trim(), fontCss)
    if (image) onAdopt({ image, type: tab })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Adopt your signature"
      subtitle="This signature will be placed in every box assigned to you."
      width={600}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" onClick={adopt} disabled={!ready}>
            <Icon name="check" size={16} /> Adopt signature
          </button>
        </>
      }
    >
      <div className="seg-tabs">
        <button className={tab === 'draw' ? 'on' : ''} onClick={() => setTab('draw')}>
          <Icon name="signature" size={15} /> Draw
        </button>
        <button className={tab === 'type' ? 'on' : ''} onClick={() => setTab('type')}>
          <Icon name="edit" size={15} /> Type
        </button>
      </div>

      {tab === 'draw' ? (
        <DrawPad key={open ? 'open' : 'closed'} onChange={setDrawn} />
      ) : (
        <div className="sigtype">
          <label className="field">
            <span className="field-label">Your full name</span>
            <input value={typed} maxLength={60} onChange={(e) => setTyped(e.target.value)} autoFocus />
          </label>
          <div className="sigtype-options">
            {TYPE_FONTS.map((f) => (
              <button key={f.id} type="button" className={`sigtype-option ${font === f.id ? 'on' : ''}`} onClick={() => setFont(f.id)}>
                <span style={{ fontFamily: f.css }}>{typed.trim() || 'Your name'}</span>
                <small>{f.label}</small>
              </button>
            ))}
          </div>
        </div>
      )}
    </Modal>
  )
}
