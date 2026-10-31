import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import PdfViewer from '../components/PdfViewer'
import SignatureModal from '../components/signing/SignatureModal'
import MethodWindow, { methodLabel, usesStamp } from '../components/signing/MethodWindows'
import MethodIcon from '../components/signing/MethodIcon'
import Icon from '../components/ui/Icon'
import { Modal } from '../components/ui/Overlay'
import { Spinner } from '../components/auth/AuthLayout'
import { useToast } from '../components/ui/Toast'
import { approveDocument, declineDocument, getSigning, getSigningDocument, signDocument } from '../services/signingService'
import { saveBlob } from '../services/contractService'
import { formatDateTime } from '../utils/format'

const MY_COLOR = 'var(--primary)'
const OTHER_COLOR = '#94a3b8'
const SIGNED_COLOR = '#16a34a'

/*
 * Public page a signer reaches from the emailed link (/sign/:token).
 * They review the PDF, pass the identity check of their signing method (each method has its own
 * window, see MethodWindows), adopt a signature, agree, and finish.
 * Reviewers get the same page without signing: they approve (with an optional comment) or reject.
 */
export default function SignDocument() {
  const { token } = useParams()
  const toast = useToast()
  const [view, setView] = useState(undefined) // undefined = loading, null = invalid link
  const [error, setError] = useState('')
  const [file, setFile] = useState(null)
  const [signature, setSignature] = useState(null) // { image, type }
  const [padOpen, setPadOpen] = useState(false)
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [declineOpen, setDeclineOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [justSigned, setJustSigned] = useState(false)
  const [comment, setComment] = useState('')
  const [method, setMethod] = useState(null)
  const [verified, setVerified] = useState(null) // { method, challengeId?, acceptedName?, summary, stamp? }
  const [methodOpen, setMethodOpen] = useState(false)
  const [windowKey, setWindowKey] = useState(0)

  const loadDocument = () =>
    getSigningDocument(token)
      .then(({ blob }) => setFile(blob))
      .catch((err) => toast(err.message, 'error'))

  useEffect(() => {
    getSigning(token)
      .then((v) => {
        setView(v)
        setMethod(v.me.methods?.[0] ?? null)
        loadDocument()
      })
      .catch((err) => {
        setError(err.message)
        setView(null)
      })
  }, [token])

  const myBoxes = view?.boxes.filter((b) => b.mine) ?? []
  // Once completed the viewer shows the signed PDF, which already has the signatures stamped in
  const boxes = useMemo(
    () =>
      (view?.hasSignedDocument ? [] : view?.boxes ?? []).map((b) => {
        const owner = b.mine ? 'me' : b.kind === 'signer' ? `s${b.signerOrder}` : b.kind
        const state = b.signed ? 'signed' : b.mine && view.canSign ? 'todo' : 'pending'
        return { ...b, owner, className: `sign-box ${state} ${b.mine ? 'mine' : ''}` }
      }),
    [view],
  )
  const ownerInfo = useMemo(() => {
    const info = { me: { color: MY_COLOR }, auto: { color: OTHER_COLOR }, other: { color: OTHER_COLOR } }
    for (const s of view?.signers ?? []) info[`s${s.order}`] = { color: s.status === 'signed' ? SIGNED_COLOR : OTHER_COLOR }
    return info
  }, [view])

  if (view === undefined) {
    return (
      <SignShell>
        <div className="sign-center">
          <Spinner size={28} />
          <p className="muted">Opening your document…</p>
        </div>
      </SignShell>
    )
  }
  if (view === null) {
    return (
      <SignShell>
        <div className="sign-center card pad sign-message">
          <span className="sign-message-icon red">
            <Icon name="alert" size={28} />
          </span>
          <h2>This link can't be opened</h2>
          <p className="muted">{error}</p>
          <p className="muted small">If you were sent a newer email for this document, use the link in that one. Otherwise ask the sender to resend the invitation.</p>
        </div>
      </SignShell>
    )
  }

  const { contract, me, canSign } = view
  const isReviewer = me.kind === 'reviewer'
  const hasReviewers = view.signers.some((s) => s.kind === 'reviewer')
  const doneCount = view.signers.filter((s) => s.status === 'signed').length

  const renderBox = (b) => {
    if (b.mine && b.signed) return <img src={view.signatures[me.order]} alt="Your signature" className="sign-box-img" />
    if (b.signed && view.signatures[b.signerOrder]) return <img src={view.signatures[b.signerOrder]} alt={`Signature of ${b.label}`} className="sign-box-img" />
    if (b.mine && signature) return <img src={signature.image} alt="Your signature" className="sign-box-img" />
    if (b.mine && canSign) {
      return (
        <span className="sign-box-cta">
          <Icon name="signature" size={14} /> Sign here
        </span>
      )
    }
    return <span className="sig-box-label">{b.kind === 'auto' ? `${b.label} (auto)` : b.label}</span>
  }

  const openMethod = () => {
    setWindowKey((k) => k + 1)
    setMethodOpen(true)
  }
  const chooseMethod = (m) => {
    if (m === method) return
    setMethod(m)
    setVerified(null)
    setSignature(null)
  }
  const onVerified = (r) => {
    setVerified(r)
    setMethodOpen(false)
    if (r.stamp) setSignature({ image: r.stamp, type: 'stamp' })
    else setPadOpen(true)
    toast(`${methodLabel(r.method)}: verified`)
  }
  // Clicking a signature box starts with the method's check, then the signature
  const onMyBox = () => {
    if (!verified) openMethod()
    else if (!usesStamp(method)) setPadOpen(true)
  }

  const finish = async () => {
    if (!signature || !consent || !verified) return
    setBusy(true)
    try {
      const next = await signDocument(token, {
        signature: signature.image,
        type: signature.type,
        method: verified.method,
        challengeId: verified.challengeId,
        acceptedName: verified.acceptedName,
      })
      setView(next)
      setJustSigned(true)
      if (next.contract.status === 'completed') loadDocument()
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const approve = async () => {
    setBusy(true)
    try {
      setView(await approveDocument(token, comment.trim()))
      setJustSigned(true)
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const decline = async () => {
    if (!reason.trim()) return
    setBusy(true)
    try {
      setView(await declineDocument(token, reason.trim()))
      setDeclineOpen(false)
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const download = async () => {
    try {
      const { blob, fileName } = await getSigningDocument(token)
      saveBlob(blob, fileName)
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  return (
    <SignShell contract={contract}>
      <div className="sign-layout">
        <div className="sign-doc">
          <PdfViewer file={file} boxes={boxes} ownerInfo={ownerInfo} renderBox={renderBox} onBoxClick={(b) => b.mine && canSign && onMyBox()} />
        </div>

        <aside className="sign-side">
          <StatusCard view={view} justSigned={justSigned} onDownload={download} />

          {canSign && isReviewer && (
            <div className="card pad sign-steps">
              <h3>Review this document</h3>
              <p className="muted small">Read the document on the left. Approving sends it on to the signers; rejecting stops it and tells the sender why.</p>
              <label className="field">
                <span className="field-label">Comment (optional, shared with the sender)</span>
                <textarea rows={3} value={comment} maxLength={1000} onChange={(e) => setComment(e.target.value)} placeholder="e.g. Checked the loan amount and terms" />
              </label>
              <button className="btn primary block" disabled={busy} onClick={approve}>
                {busy ? (
                  <>
                    <Spinner /> Approving…
                  </>
                ) : (
                  <>
                    <Icon name="check" size={16} /> Approve document
                  </>
                )}
              </button>
              <button className="btn ghost block sign-decline" onClick={() => setDeclineOpen(true)} disabled={busy}>
                Reject
              </button>
            </div>
          )}

          {canSign && !isReviewer && (
            <div className="card pad sign-steps">
              <h3>Sign this document</h3>
              <ol className="sign-step-list">
                <li className="done">
                  <span>1</span> Review the document on the left
                </li>
                <li className={verified ? 'done' : 'current'}>
                  <span>2</span>
                  <div className="sign-method-step">
                    {me.methods.length > 1 && !verified && (
                      <>
                        Choose how to sign
                        <div className="sign-method-choices">
                          {me.methods.map((m) => (
                            <button key={m} className={`sign-method-choice ${m === method ? 'on' : ''}`} onClick={() => chooseMethod(m)}>
                              <MethodIcon method={m} size={22} /> {methodLabel(m)}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                    {verified ? (
                      <>
                        <span className="sign-method-done">
                          <MethodIcon method={verified.method} size={22} /> {methodLabel(verified.method)}
                        </span>
                        <span className="muted small">{verified.summary}</span>
                      </>
                    ) : (
                      <>
                        {me.methods.length === 1 && (
                          <span className="sign-method-done">
                            <MethodIcon method={method} size={22} /> Sign with {methodLabel(method)}
                          </span>
                        )}
                        <button className="btn soft sm" onClick={openMethod}>
                          <Icon name="shield" size={14} /> {method === 'CLICKWRAP' ? 'Review and accept' : 'Verify and sign'}
                        </button>
                      </>
                    )}
                  </div>
                </li>
                <li className={signature ? 'done' : verified ? 'current' : ''}>
                  <span>3</span>
                  <div>
                    {signature ? (usesStamp(method) ? 'Signature created by ' + methodLabel(method) : 'Signature adopted') : 'Add your signature'}
                    {signature && <img src={signature.image} alt="" className="sign-preview" />}
                    {verified && !usesStamp(method) && (
                      <button className="btn soft sm" onClick={() => setPadOpen(true)}>
                        <Icon name={signature ? 'edit' : 'signature'} size={14} /> {signature ? 'Change signature' : 'Add signature'}
                      </button>
                    )}
                  </div>
                </li>
                <li className={signature ? (consent ? 'done' : 'current') : ''}>
                  <span>4</span>
                  <label className="sign-consent">
                    <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} disabled={!signature} />
                    <span>
                      I agree that this electronic signature is the legal equivalent of my handwritten signature on this document, and I consent to signing it
                      electronically.
                    </span>
                  </label>
                </li>
              </ol>
              <button className="btn primary block" disabled={!signature || !consent || busy} onClick={finish}>
                {busy ? (
                  <>
                    <Spinner /> Signing…
                  </>
                ) : (
                  <>
                    <Icon name="check" size={16} /> Finish signing
                  </>
                )}
              </button>
              <button className="btn ghost block sign-decline" onClick={() => setDeclineOpen(true)} disabled={busy}>
                Decline to sign
              </button>
            </div>
          )}

          <div className="card pad">
            <h3 className="sign-side-title">
              {hasReviewers ? 'Reviewers & signers' : 'Signers'}{' '}
              <span className="muted small">
                {doneCount} of {view.signers.length} {hasReviewers ? 'done' : 'signed'}
              </span>
            </h3>
            <ul className="signer-progress">
              {view.signers.map((s) => (
                <li key={s.order} className={`is-${s.status}`}>
                  <span className="signer-dot">{s.status === 'signed' ? <Icon name="check" size={12} /> : s.status === 'declined' ? <Icon name="x" size={12} /> : s.order}</span>
                  <div>
                    <strong>
                      {s.name}
                      {s.kind === 'reviewer' && <span className="chip muted-chip">Reviewer</span>}
                      {s.order === me.order && <span className="chip">You</span>}
                    </strong>
                    <span className="muted small">
                      {personStatus(s)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
            <p className="muted small sign-order-note">
              {hasReviewers && 'Reviewers approve first, then the signers are asked. '}
              {contract.signingMethod === 'parallel' ? 'Everyone can sign in any order.' : 'Signers are asked one after another, in this order.'}
            </p>
          </div>
        </aside>
      </div>

      {method && (
        <MethodWindow
          key={windowKey}
          method={method}
          open={methodOpen}
          onClose={() => setMethodOpen(false)}
          token={token}
          me={me}
          contract={contract}
          sandbox={view.sandbox}
          onVerified={onVerified}
          onError={(msg) => toast(msg, 'error')}
        />
      )}

      <SignatureModal
        open={padOpen}
        onClose={() => setPadOpen(false)}
        defaultName={me.name}
        onAdopt={(sig) => {
          setSignature(sig)
          setPadOpen(false)
        }}
      />

      <Modal
        open={declineOpen}
        onClose={() => setDeclineOpen(false)}
        title={isReviewer ? 'Reject this document?' : 'Decline to sign?'}
        subtitle="The sender will be notified and nobody else will be asked to sign this document."
        footer={
          <>
            <button className="btn" onClick={() => setDeclineOpen(false)}>
              Go back
            </button>
            <button className="btn danger" onClick={decline} disabled={!reason.trim() || busy}>
              {busy ? (isReviewer ? 'Rejecting…' : 'Declining…') : isReviewer ? 'Reject' : 'Decline'}
            </button>
          </>
        }
      >
        <label className="field">
          <span className="field-label">Reason (shared with the sender)</span>
          <textarea rows={3} value={reason} maxLength={1000} onChange={(e) => setReason(e.target.value)} placeholder="e.g. The loan amount is incorrect" autoFocus />
        </label>
      </Modal>
    </SignShell>
  )
}

function personStatus(s) {
  const reviewer = s.kind === 'reviewer'
  if (s.status === 'signed') return `${reviewer ? 'Approved' : 'Signed'} ${formatDateTime(s.signedAt)}`
  if (s.status === 'declined') return reviewer ? 'Rejected' : 'Declined'
  return reviewer ? 'Not reviewed yet' : 'Not signed yet'
}

function StatusCard({ view, justSigned, onDownload }) {
  const { contract, me, blockedReason } = view
  const reviewer = me.kind === 'reviewer'
  const from = `${contract.sender ? `${contract.sender} from ` : ''}${contract.organisation}`
  let tone = 'info'
  let icon = 'file'
  let title = reviewer ? 'Ready for your review' : 'Ready for your signature'
  let text = reviewer
    ? `${from} asked you to review and approve this document before it is sent for signing (by ${formatDateTime(contract.expiresAt)}).`
    : `${from} asked you to sign this document before ${formatDateTime(contract.expiresAt)}.`

  if (contract.status === 'completed') {
    tone = 'green'
    icon = 'checkCircle'
    title = justSigned ? 'All done! Everyone has signed' : 'This document is fully signed'
    text = 'The signed PDF, with its certificate of completion, has been emailed to all signers. You can also download it here.'
  } else if (me.status === 'signed' && reviewer) {
    tone = 'green'
    icon = 'checkCircle'
    title = justSigned ? 'Thank you, you have approved it' : 'You approved this document'
    text = "It goes to the signers once every reviewer has approved. We'll email you the completed PDF once everyone has signed."
  } else if (me.status === 'signed') {
    tone = 'green'
    icon = 'checkCircle'
    title = justSigned ? 'Thank you, you have signed' : 'You have signed this document'
    text = "We'll email you the completed PDF once everyone has signed."
  } else if (me.status === 'declined') {
    tone = 'red'
    icon = 'xCircle'
    title = reviewer ? 'You rejected this document' : 'You declined this document'
    text = 'The sender has been notified.'
  } else if (blockedReason) {
    tone = contract.status === 'incomplete' ? 'yellow' : 'red'
    icon = contract.status === 'incomplete' ? 'hourglass' : 'alert'
    title = contract.status === 'incomplete' ? 'Not your turn yet' : reviewer ? 'Review is closed' : 'Signing is closed'
    text = blockedReason
  }

  return (
    <div className={`card pad sign-status ${tone} ${justSigned ? 'celebrate' : ''}`}>
      <span className="sign-status-icon">
        <Icon name={icon} size={24} />
      </span>
      <div>
        <h3>{title}</h3>
        <p>{text}</p>
        <button className="btn sm" onClick={onDownload}>
          <Icon name="download" size={14} /> {contract.status === 'completed' ? 'Download signed PDF' : 'Download PDF'}
        </button>
      </div>
    </div>
  )
}

function SignShell({ contract, children }) {
  return (
    <div className="sign-shell">
      <header className="sign-header">
        <div className="sign-brand">
          <span className="sign-brand-mark">
            <Icon name="signature" size={18} />
          </span>
          eSign Doc Builder
        </div>
        {contract && (
          <div className="sign-header-doc">
            <strong>{contract.name}</strong>
            <span className="muted small">Sent by {contract.sender ? `${contract.sender}, ` : ''}{contract.organisation}</span>
          </div>
        )}
        <span className="sign-secure">
          <Icon name="lock" size={14} /> Secure signing
        </span>
      </header>
      <main className="sign-main">{children}</main>
    </div>
  )
}
