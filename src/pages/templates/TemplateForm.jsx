import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { emptyTemplate, getTemplate, saveTemplate } from '../../services/templateService'
import { EXPIRY_UNITS, PARTICIPANT_KINDS, SIGNATURE_METHODS, STAMPING_METHODS } from '../../constants/workflow'
import { shortId } from '../../utils/format'
import DocEditor from '../../components/editor/DocEditor'
import { DEFAULT_PAGE_SETUP } from '../../components/editor/pageSetup'
import Icon from '../../components/ui/Icon'
import MethodIcon from '../../components/signing/MethodIcon'
import { EmptyState, Field, Pills } from '../../components/ui/Controls'
import { useToast } from '../../components/ui/Toast'
import { templateSummary } from './TemplateList'

const BASE_FIELDS = ['Contract Name', 'Contract ID', "Today's Date", 'Executor Name', 'Expiry Date']

function problems(t) {
  const list = []
  if (!t.name.trim()) list.push('Template name is required')
  if (!(Number(t.expiryValue) > 0)) list.push('Expiry must be at least 1')
  if (!t.participants.some((p) => p.kind === 'signer')) list.push('Add at least one signer')
  if (t.participants.some((p) => !p.name.trim())) list.push('Every participant needs a label')
  if (t.participants.some((p) => p.kind === 'signer' && !p.methods.length)) list.push('Pick a signature method for every signer')
  return list
}

export default function TemplateForm() {
  const { id } = useParams()
  const isNew = !id
  const location = useLocation()
  const navigate = useNavigate()
  const toast = useToast()
  const [tpl, setTpl] = useState(() => (isNew ? { ...emptyTemplate(location.state?.starter), ...location.state?.imported } : null))
  const [view, setView] = useState('document')
  const [notFound, setNotFound] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (isNew) return
    getTemplate(id)
      .then((t) => (t ? setTpl(t) : setNotFound(true)))
      .catch((err) => {
        setNotFound(true)
        toast(err.message, 'error')
      })
  }, [id])

  const fields = useMemo(() => {
    if (!tpl) return BASE_FIELDS
    const people = tpl.participants.filter((p) => p.kind === 'signer').flatMap((p) => [`${p.name} Name`, `${p.name} Email`])
    return [...BASE_FIELDS, ...people]
  }, [tpl?.participants])

  if (notFound)
    return (
      <div className="page">
        <EmptyState title="Template not found" message="It may have been deleted." />
      </div>
    )
  if (!tpl) return <div className="page loading-text">Loading template…</div>

  const set = (patch) => {
    setTpl((t) => ({ ...t, ...patch }))
    setDirty(true)
  }
  // patch may be an object or a function of the current participant (safe for rapid updates)
  const setPerson = (pid, patch) => {
    setTpl((t) => ({
      ...t,
      participants: t.participants.map((p) => (p.id === pid ? { ...p, ...(typeof patch === 'function' ? patch(p) : patch) } : p)),
    }))
    setDirty(true)
  }
  const errors = problems(tpl)
  const parties = tpl.participants.filter((p) => p.kind !== 'reviewer').map((p) => p.name)

  const addPerson = (kind) => {
    const n = tpl.participants.filter((p) => p.kind === kind).length + 1
    set({
      participants: [...tpl.participants, { id: shortId(), kind, name: `${PARTICIPANT_KINDS[kind].label} ${n}`, methods: [], signatureType: 'individual' }],
    })
  }

  const move = (index, dir) => {
    const next = [...tpl.participants]
    ;[next[index], next[index + dir]] = [next[index + dir], next[index]]
    set({ participants: next })
  }

  const toggleMethod = (p, m) =>
    setPerson(p.id, (cur) => ({ methods: cur.methods.includes(m) ? cur.methods.filter((x) => x !== m) : [...cur.methods, m] }))

  const save = async (andUse) => {
    setSubmitted(true)
    if (errors.length) {
      setView('setup')
      toast(errors[0], 'error')
      return
    }
    setSaving(true)
    let saved
    try {
      saved = await saveTemplate(tpl)
    } catch (err) {
      toast(err.message, 'error')
      return
    } finally {
      setSaving(false)
    }
    setDirty(false)
    toast(isNew ? 'Template created' : 'Template saved')
    if (andUse) navigate('/workflows/new', { state: { templateId: saved.id } })
    else if (isNew) navigate(`/templates/${saved.id}`, { replace: true })
    else setTpl(saved)
  }

  const leave = () => {
    if (!dirty || window.confirm('Leave without saving? Your changes will be lost.')) navigate('/templates')
  }

  return (
    <div className="page template-page">
      <div className="doc-titlebar card">
        <button className="icon-btn" onClick={leave} aria-label="Back to templates">
          <Icon name="arrowLeft" />
        </button>
        <span className="doc-file-icon">
          <Icon name="file" size={20} />
        </span>
        <div className="doc-title">
          <input value={tpl.name} placeholder="Untitled template" onChange={(e) => set({ name: e.target.value })} aria-label="Template name" />
          <span className="muted small">{dirty ? 'Unsaved changes' : isNew ? 'New template' : 'All changes saved'}</span>
        </div>
        <div className="view-switch">
          <button className={view === 'document' ? 'on' : ''} onClick={() => setView('document')}>
            <Icon name="file" size={15} /> Document
          </button>
          <button className={view === 'setup' ? 'on' : ''} onClick={() => setView('setup')}>
            <Icon name="user" size={15} /> Signing Setup
            {submitted && errors.length > 0 && <span className="dot warn" />}
          </button>
        </div>
        <div className="doc-title-actions">
          <button className="btn soft" onClick={() => save(true)} disabled={saving}>
            Save &amp; Use
          </button>
          <button className="btn primary" onClick={() => save(false)} disabled={saving}>
            <Icon name="save" size={16} /> {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      <div hidden={view !== 'document'}>
        <DocEditor
          content={tpl.content}
          onChange={(html) => set({ content: html })}
          pageSetup={tpl.pageSetup ?? DEFAULT_PAGE_SETUP}
          onPageSetupChange={(pageSetup) => set({ pageSetup })}
          fields={fields}
          parties={parties}
        />
      </div>

      {view === 'setup' && (
        <div className="split template-split">
          <div className="stack">
            <section className="card pad form-card">
              <h3 className="form-heading">Template Details</h3>
              <Field
                label="Template Name"
                required
                value={tpl.name}
                placeholder="e.g. Home Loan Agreement"
                error={submitted && !tpl.name.trim() ? 'Template name is required' : ''}
                onChange={(e) => set({ name: e.target.value })}
              />
              <Field
                label="Description"
                as="textarea"
                rows={2}
                placeholder="When should this template be used?"
                value={tpl.description}
                onChange={(e) => set({ description: e.target.value })}
              />
            </section>

            <section className="card pad form-card">
              <h3 className="form-heading">Signing Settings</h3>
              <h4 className="sub-heading">Method of Signing</h4>
              <Pills
                options={[
                  { value: 'sequential', label: 'Sequential Signing' },
                  { value: 'parallel', label: 'Parallel Signing' },
                ]}
                value={tpl.signingMethod}
                onChange={(v) => v && set({ signingMethod: v })}
              />
              <div className="grid-expiry top-gap">
                <Field label="Contract Expiry" required type="number" min="1" value={tpl.expiryValue} onChange={(e) => set({ expiryValue: e.target.value })} />
                <Field label="Unit">
                  <select value={tpl.expiryUnit} onChange={(e) => set({ expiryUnit: e.target.value })}>
                    {EXPIRY_UNITS.map((u) => (
                      <option key={u.value} value={u.value}>
                        {u.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <h4 className="sub-heading">Method of Stamping</h4>
              <Pills options={STAMPING_METHODS} value={tpl.stampingMethod} onChange={(v) => set({ stampingMethod: v })} />
            </section>

            <section className="card pad form-card">
              <div className="row-between">
                <h3 className="form-heading">Participants</h3>
                <span className="muted small">{tpl.signingMethod === 'sequential' ? 'Signed in this order' : 'All sign at the same time'}</span>
              </div>

              {tpl.participants.map((p, i) => (
                <div key={p.id} className={`tpl-person ${submitted && p.kind === 'signer' && !p.methods.length ? 'has-error' : ''}`}>
                  <div className="tpl-person-head">
                    <span className="p-num">{i + 1}</span>
                    <input className="tpl-person-name" value={p.name} aria-label="Participant label" onChange={(e) => setPerson(p.id, { name: e.target.value })} />
                    <select value={p.kind} onChange={(e) => setPerson(p.id, { kind: e.target.value })} aria-label="Participant type">
                      {Object.entries(PARTICIPANT_KINDS).map(([k, def]) => (
                        <option key={k} value={k}>
                          {def.label}
                        </option>
                      ))}
                    </select>
                    <button className="icon-btn tiny" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">
                      <Icon name="arrowUp" size={15} />
                    </button>
                    <button className="icon-btn tiny" disabled={i === tpl.participants.length - 1} onClick={() => move(i, 1)} aria-label="Move down">
                      <Icon name="arrowDown" size={15} />
                    </button>
                    <button className="icon-btn tiny danger" onClick={() => set({ participants: tpl.participants.filter((x) => x.id !== p.id) })} aria-label="Remove participant">
                      <Icon name="trash" size={15} />
                    </button>
                  </div>

                  {p.kind === 'signer' && (
                    <>
                      <div className="tpl-person-row">
                        <span className="mini-label">Signature type</span>
                        <div className="seg small-seg">
                          {[
                            ['individual', 'Individual'],
                            ['organization', 'Organization'],
                          ].map(([v, l]) => (
                            <button key={v} className={p.signatureType === v ? 'on' : ''} onClick={() => setPerson(p.id, { signatureType: v })}>
                              {l}
                            </button>
                          ))}
                        </div>
                      </div>
                      <span className="mini-label">Signature methods {p.methods.length > 1 && '(tried in this order)'}</span>
                      <div className="method-grid compact">
                        {SIGNATURE_METHODS.map((m) => {
                          const idx = p.methods.indexOf(m.id)
                          return (
                            <button key={m.id} className={`method-tile ${idx >= 0 ? 'on' : ''}`} onClick={() => toggleMethod(p, m.id)}>
                              {idx >= 0 && <span className="order">{idx + 1}</span>}
                              <MethodIcon method={m.id} size={26} />
                              <span>{m.label}</span>
                            </button>
                          )
                        })}
                      </div>
                      {submitted && !p.methods.length && <span className="field-error">Pick at least one signature method</span>}
                    </>
                  )}
                  {p.kind === 'reviewer' && <p className="muted small">Reviews and approves the document before signers receive it.</p>}
                  {p.kind === 'auto' && <p className="muted small">Organisation seal or authorised signatory applied automatically.</p>}
                </div>
              ))}

              <div className="tpl-add-row">
                {Object.entries(PARTICIPANT_KINDS).map(([k, def]) => (
                  <button key={k} className="dashed-btn" onClick={() => addPerson(k)}>
                    <Icon name="plus" size={14} /> {def.label}
                  </button>
                ))}
              </div>
            </section>
          </div>

          <aside className="side-panel card pad tpl-preview">
            <p className="mini-label">Summary</p>
            <h3>{tpl.name || 'Untitled template'}</h3>
            {tpl.description && <p className="muted small">{tpl.description}</p>}
            <div className="tpl-tags">
              <span className="chip">{templateSummary(tpl)}</span>
              <span className="chip">{tpl.signingMethod === 'parallel' ? 'Parallel' : 'Sequential'}</span>
              {tpl.stampingMethod && <span className="chip">{tpl.stampingMethod}</span>}
            </div>
            {submitted && errors.length > 0 && (
              <ul className="tpl-errors">
                {errors.map((e) => (
                  <li key={e}>
                    <Icon name="alert" size={14} /> {e}
                  </li>
                ))}
              </ul>
            )}
            <p className="muted small">
              Participant names here appear in the Document tab under Insert → Field and Insert → Signature.
            </p>
          </aside>
        </div>
      )}
    </div>
  )
}
