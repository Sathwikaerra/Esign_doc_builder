import { useAuth } from '../../../context/AuthContext'
import {
  EXPIRY_UNITS,
  PDF_CUSTOM_NAMES,
  STAMPING_METHODS,
  USER_DEFINED_FIELDS,
  computeExpiry,
} from '../../../constants/workflow'
import Icon from '../../../components/ui/Icon'
import { Checkbox, Field, MultiSelect, Pills, Toggle } from '../../../components/ui/Controls'
import { useToast } from '../../../components/ui/Toast'

// Organisation-level defaults applied by "Fetch from Settings"; the executor is the user's organisation.
const ORG_DEFAULTS = {
  expiryValue: 14,
  expiryUnit: 'days',
  signingMethod: 'sequential',
  locationCapture: ['IP'],
  nameMatch: true,
  nameMatchThreshold: 70,
  pdfCustomName: 'Contract Name-Signer Name',
}

export default function BasicStep({ draft, update, showErrors }) {
  const toast = useToast()
  const { user } = useAuth()
  const b = draft.basic
  const set = (patch) => update('basic', patch)
  const expires = computeExpiry(b.expiryValue, b.expiryUnit)

  return (
    <>
      <div className="center-row">
        <button
          className="btn soft"
          onClick={() => {
            set({ ...ORG_DEFAULTS, executorName: user?.organisation?.name ?? '' })
            toast('Defaults fetched from organisation settings')
          }}
        >
          Fetch from Settings <Icon name="refresh" size={16} />
        </button>
      </div>

      <div className="card pad form-card">
        <h3 className="form-heading">Basic Contract Settings</h3>
        <div className="grid-2">
          <Field
            label="Contract Executor Name"
            required
            hint="The entity responsible for executing the contract"
            error={showErrors && !b.executorName.trim() ? 'Executor name is required' : ''}
            value={b.executorName}
            onChange={(e) => set({ executorName: e.target.value })}
          />
          <Field label="Contract Name" value={b.contractName} onChange={(e) => set({ contractName: e.target.value })} />
        </div>

        <div className="grid-expiry">
          <Field
            label="Contract Expiry"
            required
            type="number"
            min="1"
            value={b.expiryValue}
            error={showErrors && !(Number(b.expiryValue) > 0) ? 'Must be at least 1' : ''}
            onChange={(e) => set({ expiryValue: e.target.value })}
          />
          <Field label="Unit">
            <select value={b.expiryUnit} onChange={(e) => set({ expiryUnit: e.target.value })}>
              {EXPIRY_UNITS.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        {Number(b.expiryValue) > 0 && (
          <p className="muted small expires-note">
            Expires:{' '}
            {expires.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
          </p>
        )}

        <h4 className="sub-heading">
          Method of Signing <Icon name="info" size={14} className="muted" title="Sequential: one after another. Parallel: all at once." />
        </h4>
        <Pills
          options={[
            { value: 'sequential', label: 'Sequential Signing' },
            { value: 'parallel', label: 'Parallel Signing' },
          ]}
          value={b.signingMethod}
          onChange={(v) => v && set({ signingMethod: v })}
        />

        <h4 className="sub-heading">Location Capture Method</h4>
        <Pills
          multiple
          options={[
            { value: 'IP', label: 'IP' },
            { value: 'BROWSER', label: 'BROWSER' },
          ]}
          value={b.locationCapture}
          onChange={(v) => set({ locationCapture: v })}
        />

        <h4 className="sub-heading">Default Signatory Options</h4>
        <div className="options-box">
          <div className="grid-2 align-center">
            <Checkbox label="Enable Name Match for Aadhaar based eSign" checked={b.nameMatch} onChange={(v) => set({ nameMatch: v })} />
            <Field
              label="Name match threshold (in percentage)"
              type="number"
              min="0"
              max="100"
              disabled={!b.nameMatch}
              value={b.nameMatchThreshold}
              onChange={(e) => set({ nameMatchThreshold: e.target.value })}
            />
            <Checkbox label="Enable Signatory Gender Match" checked={b.genderMatch} onChange={(v) => set({ genderMatch: v })} />
            <Checkbox label="Enable Signatory YOB Match" checked={b.yobMatch} onChange={(v) => set({ yobMatch: v })} />
            <Checkbox label="Enable UID Last Four Digits Match" checked={b.uidMatch} onChange={(v) => set({ uidMatch: v })} />
            <Checkbox label="Enable Signatory Pincode Match" checked={b.pincodeMatch} onChange={(v) => set({ pincodeMatch: v })} />
          </div>
          <div className="lenient-box">
            <Toggle
              label="Enable Lenient Checks for All Fields"
              hint="Allow minor mismatches in all enabled checks"
              checked={b.lenientAll}
              disabled={!(b.nameMatch || b.genderMatch || b.yobMatch || b.uidMatch || b.pincodeMatch)}
              onChange={(v) => set({ lenientAll: v })}
            />
          </div>
        </div>

        <div className="toggle-list">
          <Toggle
            label="Lenient Coordinate Validation"
            hint="Accept signature boxes that slightly overflow the page"
            checked={b.lenientCoordinates}
            onChange={(v) => set({ lenientCoordinates: v })}
          />
          <Toggle
            label="Require Checker Approval for Bulk Initiation"
            hint="A checker must approve bulk contract initiation"
            checked={b.checkerApproval}
            onChange={(v) => set({ checkerApproval: v })}
          />
        </div>

        <h4 className="sub-heading">
          Method of Stamping <Icon name="info" size={14} className="muted" />
        </h4>
        <Pills options={STAMPING_METHODS} value={b.stampingMethod} onChange={(v) => set({ stampingMethod: v })} />

        <div className="grid-2 top-gap">
          <Field label="PDF Custom Name">
            <select value={b.pdfCustomName} onChange={(e) => set({ pdfCustomName: e.target.value })}>
              <option value="">Select…</option>
              {PDF_CUSTOM_NAMES.map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </Field>
          <Field
            label="Initiate Contract Email Subject"
            hint="Text to be shown to the Signer in the subject of Initiate Contract email"
            value={b.emailSubject}
            onChange={(e) => set({ emailSubject: e.target.value })}
          />
        </div>

        <h4 className="sub-heading">
          User Defined Fields <Icon name="info" size={14} className="muted" />
        </h4>
        <MultiSelect
          label="User Defined Fields"
          options={USER_DEFINED_FIELDS}
          value={b.userDefinedFields}
          max={15}
          onChange={(v) => set({ userDefinedFields: v })}
        />
        <span className="field-hint">
          <Icon name="info" size={13} /> You can select upto 15 fields which have been pre saved in Settings
        </span>
      </div>
    </>
  )
}
