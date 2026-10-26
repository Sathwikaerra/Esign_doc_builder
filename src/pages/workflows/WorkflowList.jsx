import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { deleteWorkflow, importWorkflow, listWorkflows, setWorkflowStatus } from '../../services/workflowService'
import { listTemplates } from '../../services/templateService'
import { templateSummary } from '../templates/TemplateList'
import { formatDateTime } from '../../utils/format'
import Icon from '../../components/ui/Icon'
import { CopyButton, EmptyState, PageTitle, SortTh } from '../../components/ui/Controls'
import { Modal } from '../../components/ui/Overlay'
import { useToast } from '../../components/ui/Toast'
import InitiateModal from './InitiateModal'

const TABS = [
  { id: 'active', label: 'Active Workflows' },
  { id: 'inactive', label: 'Inactive Workflows' },
  { id: 'draft', label: 'Saved Drafts' },
  { id: 'templates', label: 'Template Workflows' },
]

const EMPTY_TEXT = {
  active: ['No Active Workflows', 'Create a new workflow from a PDF or a template to get started.'],
  inactive: ['No Inactive Workflows', 'Workflows you deactivate will show up here.'],
  draft: ['No Drafts Found !', 'Partially filled workflows can be saved as drafts and continued later.'],
}

export default function WorkflowList() {
  const navigate = useNavigate()
  const toast = useToast()
  const [workflows, setWorkflows] = useState(null)
  const [tab, setTab] = useState('active')
  const [search, setSearch] = useState('')
  const [methodFilter, setMethodFilter] = useState('all')
  const [showFilter, setShowFilter] = useState(false)
  const [showNewMenu, setShowNewMenu] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [initiating, setInitiating] = useState(null)
  const [sort, setSort] = useState({ key: 'createdAt', dir: -1 })
  const [page, setPage] = useState(0)
  const [perPage, setPerPage] = useState(5)
  const importRef = useRef(null)

  const [templates, setTemplates] = useState([])

  const fail = (err) => toast(err.message, 'error')
  const reload = () =>
    listWorkflows()
      .then(setWorkflows)
      .catch((err) => {
        setWorkflows((w) => w ?? [])
        fail(err)
      })
  useEffect(() => {
    reload()
    listTemplates().then(setTemplates).catch(() => {})
  }, [])
  useEffect(() => setPage(0), [tab, search, methodFilter, perPage])

  const rows = useMemo(() => {
    if (!workflows) return []
    const q = search.trim().toLowerCase()
    const sorters = {
      name: (a, b) => a.name.localeCompare(b.name),
      createdAt: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
      type: (a, b) => a.type.localeCompare(b.type),
    }
    return workflows
      .filter((w) => w.status === tab)
      .filter((w) => !q || w.id.toLowerCase().includes(q) || w.name.toLowerCase().includes(q))
      .filter((w) => methodFilter === 'all' || w.basic.signingMethod === methodFilter)
      .sort((a, b) => sorters[sort.key](a, b) * sort.dir)
  }, [workflows, tab, search, methodFilter, sort])

  const paged = rows.slice(page * perPage, page * perPage + perPage)
  const toggleSort = (key) => setSort((s) => ({ key, dir: s.key === key ? -s.dir : 1 }))

  const handleImport = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const json = JSON.parse(await file.text())
      await importWorkflow(json)
      toast('Workflow imported to Saved Drafts')
      setTab('draft')
      reload()
    } catch (err) {
      toast(err instanceof SyntaxError ? 'That file is not valid JSON' : err.message, 'error')
    }
  }

  const changeStatus = (w, status, message) =>
    setWorkflowStatus(w.id, status)
      .then(() => {
        toast(message)
        reload()
      })
      .catch(fail)

  const removeDraft = (w) => {
    if (!window.confirm(`Delete draft "${w.name}"?`)) return
    deleteWorkflow(w.id)
      .then(() => {
        toast('Draft deleted')
        reload()
      })
      .catch(fail)
  }

  return (
    <div className="page">
      <PageTitle title="Workflow" crumbs={['Dashboard', 'Workflow']}>
        <button className="btn" onClick={() => importRef.current?.click()}>
          <Icon name="import" size={16} /> Import Workflow
        </button>
        <input ref={importRef} type="file" accept="application/json,.json" hidden onChange={handleImport} />
        <div className="menu-wrap">
          <button className="btn primary" onClick={() => setShowNewMenu((s) => !s)}>
            <Icon name="plus" size={16} /> New Workflow
          </button>
          {showNewMenu && (
            <div className="menu" onMouseLeave={() => setShowNewMenu(false)}>
              <button onClick={() => navigate('/workflows/new')}>
                From PDF <Icon name="info" size={14} title="Upload a PDF and configure the workflow from scratch" />
              </button>
              <button
                onClick={() => {
                  setShowNewMenu(false)
                  setShowTemplates(true)
                }}
              >
                From Template <Icon name="info" size={14} />
              </button>
            </div>
          )}
        </div>
      </PageTitle>

      <div className="tabs">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'templates' ? (
        <TemplateTable templates={templates} onUse={(tpl) => navigate('/workflows/new', { state: { templateId: tpl.id } })} />
      ) : (
        <>
          <div className="search-row">
            <div className="search-box">
              <Icon name="search" size={16} />
              <input placeholder="Search for Workflow ID, Workflow Name" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="menu-wrap">
              <button className={`icon-btn ${methodFilter !== 'all' ? 'active' : ''}`} onClick={() => setShowFilter((s) => !s)} aria-label="Filter">
                <Icon name="filter" />
              </button>
              {showFilter && (
                <div className="menu filter-menu" onMouseLeave={() => setShowFilter(false)}>
                  <p className="menu-title">Method of signing</p>
                  {['all', 'sequential', 'parallel'].map((m) => (
                    <label key={m} className="radio">
                      <input type="radio" checked={methodFilter === m} onChange={() => setMethodFilter(m)} />
                      {m === 'all' ? 'All' : m[0].toUpperCase() + m.slice(1)}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Workflow ID</th>
                    <SortTh label="Workflow Name" k="name" sort={sort} onSort={toggleSort} />
                    <SortTh label="Created At" k="createdAt" sort={sort} onSort={toggleSort} />
                    <SortTh label="Type" k="type" sort={sort} onSort={toggleSort} />
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {!workflows &&
                    [1, 2, 3].map((i) => (
                      <tr key={i} className="skeleton-row">
                        {Array.from({ length: 5 }, (_, j) => (
                          <td key={j}>
                            <span className="skeleton" />
                          </td>
                        ))}
                      </tr>
                    ))}
                  {paged.map((w) => (
                    <tr key={w.id}>
                      <td className="nowrap">
                        <Link to={`/workflows/${w.id}`} className="id-link">
                          {w.id}
                        </Link>
                        <CopyButton text={w.id} onCopied={() => toast('Workflow ID copied')} />
                      </td>
                      <td>{w.name}</td>
                      <td className="nowrap">{formatDateTime(w.createdAt)}</td>
                      <td>{w.type}</td>
                      <td className="nowrap actions">
                        {tab === 'active' && (
                          <>
                            <button className="link-btn" onClick={() => setInitiating(w)}>
                              Initiate <Icon name="external" size={14} />
                            </button>
                            <button className="link-btn muted-link" onClick={() => changeStatus(w, 'inactive', 'Workflow deactivated')}>
                              Deactivate
                            </button>
                          </>
                        )}
                        {tab === 'inactive' && (
                          <button className="link-btn" onClick={() => changeStatus(w, 'active', 'Workflow activated')}>
                            Activate
                          </button>
                        )}
                        {tab === 'draft' && (
                          <>
                            <button className="link-btn" onClick={() => navigate(`/workflows/new?draft=${w.id}`)}>
                              Continue <Icon name="edit" size={14} />
                            </button>
                            <button className="icon-btn danger" onClick={() => removeDraft(w)} aria-label="Delete draft">
                              <Icon name="trash" size={16} />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {workflows && rows.length === 0 && <EmptyState title={EMPTY_TEXT[tab][0]} message={EMPTY_TEXT[tab][1]} />}
            {rows.length > 0 && (
              <div className="pagination">
                Rows per page:
                <select value={perPage} onChange={(e) => setPerPage(Number(e.target.value))}>
                  {[5, 10, 25].map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
                <span>
                  {page * perPage + 1}-{Math.min(rows.length, (page + 1) * perPage)} of {rows.length}
                </span>
                <button className="icon-btn" disabled={page === 0} onClick={() => setPage(page - 1)} aria-label="Previous page">
                  <Icon name="chevronLeft" size={16} />
                </button>
                <button className="icon-btn" disabled={(page + 1) * perPage >= rows.length} onClick={() => setPage(page + 1)} aria-label="Next page">
                  <Icon name="chevronRight" size={16} />
                </button>
              </div>
            )}
          </div>
        </>
      )}

      <Modal open={showTemplates} onClose={() => setShowTemplates(false)} title="Start from a template" subtitle="Signers and signing options are pre-filled. You'll upload the PDF in the first step." width={620}>
        <div className="template-grid">
          {templates.map((tpl) => (
            <button key={tpl.id} className="template-card" onClick={() => navigate('/workflows/new', { state: { templateId: tpl.id } })}>
              <Icon name="template" size={22} />
              <strong>{tpl.name}</strong>
              <span className="muted small">{templateSummary(tpl)}</span>
            </button>
          ))}
          <button className="template-card dashed" onClick={() => navigate('/templates/new')}>
            <Icon name="plus" size={22} />
            <strong>New template</strong>
            <span className="muted small">Set up a reusable template</span>
          </button>
        </div>
      </Modal>

      <InitiateModal workflow={initiating} onClose={() => setInitiating(null)} />
    </div>
  )
}

function TemplateTable({ templates, onUse }) {
  return (
    <div className="card">
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Template</th>
              <th>Description</th>
              <th>Participants</th>
              <th>Method</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {templates.map((t) => (
              <tr key={t.id}>
                <td className="strong">{t.name}</td>
                <td>{t.description}</td>
                <td className="nowrap">{templateSummary(t)}</td>
                <td className="cap">{t.signingMethod}</td>
                <td>
                  <button className="link-btn" onClick={() => onUse(t)}>
                    Use template <Icon name="arrowRight" size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
