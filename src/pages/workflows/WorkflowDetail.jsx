import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getWorkflow, getWorkflowFile } from '../../services/workflowService'
import { exportJson } from '../../services/downloadService'
import {
  DEFAULT_SIGNATORY_LABELS,
  EXPIRY_UNITS,
  PARTICIPANT_KINDS,
  methodLabels,
} from '../../constants/workflow'
import { formatDateTime } from '../../utils/format'
import Icon from '../../components/ui/Icon'
import { CopyButton, EmptyState, PageTitle } from '../../components/ui/Controls'
import { Drawer, Modal } from '../../components/ui/Overlay'
import { useToast } from '../../components/ui/Toast'

// What the workflow looks like to the backend, without UI-only fields.
const toPayload = ({ versions, hasFile, ...w }) => w

export default function WorkflowDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [workflow, setWorkflow] = useState(undefined)
  const [panel, setPanel] = useState(null) // 'signees' | 'payload' | 'versions'
  const [openSigner, setOpenSigner] = useState(null)

  useEffect(() => {
    getWorkflow(id)
      .then(setWorkflow)
      .catch((err) => {
        setWorkflow(null)
        toast(err.message, 'error')
      })
  }, [id])

  if (workflow === undefined) return <div className="page loading-text">Loading…</div>
  if (!workflow)
    return (
      <div className="page">
        <EmptyState title="Workflow not found" message="It may have been deleted." />
        <Link to="/workflows" className="center-link">
          Back to workflows
        </Link>
      </div>
    )

  const { basic } = workflow
  const unitLabel = EXPIRY_UNITS.find((u) => u.value === basic.expiryUnit)?.label ?? basic.expiryUnit

  const viewPdf = async () => {
    const blob = await getWorkflowFile(workflow.id).catch((err) => toast(err.message, 'error'))
    if (blob === undefined) return
    if (!blob) return toast('No PDF stored for this workflow', 'error')
    window.open(URL.createObjectURL(blob), '_blank', 'noopener')
  }

  const signatoryOptions = Object.entries(DEFAULT_SIGNATORY_LABELS)

  return (
    <div className="page">
      <PageTitle title={`Workflow ID ( ${workflow.id} )`} crumbs={['Dashboard', 'Workflow', `Workflow ID : ${workflow.id}`]} />

      <div className="detail-toolbar">
        <button className="icon-btn" onClick={() => navigate('/workflows')} aria-label="Back">
          <Icon name="arrowLeft" />
        </button>
        <button className="btn primary" onClick={() => navigate('/workflows/new')}>
          <Icon name="plus" size={16} /> New Workflow
        </button>
      </div>

      <div className="detail-grid">
        <div className="detail-main">
          <section className="card pad">
            <h3>Basic Contract Settings</h3>
            <dl className="kv-grid">
              <KV label="Contract Executor Name" value={basic.executorName} />
              <KV label="Contract Expiry" value={`${basic.expiryValue} ${unitLabel.toLowerCase()}`} />
              <KV label="Contract Name" value={basic.contractName} />
              <KV label="Method of Signing" value={basic.signingMethod === 'parallel' ? 'Parallel' : 'Sequential'} />
              <KV label="Location Capture" value={basic.locationCapture.join(', ')} />
              <KV label="Method of Stamping" value={basic.stampingMethod} />
            </dl>
          </section>

          <section className="card pad">
            <h3>Default Signatory Options</h3>
            <div className="flag-grid">
              {signatoryOptions.map(([key, label]) => (
                <span key={key} className="flag">
                  {label}
                  <Icon name={basic[key] ? 'checkCircle' : 'xCircle'} size={16} className={basic[key] ? 'ok' : 'no'} />
                </span>
              ))}
            </div>
          </section>

          <section className="card pad">
            <h3>Signee Info</h3>
            <dl className="kv-grid">
              {Object.entries(PARTICIPANT_KINDS).map(([kind, def]) => {
                const n = workflow.participants.filter((p) => p.kind === kind).length
                return <KV key={kind} label={def.plural} value={String(n)} />
              })}
            </dl>
            <button className="link-btn" onClick={() => setPanel('signees')}>
              View Details <Icon name="arrowRight" size={14} />
            </button>
          </section>
        </div>

        <aside className="card pad summary">
          <h3>Workflow Summary</h3>
          <KV label="Workflow Id" value={workflow.id} />
          <KV label="Created At" value={formatDateTime(workflow.createdAt)} />
          <KV label="Workflow Name" value={workflow.name} />
          <div className="pdf-link">
            <Icon name="file" className="pdf-icon" />
            <button className="link-btn underline" onClick={viewPdf}>
              View Workflow-PDF <Icon name="external" size={14} />
            </button>
            <CopyButton text={workflow.documentName} onCopied={() => toast('File name copied')} />
          </div>
          <button className="btn soft sm" onClick={() => setPanel('payload')}>
            View Payload <Icon name="external" size={14} />
          </button>
          <button className="btn sm" onClick={() => setPanel('versions')}>
            Show Version History <Icon name="history" size={14} />
          </button>
          <button
            className="btn sm"
            onClick={() => {
              exportJson(`workflow-${workflow.name.replace(/\s+/g, '_')}.json`, toPayload(workflow))
              toast('Workflow exported. Find it under Downloads.')
            }}
          >
            Export Workflow <Icon name="share" size={14} />
          </button>
          <span className={`badge ${workflow.status}`}>{workflow.status.toUpperCase()}</span>
        </aside>
      </div>

      <Drawer open={panel === 'signees'} onClose={() => setPanel(null)} title="Signee Details" width={400}>
        {workflow.participants.map((p) => (
          <div key={p.id} className="accordion">
            <button className="accordion-head" onClick={() => setOpenSigner(openSigner === p.id ? null : p.id)}>
              {p.name}
              <span className="muted small">{PARTICIPANT_KINDS[p.kind].label}</span>
              <Icon name={openSigner === p.id ? 'chevronUp' : 'chevronDown'} size={16} />
            </button>
            {openSigner === p.id && (
              <dl className="accordion-body">
                {p.kind === 'signer' && (
                  <>
                    <KV label="Signature Type" value={p.signatureType === 'organization' ? 'Organization' : 'Individual'} />
                    <KV label="Signature Options" value={methodLabels(p.methods).join(', ')} />
                    <KV label="Exposure" value={p.exposure === 'parallel' ? 'Parallel' : 'Sequential'} />
                    <KV label="Pre-signing" value={p.preMethods.join(', ')} />
                    <KV label="Post-signing" value={p.postMethods.join(', ')} />
                  </>
                )}
                <KV label="Signature boxes" value={String(workflow.boxes.filter((b) => b.owner === p.id).length)} />
              </dl>
            )}
          </div>
        ))}
      </Drawer>

      <Modal open={panel === 'payload'} onClose={() => setPanel(null)} title="Workflow Payload" width={720}>
        <pre className="code-block">{JSON.stringify(toPayload(workflow), null, 2)}</pre>
      </Modal>

      <Drawer open={panel === 'versions'} onClose={() => setPanel(null)} title="Version History" width={380}>
        {[...workflow.versions].reverse().map((v) => (
          <div key={v.version} className="version-item">
            <strong>Version {v.version}</strong>
            <span className="muted small">{formatDateTime(v.savedAt)}</span>
            <span className={`badge ${v.status}`}>{v.status}</span>
          </div>
        ))}
      </Drawer>
    </div>
  )
}

function KV({ label, value }) {
  return (
    <div className="kv">
      <dt>{label}</dt>
      <dd>{value || '—'}</dd>
    </div>
  )
}
