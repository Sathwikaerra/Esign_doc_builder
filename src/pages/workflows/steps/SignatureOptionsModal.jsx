import { useEffect, useState } from 'react'
import { POST_SIGNING_METHODS, PRE_SIGNING_METHODS, SIGNATURE_METHODS } from '../../../constants/workflow'
import Icon from '../../../components/ui/Icon'
import { Modal } from '../../../components/ui/Overlay'

// "More Options": choose signature methods and verification for one signer.
export default function SignatureOptionsModal({ participant, onClose, onSave }) {
  const [state, setState] = useState(null)

  useEffect(() => {
    if (participant) {
      const { signatureType, exposure, methods, preMethods, postMethods } = participant
      setState({ signatureType, exposure, methods, preMethods, postMethods })
    }
  }, [participant])

  if (!participant || !state) return null
  const set = (patch) => setState((s) => ({ ...s, ...patch }))
  const toggleIn = (key, v) => set({ [key]: state[key].includes(v) ? state[key].filter((x) => x !== v) : [...state[key], v] })
  const sequential = state.exposure === 'sequential'

  return (
    <Modal
      open
      onClose={onClose}
      title="More Options"
      subtitle="Configure verification methods and additional requirements"
      width={600}
      footer={
        <>
          <button className="btn" onClick={() => set({ methods: [] })}>
            Disable All
          </button>
          <button className="btn" onClick={() => set({ methods: SIGNATURE_METHODS.map((m) => m.id) })}>
            Enable All
          </button>
          <button className="btn primary" disabled={!state.methods.length} onClick={() => onSave(state)}>
            Save
          </button>
        </>
      }
    >
      <p className="config-title">Signature Type</p>
      <div className="seg">
        {[
          ['individual', 'Individual'],
          ['organization', 'Organization'],
        ].map(([v, l]) => (
          <button key={v} className={state.signatureType === v ? 'on' : ''} onClick={() => set({ signatureType: v })}>
            {l}
          </button>
        ))}
      </div>

      <p className="config-title">Signature Option Exposure</p>
      <div className="tabs small-tabs">
        {[
          ['sequential', 'Sequential (Recommended)'],
          ['parallel', 'Parallel'],
        ].map(([v, l]) => (
          <button key={v} className={state.exposure === v ? 'on' : ''} onClick={() => set({ exposure: v })}>
            {l}
          </button>
        ))}
      </div>

      <div className="method-grid">
        {SIGNATURE_METHODS.map((m) => {
          const idx = state.methods.indexOf(m.id)
          return (
            <button key={m.id} className={`method-tile ${idx >= 0 ? 'on' : ''}`} onClick={() => toggleIn('methods', m.id)}>
              {idx >= 0 && sequential && <span className="order">{idx + 1}</span>}
              <Icon name={m.icon} size={20} />
              <span>{m.label}</span>
            </button>
          )
        })}
      </div>

      {state.methods.length > 0 && (
        <div className="flow-note">
          <strong>{sequential ? 'Sequential Signature Flow' : 'Parallel Signature Options'}</strong>
          <p className="muted small">
            {sequential
              ? 'Signature options will be enabled one by one based on retry limits. Fallback options appear only when retries are exhausted.'
              : 'All selected signature options are shown to the signer at once.'}
          </p>
        </div>
      )}

      <div className="exec-order">
        <div>
          <strong>Pre Signing Execution Order</strong>
          <div className="chip-row">
            {PRE_SIGNING_METHODS.map((m) => (
              <button key={m} className={`pill sm ${state.preMethods.includes(m) ? 'on' : ''}`} onClick={() => toggleIn('preMethods', m)}>
                {m}
              </button>
            ))}
          </div>
          {!state.preMethods.length && <span className="muted small">No methods selected</span>}
        </div>
        <div>
          <strong>Post Signing Execution Order</strong>
          <div className="chip-row">
            {POST_SIGNING_METHODS.map((m) => (
              <button key={m} className={`pill sm ${state.postMethods.includes(m) ? 'on' : ''}`} onClick={() => toggleIn('postMethods', m)}>
                {m}
              </button>
            ))}
          </div>
          {!state.postMethods.length && <span className="muted small">No methods selected</span>}
        </div>
      </div>
    </Modal>
  )
}
