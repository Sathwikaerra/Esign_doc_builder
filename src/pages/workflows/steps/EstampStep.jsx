import { STATES } from '../../../constants/workflow'
import Icon from '../../../components/ui/Icon'
import { Field, Pills } from '../../../components/ui/Controls'

export default function EstampStep({ draft, update, showErrors }) {
  const method = draft.basic.stampingMethod
  const e = draft.estamp
  const set = (patch) => update('estamp', patch)
  const err = (v) => (showErrors && !v ? 'Required' : '')

  if (!method) {
    return (
      <div className="card pad info-card">
        <Icon name="info" size={22} />
        <div>
          <h3>No stamping method selected</h3>
          <p className="muted">
            Stamping is optional. To add eStamp details, go back to <b>Basic</b> and choose a Method of Stamping. Otherwise, proceed to Signee Info.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="card pad form-card">
      <h3 className="form-heading">
        eStamp Details <span className="badge soft">{method}</span>
      </h3>
      <div className="grid-2">
        <Field label="State" required error={err(e.state)}>
          <select value={e.state} onChange={(ev) => set({ state: ev.target.value })}>
            <option value="">Select state…</option>
            {STATES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="Article / Document Type" required error={err(e.article)} value={e.article} onChange={(ev) => set({ article: ev.target.value })} placeholder="e.g. Article 5 – Agreement" />
        <Field label="Stamp Duty Amount (₹)" required type="number" min="0" error={err(e.stampDutyAmount)} value={e.stampDutyAmount} onChange={(ev) => set({ stampDutyAmount: ev.target.value })} />
        <Field label="Consideration Amount (₹)" type="number" min="0" value={e.considerationAmount} onChange={(ev) => set({ considerationAmount: ev.target.value })} />
        <Field label="First Party Name" required error={err(e.firstParty)} value={e.firstParty} onChange={(ev) => set({ firstParty: ev.target.value })} />
        <Field label="Second Party Name" value={e.secondParty} onChange={(ev) => set({ secondParty: ev.target.value })} />
      </div>
      <h4 className="sub-heading">Stamp duty paid by</h4>
      <Pills
        options={[
          { value: 'first', label: 'First Party' },
          { value: 'second', label: 'Second Party' },
        ]}
        value={e.paidBy}
        onChange={(v) => v && set({ paidBy: v })}
      />
      <Field className="top-gap" label="Description" as="textarea" rows={3} value={e.description} onChange={(ev) => set({ description: ev.target.value })} />
    </div>
  )
}
