import PdfViewer from '../../../components/PdfViewer'
import { PARTICIPANT_KINDS, methodLabels } from '../../../constants/workflow'
import { useOwnerInfo } from './SigneeStep'

export default function ConfirmStep({ draft, update, file }) {
  const ownerInfo = useOwnerInfo(draft.participants)
  return (
    <>
      <h3 className="form-heading">Review Contract</h3>
      <div className="split">
        <PdfViewer file={file} boxes={draft.boxes} ownerInfo={ownerInfo} />
        <div className="side-panel">
          <label className="field">
            <span className="field-label">Initiation message</span>
            <textarea rows={6} value={draft.initiationMessage} onChange={(e) => update(null, { initiationMessage: e.target.value })} />
          </label>
          <div className="card pad review-summary">
            <h4>{draft.name}</h4>
            <p className="muted small">
              {draft.basic.signingMethod === 'parallel' ? 'Parallel' : 'Sequential'} signing · expires in {draft.basic.expiryValue}{' '}
              {draft.basic.expiryUnit}
            </p>
            <ul>
              {draft.participants.map((p) => (
                <li key={p.id}>
                  <span className="dot" style={{ background: ownerInfo[p.id]?.color }} />
                  <strong>{p.name}</strong>
                  <span className="muted small">
                    {p.kind === 'signer' ? methodLabels(p.methods).join(', ') : PARTICIPANT_KINDS[p.kind].label}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </>
  )
}
