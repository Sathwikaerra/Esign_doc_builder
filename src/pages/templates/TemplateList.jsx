import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { deleteTemplate, listTemplates } from '../../services/templateService'
import { STARTER_DOCS } from '../../constants/docTemplates'
import { EXPIRY_UNITS } from '../../constants/workflow'
import { formatDateTime } from '../../utils/format'
import { pageGeometry } from '../../components/editor/pageSetup'
import Icon from '../../components/ui/Icon'
import { EmptyState, PageTitle } from '../../components/ui/Controls'
import { Modal } from '../../components/ui/Overlay'
import { useToast } from '../../components/ui/Toast'

export function templateSummary(t) {
  const count = (kind) => t.participants.filter((p) => p.kind === kind).length
  const parts = [`${count('signer')} signer${count('signer') === 1 ? '' : 's'}`]
  if (count('reviewer')) parts.push(`${count('reviewer')} reviewer${count('reviewer') === 1 ? '' : 's'}`)
  if (count('auto')) parts.push(`${count('auto')} auto signature`)
  return parts.join(' · ')
}

// A scaled-down render of the first page of a document, like Office's file thumbnails.
export function DocThumb({ html, pageSetup, width = 220 }) {
  const g = pageGeometry(pageSetup)
  const scale = width / g.width
  return (
    <div className="doc-thumb" style={{ width, height: g.height * scale }}>
      <div
        className="doc-thumb-page doc-content"
        style={{ width: g.width, height: g.height, padding: `${g.top}px ${g.side}px`, transform: `scale(${scale})` }}
      >
        <div className="doc-thumb-body" dangerouslySetInnerHTML={{ __html: html || '' }} />
      </div>
    </div>
  )
}

export default function TemplateList() {
  const navigate = useNavigate()
  const toast = useToast()
  const [templates, setTemplates] = useState(null)
  const [search, setSearch] = useState('')
  const [showGallery, setShowGallery] = useState(false)

  const reload = () =>
    listTemplates()
      .then(setTemplates)
      .catch((err) => {
        setTemplates((t) => t ?? [])
        toast(err.message, 'error')
      })
  useEffect(() => {
    reload()
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (templates ?? []).filter((t) => !q || t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q))
  }, [templates, search])

  const remove = async (t) => {
    if (!window.confirm(`Delete template "${t.name}"? Workflows already created from it are not affected.`)) return
    try {
      await deleteTemplate(t.id)
      toast('Template deleted')
      reload()
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  const open = (t) => navigate(`/templates/${t.id}`)
  const stop = (fn) => (e) => {
    e.stopPropagation()
    fn()
  }

  return (
    <div className="page">
      <PageTitle title="Templates" crumbs={['Dashboard', 'Templates']}>
        <button className="btn primary" onClick={() => setShowGallery(true)}>
          <Icon name="plus" size={16} /> Create Template
        </button>
      </PageTitle>

      <div className="search-row">
        <div className="search-box">
          <Icon name="search" size={16} />
          <input placeholder="Search templates" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {!templates && <div className="loading-text">Loading templates…</div>}

      {templates && filtered.length === 0 && (
        <div className="card">
          <EmptyState
            title={search ? 'No matching templates' : 'No templates yet'}
            message="Create a document template once and reuse it for every new workflow."
          />
        </div>
      )}

      <div className="tpl-grid">
        {filtered.map((t) => (
          <article
            key={t.id}
            className="card tpl-card"
            role="button"
            tabIndex={0}
            onClick={() => open(t)}
            onKeyDown={(e) => e.key === 'Enter' && open(t)}
            aria-label={`Open template ${t.name}`}
          >
            <DocThumb html={t.content} pageSetup={t.pageSetup} />
            <div className="tpl-info">
              <h3>{t.name}</h3>
              <span className="muted small">Edited {formatDateTime(t.updatedAt)}</span>
              <div className="tpl-tags">
                <span className="chip">{templateSummary(t)}</span>
                <span className="chip">{t.signingMethod === 'parallel' ? 'Parallel' : 'Sequential'}</span>
                <span className="chip">
                  {t.expiryValue} {EXPIRY_UNITS.find((u) => u.value === t.expiryUnit)?.label.toLowerCase()}
                </span>
              </div>
            </div>
            <div className="tpl-actions">
              <button className="btn primary sm" onClick={stop(() => navigate('/workflows/new', { state: { templateId: t.id } }))}>
                Use <Icon name="arrowRight" size={14} />
              </button>
              <button className="btn sm" onClick={stop(() => open(t))}>
                <Icon name="edit" size={14} /> Open
              </button>
              <button className="icon-btn danger push" onClick={stop(() => remove(t))} aria-label={`Delete ${t.name}`}>
                <Icon name="trash" size={16} />
              </button>
            </div>
          </article>
        ))}
      </div>

      <Modal open={showGallery} onClose={() => setShowGallery(false)} title="New template" subtitle="Start with a blank page or a ready-made document." width={900}>
        <div className="gallery-grid">
          {STARTER_DOCS.map((d) => (
            <button key={d.id} className="gallery-item" onClick={() => navigate('/templates/new', { state: { starter: d.id } })}>
              {d.id === 'blank' ? (
                <div className="doc-thumb blank">
                  <Icon name="plus" size={30} />
                </div>
              ) : (
                <DocThumb html={d.html} width={160} />
              )}
              <strong>{d.name}</strong>
              <span className="muted small">{d.description}</span>
            </button>
          ))}
        </div>
      </Modal>
    </div>
  )
}
