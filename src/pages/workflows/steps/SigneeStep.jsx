import { useMemo, useState } from 'react'
import PdfViewer from '../../../components/PdfViewer'
import {
  BOX_COLORS,
  PARTICIPANT_KINDS,
  methodLabels,
  methodShorts,
  participantComplete,
} from '../../../constants/workflow'
import { shortId } from '../../../utils/format'
import Icon from '../../../components/ui/Icon'
import { Pills } from '../../../components/ui/Controls'
import SignatureOptionsModal from './SignatureOptionsModal'
import CopyToPagesModal from './CopyToPagesModal'

const KIND_ORDER = ['signer', 'reviewer', 'auto']

export function useOwnerInfo(participants) {
  return useMemo(
    () => Object.fromEntries(participants.map((p, i) => [p.id, { label: p.name, color: BOX_COLORS[i % BOX_COLORS.length] }])),
    [participants],
  )
}

export default function SigneeStep({ draft, setDraft, file, numPages, onPagesLoaded, editing, setEditing }) {
  const [tab, setTab] = useState('signer')
  const [activeId, setActiveId] = useState(null)
  const [phase, setPhase] = useState('details') // 'details' | 'coordinates'
  const [optionsFor, setOptionsFor] = useState(null)
  const [copyingBox, setCopyingBox] = useState(null)
  const [copyFrom, setCopyFrom] = useState(null)

  const { participants, boxes } = draft
  const ownerInfo = useOwnerInfo(participants)
  const ofKind = (k) => participants.filter((p) => p.kind === k)
  const isDone = (p) => participantComplete(p, boxes)
  const active = participants.find((p) => p.id === activeId)
  const kindDef = PARTICIPANT_KINDS[tab]
  const tabList = ofKind(tab)

  const setParticipants = (fn) => setDraft((d) => ({ ...d, participants: fn(d.participants) }))
  const setBoxes = (fn) => setDraft((d) => ({ ...d, boxes: fn(d.boxes) }))
  const patchParticipant = (id, patch) => setParticipants((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)))

  const addParticipant = (kind) => {
    const def = PARTICIPANT_KINDS[kind]
    const used = new Set(participants.map((p) => p.name))
    let n = ofKind(kind).length + 1
    while (used.has(`${def.label} ${n}`)) n++
    const p = {
      id: shortId(),
      kind,
      name: `${def.label} ${n}`,
      signatureType: 'individual',
      exposure: 'sequential',
      methods: [],
      preMethods: [],
      postMethods: [],
      autoSource: kind === 'auto' ? 'seal' : undefined,
    }
    setParticipants((ps) => [...ps, p])
    setActiveId(p.id)
    setPhase('details')
  }

  const removeParticipant = (id) => {
    const p = participants.find((x) => x.id === id)
    if (!window.confirm(`Remove ${p.name}? Their signature boxes will be deleted too.`)) return
    setParticipants((ps) => ps.filter((x) => x.id !== id))
    setBoxes((bs) => bs.filter((b) => b.owner !== id))
    if (activeId === id) {
      setActiveId(null)
      setPhase('details')
    }
  }

  const moveParticipant = (id, dir) =>
    setParticipants((ps) => {
      const kind = ps.find((p) => p.id === id).kind
      const same = ps.map((p, i) => [p, i]).filter(([p]) => p.kind === kind)
      const pos = same.findIndex(([p]) => p.id === id)
      const other = same[pos + dir]
      if (!other) return ps
      const next = [...ps]
      const i = same[pos][1]
      ;[next[i], next[other[1]]] = [next[other[1]], next[i]]
      return next
    })

  const copyConfig = (fromId, toId) => {
    const src = participants.find((p) => p.id === fromId)
    patchParticipant(toId, {
      methods: src.methods,
      signatureType: src.signatureType,
      exposure: src.exposure,
      preMethods: src.preMethods,
      postMethods: src.postMethods,
      copiedFrom: src.name,
    })
  }

  const openEditor = (kind = 'signer', id) => {
    setEditing(true)
    setTab(kind)
    setPhase('details')
    const list = ofKind(kind)
    if (id) setActiveId(id)
    else if (list.length === 0 && kind === 'signer') addParticipant(kind)
    else setActiveId((list.find((p) => !isDone(p)) ?? list[0])?.id ?? null)
  }

  const exitEditor = () => {
    setEditing(false)
    setActiveId(null)
    setPhase('details')
  }

  const switchTab = (kind) => {
    setTab(kind)
    setPhase('details')
    const list = ofKind(kind)
    setActiveId((list.find((p) => !isDone(p)) ?? list[0])?.id ?? null)
  }

  const tabComplete = (kind) => {
    const list = ofKind(kind)
    return (kind !== 'signer' || list.length > 0) && list.every(isDone)
  }

  const completeTab = () => {
    const next = KIND_ORDER[KIND_ORDER.indexOf(tab) + 1]
    if (next) switchTab(next)
    else exitEditor()
  }

  // ---------- Overview (before / after editing) ----------
  if (!editing) {
    const allDone = participants.length > 0 && participants.every(isDone) && ofKind('signer').length > 0
    return (
      <div className="split">
        <PdfViewer file={file} boxes={boxes} ownerInfo={ownerInfo} onLoaded={onPagesLoaded} />
        <div className="side-panel">
          {participants.length === 0 ? (
            <button className="card add-signees" onClick={() => openEditor('signer')}>
              <span className="add-circle">
                <Icon name="plus" size={26} />
              </span>
              <strong>Add Signee &amp; Reviewers</strong>
              <span className="muted small">Multiple signees can sign the contract on behalf of the same party</span>
            </button>
          ) : (
            <div className="card pad">
              <div className="row-between">
                <h4>Workflow Configured</h4>
                <span className={`status-chip ${allDone ? 'ok' : ''}`}>
                  <Icon name={allDone ? 'checkCircle' : 'clock'} size={14} />
                  {allDone ? 'Complete' : 'Incomplete'}
                </span>
              </div>
              <p className="muted small">
                {participants.length} participant{participants.length === 1 ? '' : 's'} configured
              </p>
              {KIND_ORDER.filter((k) => ofKind(k).length > 0).map((k) => {
                const list = ofKind(k)
                return (
                  <div key={k} className="group-card">
                    <div className="group-head">
                      <span className="group-icon">
                        <Icon name="user" size={16} />
                      </span>
                      <div>
                        <strong>
                          {PARTICIPANT_KINDS[k].plural} <span className="count-badge">{list.length}</span>
                        </strong>
                        <span className="muted small">
                          {list.filter(isDone).length} / {list.length} Completed
                        </span>
                      </div>
                    </div>
                    <ul className="group-list">
                      {list.map((p) => (
                        <li key={p.id}>
                          <button className="link-plain" onClick={() => openEditor(k, p.id)}>
                            <Icon name={isDone(p) ? 'checkCircle' : 'xCircle'} size={15} className={isDone(p) ? 'ok' : 'pending'} />
                            {p.name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })}
              {!allDone && <p className="muted small center">Some participants need configuration.</p>}
              <button className="btn soft block" onClick={() => openEditor('signer')}>
                <Icon name="eye" size={16} /> View &amp; Edit Workflow
              </button>
              <div className="row-between total-row">
                <span>Total Participants</span>
                <strong>{participants.length}</strong>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ---------- Editor ----------
  const activeIndex = tabList.findIndex((p) => p.id === activeId)
  const activeBoxes = active ? boxes.filter((b) => b.owner === active.id) : []
  const previousConfigured = tabList.filter((p) => p.id !== activeId && p.methods.length > 0)
  const copySource = previousConfigured.some((p) => p.id === copyFrom) ? copyFrom : previousConfigured[0]?.id

  return (
    <div className="signee-editor">
      <div className="kind-tabs">
        {KIND_ORDER.map((k) => {
          const n = ofKind(k).length
          return (
            <button key={k} className={tab === k ? 'on' : ''} onClick={() => switchTab(k)}>
              {PARTICIPANT_KINDS[k].plural} ({n})
              {n > 0 && (tabComplete(k) ? <Icon name="check" size={14} className="ok" /> : <span className="dot warn" />)}
            </button>
          )
        })}
      </div>

      <div className="status-strip">
        {KIND_ORDER.map((k) => (
          <span key={k} className={k === tab ? 'strong' : ''}>
            {k === tab && <span className={`dot ${tabComplete(k) ? 'ok' : 'warn'}`} />}
            {PARTICIPANT_KINDS[k].plural} <span className="muted">({ofKind(k).length})</span>
            {k === tab && <span className={`badge ${tabComplete(k) ? 'green' : 'yellow'}`}>{tabComplete(k) ? 'Completed' : 'In Progress'}</span>}
          </span>
        ))}
        <button className="btn primary sm" disabled={!tabComplete(tab)} onClick={completeTab}>
          Complete {kindDef.plural} Configuration <Icon name="arrowRight" size={14} />
        </button>
      </div>

      <div className="split">
        <PdfViewer
          file={file}
          boxes={boxes}
          ownerInfo={ownerInfo}
          onLoaded={onPagesLoaded}
          editableOwner={phase === 'coordinates' && active ? active.id : null}
          onAddBox={(rect) => setBoxes((bs) => [...bs, { id: shortId(), owner: active.id, ...rect }])}
          onUpdateBox={(id, patch) => setBoxes((bs) => bs.map((b) => (b.id === id ? { ...b, ...patch } : b)))}
          onDeleteBox={(id) => setBoxes((bs) => bs.filter((b) => b.id !== id))}
          onCopyBox={setCopyingBox}
        />

        <div className="side-panel card pad">
          {phase === 'coordinates' && active ? (
            <>
              <div className="row-between">
                <h4>Step 2: Place {active.name}</h4>
                <span className="muted small">
                  {kindDef.label} {activeIndex + 1} of {tabList.length}
                </span>
              </div>
              {active.kind === 'signer' && (
                <p className="sig-line">
                  Signature: <strong>{methodShorts(active.methods).join(', ')}</strong>
                </p>
              )}
              <p className="muted small">
                Place signature coordinates on the document canvas (left panel). Click to drop a box, or click and drag to draw one where this{' '}
                {kindDef.label.toLowerCase()} should sign. Drag a box to move it; use its corner to resize.
              </p>
              <p className="placed">
                <Icon name="mapPin" size={15} /> {activeBoxes.length} signature box{activeBoxes.length === 1 ? '' : 'es'} placed
              </p>
              <button className="btn primary block" disabled={!activeBoxes.length} onClick={() => addParticipant(tab)}>
                Save {kindDef.label} &amp; Add Next
              </button>
              <button className="btn soft block" disabled={!activeBoxes.length} onClick={() => setPhase('details')}>
                Save {kindDef.label}
              </button>
              <button className="btn ghost block" onClick={() => setPhase('details')}>
                Back to Details
              </button>
            </>
          ) : (
            <>
              <div className="row-between">
                <h4>Step 1: {kindDef.plural}</h4>
                {active && (
                  <span className="muted small">
                    {kindDef.label} {activeIndex + 1} of {tabList.length}
                  </span>
                )}
              </div>

              {tabList.length > 0 && <p className="mini-label">All {kindDef.plural} ({tabList.length})</p>}
              {tabList.map((p, i) => (
                <div key={p.id} className={`participant-card ${p.id === activeId ? 'editing' : ''}`}>
                  <span className="p-num">{i + 1}</span>
                  <div className="p-main">
                    <div className="row-between">
                      <strong>
                        {p.name} {p.id === activeId && <span className="badge solid">EDITING</span>}
                      </strong>
                      <span className="chip">{kindDef.label}</span>
                    </div>
                    {p.kind === 'signer' && (
                      <span className="muted small">{p.methods.length ? methodShorts(p.methods).join(', ') : 'No signatures selected'}</span>
                    )}
                    {kindDef.needsBoxes && (
                      <span className="muted small">
                        <Icon name="mapPin" size={12} /> {boxes.filter((b) => b.owner === p.id).length} signature boxes placed
                      </span>
                    )}
                    <div className="p-actions">
                      <button className="btn xs" disabled={p.id === activeId} onClick={() => setActiveId(p.id)}>
                        <Icon name="edit" size={13} /> {p.id === activeId ? 'Editing' : 'Edit'}
                      </button>
                      <button className="icon-btn tiny" disabled={i === 0} onClick={() => moveParticipant(p.id, -1)} aria-label="Move up">
                        <Icon name="arrowUp" size={14} />
                      </button>
                      <button className="icon-btn tiny" disabled={i === tabList.length - 1} onClick={() => moveParticipant(p.id, 1)} aria-label="Move down">
                        <Icon name="arrowDown" size={14} />
                      </button>
                      <button className="icon-btn tiny danger push" onClick={() => removeParticipant(p.id)} aria-label="Remove">
                        <Icon name="trash" size={14} />
                      </button>
                    </div>
                  </div>
                  <Icon name={isDone(p) ? 'checkCircle' : 'clock'} size={16} className={`p-status ${isDone(p) ? 'ok' : 'pending'}`} />
                </div>
              ))}

              <button className="dashed-btn" onClick={() => addParticipant(tab)}>
                <Icon name="plus" size={14} /> Add {tabList.length ? 'Another ' : ''}
                {kindDef.label}
              </button>

              {active && (
                <div className="current-config">
                  <p className="mini-label">Current {kindDef.label} Configuration</p>
                  <div className="config-card">
                    <label className="field">
                      <span className="field-label">{kindDef.label} label</span>
                      <input value={active.name} onChange={(e) => patchParticipant(active.id, { name: e.target.value })} />
                    </label>

                    {active.kind === 'signer' && (
                      <>
                        <p className="config-title">
                          Signature &amp; Verification<span className="req">*</span>
                        </p>
                        {active.methods.length === 0 ? (
                          <button className="btn outline block" onClick={() => setOptionsFor(active.id)}>
                            Configure Signature &amp; Verification
                          </button>
                        ) : (
                          <div className="config-summary">
                            <div>
                              <span>{methodLabels(active.methods).join(', ')}</span>
                              {active.copiedFrom && <span className="copied">Copied from {active.copiedFrom}</span>}
                            </div>
                            <button className="btn xs" onClick={() => setOptionsFor(active.id)}>
                              Edit
                            </button>
                          </div>
                        )}
                        {active.methods.length === 0 && previousConfigured.length > 0 && (
                          <div className="copy-config">
                            <span className="muted small">or copy from</span>
                            <select value={copySource} onChange={(e) => setCopyFrom(e.target.value)}>
                              {previousConfigured.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                            <button className="btn xs" onClick={() => copyConfig(copySource, active.id)}>
                              Copy Configuration
                            </button>
                          </div>
                        )}
                      </>
                    )}

                    {active.kind === 'reviewer' && (
                      <p className="muted small">Reviewers can view the document and approve or reject it before it goes to signers. No signature box is needed.</p>
                    )}

                    {active.kind === 'auto' && (
                      <>
                        <p className="config-title">Signature source</p>
                        <Pills
                          options={[
                            { value: 'seal', label: 'Organisation Seal' },
                            { value: 'signatory', label: 'Authorised Signatory' },
                          ]}
                          value={active.autoSource}
                          onChange={(v) => v && patchParticipant(active.id, { autoSource: v })}
                        />
                      </>
                    )}
                  </div>
                </div>
              )}

              {active && kindDef.needsBoxes && (
                <button
                  className="btn primary block"
                  disabled={kindDef.needsMethods && active.methods.length === 0}
                  onClick={() => setPhase('coordinates')}
                >
                  Continue to Add Coordinates
                </button>
              )}
              <button className="btn soft block" onClick={exitEditor}>
                Save &amp; Exit
              </button>
            </>
          )}
        </div>
      </div>

      <SignatureOptionsModal
        participant={participants.find((p) => p.id === optionsFor)}
        onClose={() => setOptionsFor(null)}
        onSave={(patch) => {
          patchParticipant(optionsFor, { ...patch, copiedFrom: undefined })
          setOptionsFor(null)
        }}
      />

      <CopyToPagesModal
        box={copyingBox}
        numPages={numPages}
        onClose={() => setCopyingBox(null)}
        onCopy={(pages) => {
          const b = copyingBox
          setBoxes((bs) => [...bs, ...pages.filter((pg) => pg !== b.page).map((page) => ({ ...b, id: shortId(), page }))])
          setCopyingBox(null)
        }}
      />
    </div>
  )
}
