import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { cancelContract, downloadContractDocument, getContract, getSignerPhoto, resendInvite, saveBlob } from '../../services/contractService'
import { methodLabels } from '../../constants/workflow'
import { CONTRACT_STATUS } from '../../constants/contracts'
import { formatDateTime } from '../../utils/format'
import Icon from '../../components/ui/Icon'
import { CopyButton, EmptyState, PageTitle } from '../../components/ui/Controls'
import { Modal } from '../../components/ui/Overlay'
import MapModal from '../../components/ui/MapModal'
import { useToast } from '../../components/ui/Toast'

const SIGNER_STATUS = {
  waiting: { label: 'Waiting for turn', tone: 'grey' },
  invited: { label: 'Invited', tone: 'blue' },
  viewed: { label: 'Viewed', tone: 'blue' },
  signed: { label: 'Signed', tone: 'green' },
  declined: { label: 'Declined', tone: 'red' },
}
// Live photo taken while signing; the image needs the login token, so it is fetched as a blob
function SignerPhoto({ contractId, order, name }) {
  const [url, setUrl] = useState(null)
  useEffect(() => {
    let objectUrl
    getSignerPhoto(contractId, order)
      .then((blob) => setUrl((objectUrl = URL.createObjectURL(blob))))
      .catch(() => {})
    return () => objectUrl && URL.revokeObjectURL(objectUrl)
  }, [contractId, order])
  if (!url) return null
  return (
    <a href={url} target="_blank" rel="noreferrer" title={`Live photo of ${name}`}>
      <img src={url} alt={`Live photo of ${name}`} className="signer-photo" />
    </a>
  )
}

// Reviewers approve or reject instead of signing or declining
const REVIEWER_STATUS = { ...SIGNER_STATUS, signed: { label: 'Approved', tone: 'green' }, declined: { label: 'Rejected', tone: 'red' } }

const EVENT_LABELS = {
  created: 'Contract created',
  invited: 'Invited',
  reminded: 'Invitation re-sent',
  viewed: 'Opened the document',
  signed: 'Signed',
  declined: 'Declined',
  approved: 'Approved',
  rejected: 'Rejected',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export default function ContractDetail() {
  const { id } = useParams()
  const toast = useToast()
  const [mapFor, setMapFor] = useState(null) // signer whose location is shown on the map
  const [contract, setContract] = useState(undefined)
  const [busy, setBusy] = useState('')
  const [shared, setShared] = useState(null) // { name, link, emailed, error }
  const [confirmCancel, setConfirmCancel] = useState(false)

  const load = () =>
    getContract(id)
      .then(setContract)
      .catch((err) => {
        setContract(null)
        toast(err.message, 'error')
      })

  useEffect(() => {
    load()
  }, [id])

  if (contract === undefined) return <div className="page loading-text">Loading…</div>
  if (!contract)
    return (
      <div className="page">
        <EmptyState title="Contract not found" message="It may have been deleted." />
        <Link to="/dashboard" className="center-link">
          Back to dashboard
        </Link>
      </div>
    )

  const status = CONTRACT_STATUS[contract.status] ?? { label: contract.status, tone: 'grey' }
  const open = contract.status === 'incomplete'
  const doneCount = contract.signers.filter((s) => s.signed).length
  const hasReviewers = contract.signers.some((s) => s.kind === 'reviewer')
  const inReview = contract.signers.some((s) => s.kind === 'reviewer' && !s.signed)
  const nameOf = (order) => contract.signers.find((s) => s.order === order)?.name

  // Signers can only be invited once every reviewer has approved
  const canInvite = (s) =>
    open &&
    !s.signed &&
    (s.kind === 'reviewer' || !inReview) &&
    (contract.signingMethod === 'parallel' || contract.signers.every((x) => x.order >= s.order || x.signed))

  const resend = async (s) => {
    setBusy(`resend-${s.order}`)
    try {
      const result = await resendInvite(contract.id, s.order)
      setShared({ name: s.name, ...result })
      load()
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setBusy('')
    }
  }

  const download = async (kind) => {
    setBusy(`download-${kind}`)
    try {
      const { blob, fileName } = await downloadContractDocument(contract.id, kind)
      saveBlob(blob, fileName)
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setBusy('')
    }
  }

  const cancel = async () => {
    setBusy('cancel')
    try {
      setContract({ ...contract, ...(await cancelContract(contract.id)) })
      setConfirmCancel(false)
      toast('Contract cancelled. Signing links no longer work.')
      load()
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="page">
      <PageTitle title={contract.name} crumbs={['Dashboard', 'Contracts', contract.id]}>
        {contract.status === 'completed' && (
          <button className="btn primary" onClick={() => download('signed')} disabled={!!busy}>
            <Icon name="download" size={16} /> {busy === 'download-signed' ? 'Preparing…' : 'Download signed PDF'}
          </button>
        )}
        <button className="btn" onClick={() => download('original')} disabled={!!busy}>
          <Icon name="file" size={16} /> {busy === 'download-original' ? 'Preparing…' : 'Original PDF'}
        </button>
        {open && (
          <button className="btn danger-outline" onClick={() => setConfirmCancel(true)} disabled={!!busy}>
            <Icon name="xCircle" size={16} /> Cancel contract
          </button>
        )}
      </PageTitle>

      <div className="detail-grid">
        <div className="detail-main">
          <div className="card pad">
            <div className="contract-progress-head">
              <h3>{hasReviewers ? 'Reviewers & signers' : 'Signers'}</h3>
              <span className={`badge ${status.tone}`}>{status.label}</span>
            </div>
            <div className="progress-bar">
              <span style={{ width: `${(doneCount / Math.max(1, contract.signers.length)) * 100}%` }} />
            </div>
            <p className="muted small">
              {doneCount} of {contract.signers.length} {hasReviewers ? 'done' : 'signed'} ·{' '}
              {hasReviewers && 'reviewers approve first, then '}
              {contract.signingMethod === 'parallel' ? 'everyone signs in any order' : 'signers are invited one after another'}
            </p>

            <ul className="contract-signers">
              {contract.signers.map((s) => {
                const reviewer = s.kind === 'reviewer'
                const st = (reviewer ? REVIEWER_STATUS : SIGNER_STATUS)[s.status] ?? SIGNER_STATUS.waiting
                return (
                  <li key={s.order} className={`is-${s.status}`}>
                    <span className="signer-dot">{s.signed ? <Icon name="check" size={12} /> : s.order}</span>
                    <div className="contract-signer-main">
                      <strong>
                        {s.name}
                        {reviewer && <span className="chip muted-chip">Reviewer</span>}
                      </strong>
                      <span className="muted small">
                        {s.email}
                        {s.method && ` · ${methodLabels([s.method])[0] ?? s.method}`}
                      </span>
                      <span className="muted small contract-signer-times">
                        {s.invitedAt && <>Invited {formatDateTime(s.invitedAt)}</>}
                        {s.viewedAt && <> · Viewed {formatDateTime(s.viewedAt)}</>}
                        {s.signedAt && <> · {reviewer ? 'Approved' : 'Signed'} {formatDateTime(s.signedAt)}</>}
                        {s.declinedAt && <> · {reviewer ? 'Rejected' : 'Declined'} {formatDateTime(s.declinedAt)}</>}
                      </span>
                      {(s.location || s.hasPhoto) && (
                        <span className="contract-signer-captures">
                          {s.hasPhoto && <SignerPhoto contractId={contract.id} order={s.order} name={s.name} />}
                          {s.location && (
                            <button type="button" className="location-chip" onClick={() => setMapFor(s)} title="Show on map">
                              <Icon name="mapPin" size={14} />
                              <span>
                                <b>{s.location.address || 'Address not available'}</b>
                                <span className="muted small">
                                  {s.location.lat.toFixed(5)}, {s.location.lng.toFixed(5)}
                                  {s.location.accuracy != null && ` · within ${s.location.accuracy} m`} · View map
                                </span>
                              </span>
                            </button>
                          )}
                        </span>
                      )}
                      {s.declineReason && <span className="decline-reason">“{s.declineReason}”</span>}
                      {s.reviewComment && <span className="review-comment">“{s.reviewComment}”</span>}
                    </div>
                    <div className="contract-signer-actions">
                      <span className={`badge ${st.tone}`}>{st.label}</span>
                      {canInvite(s) && (
                        <button className="btn xs" onClick={() => resend(s)} disabled={!!busy}>
                          <Icon name="mail" size={13} /> {busy === `resend-${s.order}` ? 'Sending…' : s.invitedAt ? 'Resend link' : 'Send link'}
                        </button>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>

          <div className="card pad">
            <h3>Activity</h3>
            {contract.events.length === 0 && <p className="muted">No activity yet.</p>}
            <ul className="audit-list">
              {contract.events.map((e, i) => (
                <li key={i} className={`audit-${e.event}`}>
                  <span className="audit-dot" />
                  <div>
                    <strong>
                      {EVENT_LABELS[e.event] ?? e.event}
                      {e.signerOrder && ` · ${nameOf(e.signerOrder) ?? `Signer ${e.signerOrder}`}`}
                    </strong>
                    {e.detail && <span className="muted small">{e.detail}</span>}
                    <span className="muted small">
                      {formatDateTime(e.at)}
                      {e.ip && ` · IP ${e.ip}`}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="card pad summary">
          <h3>Details</h3>
          <dl className="kv-list">
            <div className="kv">
              <dt>Contract ID</dt>
              <dd className="mono">
                {contract.id} <CopyButton text={contract.id} onCopied={() => toast('Contract ID copied')} />
              </dd>
            </div>
            <div className="kv">
              <dt>Workflow</dt>
              <dd>{contract.workflowId ? <Link to={`/workflows/${contract.workflowId}`}>{contract.workflowName}</Link> : contract.workflowName}</dd>
            </div>
            <div className="kv">
              <dt>Created</dt>
              <dd>{formatDateTime(contract.createdAt)}</dd>
            </div>
            <div className="kv">
              <dt>{contract.status === 'expired' ? 'Expired' : 'Expires'}</dt>
              <dd>{formatDateTime(contract.expiresAt)}</dd>
            </div>
            {contract.completedAt && (
              <div className="kv">
                <dt>Completed</dt>
                <dd>{formatDateTime(contract.completedAt)}</dd>
              </div>
            )}
            <div className="kv">
              <dt>eStamping</dt>
              <dd>{contract.estamping}</dd>
            </div>
            {contract.documents.map((d) => (
              <div className="kv" key={d.kind}>
                <dt>{d.kind === 'signed' ? 'Signed PDF' : 'Original PDF'}</dt>
                <dd>
                  {d.fileName}
                  <span className="muted small hash" title={d.sha256}>
                    SHA-256 {d.sha256.slice(0, 16)}…
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <Modal
        open={!!shared}
        onClose={() => setShared(null)}
        title={shared?.emailed ? 'Invitation sent' : 'Invitation not emailed'}
        subtitle={
          shared?.emailed
            ? `A new link was emailed to ${shared.email}. Older links for ${shared?.name} no longer work.`
            : shared?.error
        }
        footer={
          <button className="btn primary" onClick={() => setShared(null)}>
            Done
          </button>
        }
      >
        <p className="muted small">You can also share this link with {shared?.name} directly. It is personal to them, so only send it to that person.</p>
        <div className="link-box">
          <code>{shared?.link}</code>
          <CopyButton text={shared?.link ?? ''} onCopied={() => toast('Link copied')} />
        </div>
      </Modal>

      {mapFor && <MapModal location={mapFor.location} onClose={() => setMapFor(null)} title={`Where ${mapFor.name} signed`} />}

      <Modal
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        title="Cancel this contract?"
        subtitle="Reviewers and signers will no longer be able to open it. This can't be undone."
        footer={
          <>
            <button className="btn" onClick={() => setConfirmCancel(false)}>
              Keep it
            </button>
            <button className="btn danger" onClick={cancel} disabled={busy === 'cancel'}>
              {busy === 'cancel' ? 'Cancelling…' : 'Cancel contract'}
            </button>
          </>
        }
      />
    </div>
  )
}
