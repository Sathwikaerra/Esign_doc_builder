import { useEffect, useRef, useState } from 'react'
import * as pdfjs from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import Icon from './ui/Icon'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

const BASE_WIDTH = 560
const MIN_DRAG = 12 // px; smaller drags count as a click and drop a default-size box
const DEFAULT_BOX = { w: 100, h: 60 } // px at 100% zoom

/*
 * Renders every page of a PDF. Boxes use page-relative fractions (0..1) so they
 * survive zoom changes and map cleanly to PDF coordinates on the backend.
 *
 * box: { id, owner, page, x, y, w, h }
 * When `editableOwner` is set, clicking/dragging on a page creates a box for that owner,
 * and that owner's boxes can be moved, resized, deleted or copied to other pages.
 * Read-only views can pass `renderBox(box)` to draw custom box content and `onBoxClick(box)`.
 */
export default function PdfViewer({ file, boxes = [], editableOwner, ownerInfo = {}, onAddBox, onUpdateBox, onDeleteBox, onCopyBox, onLoaded, renderBox, onBoxClick }) {
  const [pdf, setPdf] = useState(null)
  const [error, setError] = useState('')
  const [zoom, setZoom] = useState(1)
  const scrollRef = useRef(null)
  const [baseWidth, setBaseWidth] = useState(BASE_WIDTH)

  // Pages render at BASE_WIDTH, or narrower when the viewer is (phones)
  useEffect(() => {
    const el = scrollRef.current
    const observer = new ResizeObserver(([entry]) => {
      setBaseWidth(Math.round(Math.min(BASE_WIDTH, Math.max(240, entry.contentRect.width - 24))))
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    setPdf(null)
    setError('')
    if (!file) return
    let cancelled = false
    let task
    file
      .arrayBuffer()
      .then((buf) => {
        task = pdfjs.getDocument({ data: buf })
        return task.promise
      })
      .then((doc) => {
        if (cancelled) return
        setPdf(doc)
        onLoaded?.(doc.numPages)
      })
      .catch(() => !cancelled && setError('Could not open this PDF.'))
    return () => {
      cancelled = true
      task?.destroy()
    }
  }, [file])

  return (
    <div className="pdf-viewer">
      <div className="pdf-scroll" ref={scrollRef}>
        {!file && <div className="pdf-placeholder">No document uploaded</div>}
        {error && <div className="pdf-placeholder">{error}</div>}
        {file && !pdf && !error && <div className="pdf-placeholder">Loading document…</div>}
        {pdf &&
          Array.from({ length: pdf.numPages }, (_, i) => (
            <PdfPage
              key={i}
              pdf={pdf}
              pageNumber={i + 1}
              total={pdf.numPages}
              zoom={zoom}
              baseWidth={baseWidth}
              boxes={boxes.filter((b) => b.page === i + 1)}
              editableOwner={editableOwner}
              ownerInfo={ownerInfo}
              onAddBox={onAddBox}
              onUpdateBox={onUpdateBox}
              onDeleteBox={onDeleteBox}
              onCopyBox={onCopyBox}
              renderBox={renderBox}
              onBoxClick={onBoxClick}
            />
          ))}
      </div>
      <div className="zoom-bar">
        <button onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))} aria-label="Zoom out">
          <Icon name="zoomOut" size={16} />
        </button>
        <span>{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom((z) => Math.min(2, +(z + 0.25).toFixed(2)))} aria-label="Zoom in">
          <Icon name="zoomIn" size={16} />
        </button>
      </div>
    </div>
  )
}

function PdfPage({ pdf, pageNumber, total, zoom, baseWidth, boxes, editableOwner, ownerInfo, onAddBox, onUpdateBox, onDeleteBox, onCopyBox, renderBox, onBoxClick }) {
  const canvasRef = useRef(null)
  const overlayRef = useRef(null)
  const [size, setSize] = useState(null)
  const [draft, setDraft] = useState(null)

  useEffect(() => {
    let renderTask
    let cancelled = false
    pdf.getPage(pageNumber).then((page) => {
      if (cancelled) return
      const base = page.getViewport({ scale: 1 })
      const scale = (baseWidth * zoom) / base.width
      const viewport = page.getViewport({ scale })
      const ratio = window.devicePixelRatio || 1
      const canvas = canvasRef.current
      canvas.width = Math.floor(viewport.width * ratio)
      canvas.height = Math.floor(viewport.height * ratio)
      canvas.style.width = `${viewport.width}px`
      canvas.style.height = `${viewport.height}px`
      setSize({ w: viewport.width, h: viewport.height })
      renderTask = page.render({
        canvasContext: canvas.getContext('2d'),
        viewport,
        transform: ratio !== 1 ? [ratio, 0, 0, ratio, 0, 0] : undefined,
      })
      renderTask.promise.catch(() => {})
    })
    return () => {
      cancelled = true
      renderTask?.cancel()
    }
  }, [pdf, pageNumber, zoom, baseWidth])

  const toFraction = (e) => {
    const r = overlayRef.current.getBoundingClientRect()
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height }
  }
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

  // Drawing a new box
  const startDraw = (e) => {
    if (!editableOwner || e.button !== 0 || e.target !== overlayRef.current) return
    const start = toFraction(e)
    const startPx = { x: e.clientX, y: e.clientY }
    let current = null
    const move = (ev) => {
      const p = toFraction(ev)
      current = {
        x: clamp(Math.min(start.x, p.x), 0, 1),
        y: clamp(Math.min(start.y, p.y), 0, 1),
        w: Math.abs(p.x - start.x),
        h: Math.abs(p.y - start.y),
      }
      setDraft(current)
    }
    const up = (ev) => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      setDraft(null)
      const dragged = Math.hypot(ev.clientX - startPx.x, ev.clientY - startPx.y) > MIN_DRAG
      if (dragged && current) {
        onAddBox({ page: pageNumber, ...current, w: Math.min(current.w, 1 - current.x), h: Math.min(current.h, 1 - current.y) })
      } else {
        const w = (DEFAULT_BOX.w * zoom) / size.w
        const h = (DEFAULT_BOX.h * zoom) / size.h
        onAddBox({ page: pageNumber, x: clamp(start.x - w / 2, 0, 1 - w), y: clamp(start.y - h / 2, 0, 1 - h), w, h })
      }
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  // Moving or resizing an existing box
  const startEdit = (e, box, mode) => {
    e.stopPropagation()
    if (e.button !== 0) return
    const start = toFraction(e)
    const move = (ev) => {
      const p = toFraction(ev)
      const dx = p.x - start.x
      const dy = p.y - start.y
      if (mode === 'move') {
        onUpdateBox(box.id, { x: clamp(box.x + dx, 0, 1 - box.w), y: clamp(box.y + dy, 0, 1 - box.h) })
      } else {
        onUpdateBox(box.id, { w: clamp(box.w + dx, 0.03, 1 - box.x), h: clamp(box.h + dy, 0.02, 1 - box.y) })
      }
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  return (
    <div className="pdf-page-wrap">
      <div className="pdf-page" style={size ? { width: size.w, height: size.h } : undefined}>
        <canvas ref={canvasRef} />
        <div
          ref={overlayRef}
          className={`pdf-overlay ${editableOwner ? 'drawable' : ''}`}
          onPointerDown={startDraw}
        >
          {boxes.map((b) => {
            const info = ownerInfo[b.owner] ?? {}
            const editable = b.owner === editableOwner
            const px = size ? { w: Math.round((b.w * size.w) / zoom), h: Math.round((b.h * size.h) / zoom) } : null
            const custom = renderBox?.(b)
            return (
              <div
                key={b.id}
                className={`sig-box ${editable ? 'editable' : ''} ${b.className ?? ''}`}
                style={{
                  left: `${b.x * 100}%`,
                  top: `${b.y * 100}%`,
                  width: `${b.w * 100}%`,
                  height: `${b.h * 100}%`,
                  '--box-color': info.color ?? '#0f766e',
                }}
                onPointerDown={editable ? (e) => startEdit(e, b, 'move') : undefined}
                onClick={onBoxClick ? () => onBoxClick(b) : undefined}
              >
                {custom ?? <span className="sig-box-label">{info.label ?? 'Signer'}</span>}
                {editable && (
                  <>
                    <span className="sig-box-size">
                      {px?.w} × {px?.h}
                    </span>
                    <button
                      className="sig-box-btn delete"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => onDeleteBox(b.id)}
                      aria-label="Delete box"
                    >
                      <Icon name="trash" size={11} />
                    </button>
                    {total > 1 && (
                      <button
                        className="sig-box-btn copy"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() => onCopyBox(b)}
                      >
                        <Icon name="plus" size={11} /> Pages
                      </button>
                    )}
                    <span className="sig-box-resize" onPointerDown={(e) => startEdit(e, b, 'resize')}>
                      <Icon name="resize" size={10} />
                    </span>
                  </>
                )}
              </div>
            )
          })}
          {draft && (
            <div
              className="sig-box drafting"
              style={{ left: `${draft.x * 100}%`, top: `${draft.y * 100}%`, width: `${draft.w * 100}%`, height: `${draft.h * 100}%` }}
            />
          )}
        </div>
        <span className="page-count">
          {pageNumber} of {total}
        </span>
      </div>
      <div className="page-label">Page {pageNumber}</div>
    </div>
  )
}
