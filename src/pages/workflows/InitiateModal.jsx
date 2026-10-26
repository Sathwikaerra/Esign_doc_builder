import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { initiateContract } from '../../services/contractService'
import { methodLabels } from '../../constants/workflow'
import { Modal } from '../../components/ui/Overlay'
import { useToast } from '../../components/ui/Toast'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Collects signer details and creates a contract from the workflow.
export default function InitiateModal({ workflow, onClose }) {
  const navigate = useNavigate()
  const toast = useToast()
  const signers = workflow?.participants.filter((p) => p.kind === 'signer') ?? []
  const [values, setValues] = useState([])
  const [submitted, setSubmitted] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setValues(signers.map(() => ({ name: '', email: '' })))
    setSubmitted(false)
  }, [workflow])

  const set = (i, field, v) => setValues((vals) => vals.map((x, j) => (j === i ? { ...x, [field]: v } : x)))
  const invalid = (v) => !v.name.trim() || !EMAIL_RE.test(v.email)

  const submit = async () => {
    setSubmitted(true)
    if (values.some(invalid)) return
    setBusy(true)
    try {
      await initiateContract(workflow, values)
    } catch (err) {
      toast(err.message, 'error')
      return
    } finally {
      setBusy(false)
    }
    onClose()
    toast('Contract initiated. Track it on the dashboard.')
    navigate('/dashboard')
  }

  return (
    <Modal
      open={!!workflow}
      onClose={onClose}
      title={`Initiate “${workflow?.name}”`}
      subtitle="Enter the details of each signer. They'll be invited in the configured order."
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
      {signers.length === 0 && <p className="muted">This workflow has no signers configured.</p>}
      {signers.map((s, i) => (
        <div key={s.id} className="initiate-row">
          <div className="initiate-label">
            <strong>{s.name}</strong>
            <span className="muted small">{methodLabels(s.methods).join(', ')}</span>
          </div>
          <div className="grid-2">
            <label className="field">
              <span className="field-label">Full name</span>
              <input value={values[i]?.name ?? ''} onChange={(e) => set(i, 'name', e.target.value)} />
              {submitted && !values[i]?.name.trim() && <span className="field-error">Required</span>}
            </label>
            <label className="field">
              <span className="field-label">Email</span>
              <input type="email" value={values[i]?.email ?? ''} onChange={(e) => set(i, 'email', e.target.value)} />
              {submitted && values[i] && !EMAIL_RE.test(values[i].email) && <span className="field-error">Enter a valid email</span>}
            </label>
          </div>
        </div>
      ))}
    </Modal>
  )
}
