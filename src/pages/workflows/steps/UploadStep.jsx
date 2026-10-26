import { useRef, useState } from 'react'
import Icon from '../../../components/ui/Icon'

const MAX_SIZE = 100 * 1024 * 1024

export default function UploadStep({ draft, update, file, setFile, showErrors, generating, fromTemplate }) {
  const inputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState('')

  const accept = (f) => {
    if (!f) return
    if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) return setError('Only PDF files are supported.')
    if (f.size > MAX_SIZE) return setError('File is larger than 100MB.')
    setError('')
    setFile(f)
    update(null, { documentName: f.name })
  }

  return (
    <div className="card pad form-card">
      <h3 className="form-heading">
        Workflow Name <span className="req">*</span>
      </h3>
      <label className={`field ${showErrors && !draft.name.trim() ? 'has-error' : ''}`}>
        <span className="field-label">
          Workflow Name <span className="req">*</span>
        </span>
        <input value={draft.name} onChange={(e) => update(null, { name: e.target.value })} placeholder="e.g. Loan Agreement v5" autoFocus />
        {showErrors && !draft.name.trim() && <span className="field-error">Workflow name is required</span>}
      </label>

      <h3 className="form-heading">
        Select Document <span className="req">*</span>
      </h3>
      {generating && (
        <div className="template-note">
          <Icon name="refresh" size={16} className="spin" /> Building the PDF from template “{generating}”…
        </div>
      )}
      {fromTemplate && file && !generating && (
        <div className="template-note">
          <Icon name="checkCircle" size={16} /> Document generated from template “{fromTemplate}”. You can upload a different PDF to replace it.
        </div>
      )}
      <div
        className={`dropzone ${dragOver ? 'over' : ''} ${showErrors && !file ? 'has-error' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          accept(e.dataTransfer.files?.[0])
        }}
        role="button"
        tabIndex={0}
      >
        <input ref={inputRef} type="file" accept="application/pdf,.pdf" hidden onChange={(e) => accept(e.target.files?.[0])} />
        {file ? (
          <div className="file-chosen">
            <Icon name="file" size={28} />
            <div>
              <strong>{file.name}</strong>
              <span className="muted small">
                {file.size < 1024 * 1024 ? `${Math.ceil(file.size / 1024)} KB` : `${(file.size / 1024 / 1024).toFixed(2)} MB`} · click to replace
              </span>
            </div>
          </div>
        ) : (
          <>
            <Icon name="cloudUpload" size={40} className="muted" />
            <strong className="muted">Upload file</strong>
            <span className="muted small">
              Supported format: <b>pdf</b> | Max size: <b>100MB</b>
            </span>
            <span className="muted small">
              <Icon name="info" size={13} /> This is a sample file of the contract
            </span>
          </>
        )}
      </div>
      {error && <span className="field-error">{error}</span>}
      {showErrors && !file && !error && <span className="field-error">Please upload the contract PDF</span>}
    </div>
  )
}
