import { useState } from 'react'
import { LANGUAGES } from '../../../constants/workflow'
import Icon from '../../../components/ui/Icon'
import { Field, Pills, Radio } from '../../../components/ui/Controls'

function Section({ title, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className="card pad collapsible">
      <button className="collapsible-head" onClick={() => setOpen((o) => !o)}>
        <h3>
          {title} <span className="muted optional">(optional)</span>
        </h3>
        <Icon name={open ? 'chevronUp' : 'chevronDown'} />
      </button>
      {open && <div className="collapsible-body">{children}</div>}
    </section>
  )
}

function CallbackBlock({ title, prefix, a, set }) {
  const auth = a[`${prefix}Auth`]
  return (
    <div className="sub-card">
      <h4>{title}</h4>
      <div className="grid-2">
        <Field label={`${title.replace(' Configuration', '')} URL`} type="url" placeholder="https://" value={a[`${prefix}Url`]} onChange={(e) => set({ [`${prefix}Url`]: e.target.value })} />
      </div>
      <p className="mini-label">Authentication</p>
      <div className="radio-row">
        {[
          ['static', 'Static Authorization Header'],
          ['oauth', 'OAuth 2.0 Client Credentials'],
          ['none', 'None'],
        ].map(([v, l]) => (
          <Radio key={v} name={`${prefix}-auth`} value={v} label={l} checked={auth === v} onChange={(val) => set({ [`${prefix}Auth`]: val })} />
        ))}
      </div>
      {auth === 'static' && (
        <div className="grid-2 top-gap">
          <Field label="Header Name" placeholder="Authorization" value={a[`${prefix}HeaderKey`]} onChange={(e) => set({ [`${prefix}HeaderKey`]: e.target.value })} />
          <Field label="Header Value" value={a[`${prefix}HeaderValue`]} onChange={(e) => set({ [`${prefix}HeaderValue`]: e.target.value })} />
        </div>
      )}
      {auth === 'oauth' && <p className="field-hint">Uses the credentials from the “OAuth 2.0 Credentials” section below.</p>}
    </div>
  )
}

export default function AdvancedStep({ draft, update }) {
  const a = draft.advanced
  const set = (patch) => update('advanced', patch)

  return (
    <div className="stack">
      <Section title="IT Configuration" defaultOpen>
        <CallbackBlock title="Callback Configuration" prefix="callback" a={a} set={set} />
        <CallbackBlock title="Signer Callback Configuration" prefix="signerCallback" a={a} set={set} />
        <div className="grid-2">
          <Field label="Success Redirect URL" type="url" value={a.successRedirectUrl} onChange={(e) => set({ successRedirectUrl: e.target.value })} />
          <Field label="Failure Redirect URL" type="url" value={a.failureRedirectUrl} onChange={(e) => set({ failureRedirectUrl: e.target.value })} />
        </div>
        <Field label="Redirect Time (in seconds)" type="number" min="0" value={a.redirectTime} onChange={(e) => set({ redirectTime: e.target.value })} />
      </Section>

      <Section title="OAuth 2.0 Credentials">
        <div className="grid-2">
          <Field label="Token URL" type="url" value={a.oauthTokenUrl} onChange={(e) => set({ oauthTokenUrl: e.target.value })} />
          <Field label="Scope" value={a.oauthScope} onChange={(e) => set({ oauthScope: e.target.value })} />
          <Field label="Client ID" value={a.oauthClientId} onChange={(e) => set({ oauthClientId: e.target.value })} />
          <Field label="Client Secret" type="password" autoComplete="off" value={a.oauthClientSecret} onChange={(e) => set({ oauthClientSecret: e.target.value })} />
        </div>
      </Section>

      <Section title="Default Contract Initiation Configuration">
        <h4 className="sub-heading">Customer mail list visibility</h4>
        <Pills
          options={[
            { value: 'CC', label: 'CC' },
            { value: 'BCC', label: 'BCC' },
          ]}
          value={a.mailVisibility}
          onChange={(v) => set({ mailVisibility: v })}
        />
        {a.mailVisibility && (
          <Field
            className="top-gap"
            label={`${a.mailVisibility} email addresses`}
            hint="Separate multiple addresses with commas"
            value={a.ccEmails}
            onChange={(e) => set({ ccEmails: e.target.value })}
          />
        )}
      </Section>

      <Section title="E-Sign Configuration" defaultOpen>
        <h4 className="sub-heading">Smart e-sign</h4>
        <Pills
          multiple
          options={[
            { value: 'upload', label: 'Upload' },
            { value: 'font', label: 'Font' },
            { value: 'draw', label: 'Draw' },
          ]}
          value={a.smartEsignModes}
          onChange={(v) => set({ smartEsignModes: v })}
        />
        <Field
          className="top-gap"
          label="Clickwrap consent text"
          hint="Customise text for Clickwrap"
          as="textarea"
          rows={2}
          value={a.clickwrapText}
          onChange={(e) => set({ clickwrapText: e.target.value })}
        />
        <Field label="Default Language">
          <select value={a.defaultLanguage} onChange={(e) => set({ defaultLanguage: e.target.value })}>
            <option value="">Select…</option>
            {LANGUAGES.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </Field>
      </Section>
    </div>
  )
}
