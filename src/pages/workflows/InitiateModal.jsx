import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { initiateContract } from '../../services/contractService'
import { methodLabels } from '../../constants/workflow'
import { Modal } from '../../components/ui/Overlay'
import { useToast } from '../../components/ui/Toast'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const blank = (list) => list.map(() => ({ name: '', email: '' }))

// Collects reviewer and signer details and creates a contract from the workflow.
export default function InitiateModal({ workflow, onClose }) {
  const navigate = useNavigate()
  const toast = useToast()
  const signers = workflow?.participants.filter((p) => p.kind === 'signer') ?? []
  const reviewers = workflow?.participants.filter((p) => p.kind === 'reviewer') ?? []
  const [values, setValues] = useState({ signer: [], reviewer: [] })
  const [submitted, setSubmitted] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setValues({ signer: blank(signers), reviewer: blank(reviewers) })
    setSubmitted(false)
  }, [workflow])

  const set = (kind, i, field, v) => setValues((vals) => ({ ...vals, [kind]: vals[kind].map((x, j) => (j === i ? { ...x, [field]: v } : x)) }))
  const invalid = (v) => !v.name.trim() || !EMAIL_RE.test(v.email)

  const submit = async () => {
    setSubmitted(true)
    if ([...values.signer, ...values.reviewer].some(invalid)) return
    setBusy(true)
    let contract
    try {
      contract = await initiateContract(workflow, values.signer, values.reviewer)
    } catch (err) {
      toast(err.message, 'error')
      return
    } finally {
      setBusy(false)
    }
    onClose()
    const failed = contract.invites.filter((i) => !i.emailed)
    const what = reviewers.length ? 'Review link' : 'Signing link'
    if (failed.length) toast(`Contract created, but the invitation email could not be sent to ${failed.map((i) => i.email).join(', ')}. Use "Resend link" on the contract page to share it.`, 'error')
    else toast(`Contract initiated. ${what} emailed to ${contract.invites.map((i) => i.email).join(', ')}.`)
    navigate(`/contracts/${contract.id}`)
  }

  const parallel = workflow?.basic?.signingMethod === 'parallel'
  const subtitle = reviewers.length
    ? `Reviewers get the document first. Once ${reviewers.length === 1 ? 'the reviewer approves' : 'every reviewer approves'}, signers get their signing links${parallel ? '' : ' one after another'}.`
    : parallel
      ? 'Enter the details of each signer. Everyone gets their signing link by email right away.'
      : 'Enter the details of each signer. Each one gets a signing link by email when it is their turn.'

  const rows = (kind, roles, describe) =>
    roles.map((p, i) => {
      const v = values[kind][i]
      return (
        <div key={p.id} className="initiate-row">
          <div className="initiate-label">
            <strong>{p.name}</strong>
            <span className="muted small">{describe(p)}</span>
          </div>
          <div className="grid-2">
            <label className="field">
              <span className="field-label">Full name</span>
              <input value={v?.name ?? ''} onChange={(e) => set(kind, i, 'name', e.target.value)} />
              {submitted && !v?.name.trim() && <span className="field-error">Required</span>}
            </label>
            <label className="field">
              <span className="field-label">Email</span>
              <input type="email" value={v?.email ?? ''} onChange={(e) => set(kind, i, 'email', e.target.value)} />
              {submitted && v && !EMAIL_RE.test(v.email) && <span className="field-error">Enter a valid email</span>}
            </label>
          </div>
        </div>
      )
    })

  return (
    <Modal
      open={!!workflow}
      onClose={onClose}
      title={`Initiate “${workflow?.name}”`}
      subtitle={subtitle}
      width={600}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" onClick={submit} disabled={busy}>
            {busy ? 'Initiating…' : 'Initiate Contract'}
          </button>
        </>
      }
    >
      {reviewers.length > 0 && (
        <>
          <h4 className="initiate-section">Reviewers</h4>
          {rows('reviewer', reviewers, () => 'Approves or rejects the document before it goes to the signers')}
          <h4 className="initiate-section">Signers</h4>
        </>
      )}
      {signers.length === 0 && <p className="muted">This workflow has no signers configured.</p>}
      {rows('signer', signers, (p) => methodLabels(p.methods).join(', '))}
    </Modal>
  )
}
