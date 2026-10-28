import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  createApiKey,
  deleteWebhook,
  getWebhook,
  listApiKeys,
  listWebhookDeliveries,
  publicApiBase,
  revokeApiKey,
  rotateWebhookSecret,
  saveWebhook,
  testWebhook,
} from '../services/developerService'
import { listWorkflows } from '../services/workflowService'
import { formatDateTime } from '../utils/format'
import Icon from '../components/ui/Icon'
import { CopyButton, EmptyState, Field, PageTitle, Toggle } from '../components/ui/Controls'
import { Modal } from '../components/ui/Overlay'
import { useToast } from '../components/ui/Toast'

const EVENTS = ['created', 'invited', 'viewed', 'approved', 'signed', 'rejected', 'declined', 'completed', 'cancelled', 'reminded', 'link_reissued']

export default function Developers() {
  return (
    <div className="page">
      <PageTitle title="Developers" crumbs={['Settings', 'Developers']} />
      <p className="muted dev-intro">
        Let your own systems start contracts from a workflow with their own PDF and signers, get the signing links back, and hear about every
        signature through a webhook.
      </p>
      <QuickStart />
      <ApiKeys />
      <Webhook />
    </div>
  )
}

/* ---------------- Quick start ---------------- */

function QuickStart() {
  const [workflows, setWorkflows] = useState([])
  const [id, setId] = useState('')
  useEffect(() => {
    listWorkflows()
      .then((list) => {
        const active = list.filter((w) => w.status === 'active')
        setWorkflows(active)
        setId((cur) => cur || active[0]?.id || '')
      })
      .catch(() => {})
  }, [])

  const wf = workflows.find((w) => w.id === id)
  const body = useMemo(() => {
    const people = wf?.participants ?? []
    // Every person needs a different email, so number them across reviewers and signers
    let n = 0
    const person = (p) => {
      n += 1
      return { name: `${p.name || 'Person'} ${n}`, email: `person${n}@example.com`, phone: '9876543210' }
    }
    const reviewers = people.filter((p) => p.kind === 'reviewer').map(person)
    const signers = people.filter((p) => p.kind === 'signer').map(person)
    return {
      workflowId: wf?.id ?? '<workflow id>',
      name: 'Loan agreement - Ravi Kumar',
      externalRef: 'LOAN-1001',
      document: { fileName: 'loan-ravi.pdf', base64: '<PDF as base64>' },
      ...(reviewers.length ? { reviewers } : {}),
      signers: signers.length ? signers : [{ name: 'Ravi Kumar', email: 'ravi@example.com', phone: '9876543210' }],
      sendEmails: false,
    }
  }, [wf])
  const curl = `curl -X POST ${publicApiBase()}/contracts \\
  -H "X-API-Key: esk_your_key" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(body, null, 2)}'`

  return (
    <section className="card pad dev-card">
      <div className="dev-head">
        <span className="dev-icon">
          <Icon name="braces" size={18} />
        </span>
        <div>
          <h3>Start a contract from your system</h3>
          <p className="muted small">One workflow, any number of contracts: send a different PDF and different signers each time.</p>
        </div>
      </div>
      <div className="dev-quick">
        <Field label="Workflow">
          <select value={id} onChange={(e) => setId(e.target.value)}>
            {!workflows.length && <option value="">No active workflows yet</option>}
            {workflows.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </Field>
        {wf && (
          <div className="dev-wf-id">
            <span className="muted small">Workflow ID</span>
            <code>{wf.id}</code>
            <CopyButton text={wf.id} />
          </div>
        )}
      </div>
      <div className="dev-code">
        <div className="dev-code-bar">
          <span>POST /contracts</span>
          <CopyButton text={curl} />
        </div>
        <pre>{curl}</pre>
      </div>
      <ul className="dev-notes">
        <li>
          <strong>document</strong> is optional. Without it, the workflow&apos;s own PDF is used. A PDF you send must have the same layout,
          because signature boxes stay where the workflow put them.
        </li>
        <li>
          <strong>sendEmails: false</strong> returns a <code>signingLink</code> for every person, for you to send by SMS, WhatsApp or your app.
          Leave it out and we email the links as usual.
        </li>
        <li>
          <strong>externalRef</strong> is your own id. Sending the same one again returns <code>409</code> with the existing contract, so
          retries are safe.
        </li>
        <li>
          Also available: <code>GET /contracts/:id</code>, <code>GET /contracts/:id/document?format=base64</code>,{' '}
          <code>GET /contracts/:id/events</code>, <code>POST /contracts/:id/signers/:order/link</code>, <code>POST /contracts/:id/cancel</code>,{' '}
          <code>GET /workflows</code>.
        </li>
      </ul>
    </section>
  )
}

/* ---------------- API keys ---------------- */

function ApiKeys() {
  const toast = useToast()
  const [keys, setKeys] = useState(null)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [newKey, setNewKey] = useState(null)
  const [revoking, setRevoking] = useState(null)

  const load = useCallback(() => listApiKeys().then(setKeys, (err) => toast(err.message, 'error')), [toast])
  useEffect(() => {
    load()
  }, [load])

  async function create() {
    setBusy(true)
    try {
      const k = await createApiKey(name.trim())
      setCreating(false)
      setName('')
      setNewKey(k)
      load()
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  async function revoke() {
    setBusy(true)
    try {
      await revokeApiKey(revoking.id)
      toast(`Revoked "${revoking.name}"`, 'success')
      setRevoking(null)
      load()
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card dev-card">
      <div className="dev-head pad-x">
        <span className="dev-icon">
          <Icon name="key" size={18} />
        </span>
        <div>
          <h3>API keys</h3>
          <p className="muted small">
            Send a key in the <code>X-API-Key</code> header. Each key acts for this organisation; revoke it if it leaks.
          </p>
        </div>
        <button className="btn primary sm" onClick={() => setCreating(true)}>
          <Icon name="plus" size={15} /> Create key
        </button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Key</th>
              <th>Created</th>
              <th>Last used</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {keys === null &&
              [0, 1].map((i) => (
                <tr key={i}>
                  <td colSpan={6}>
                    <span className="skeleton" />
                  </td>
                </tr>
              ))}
            {keys?.map((k) => (
              <tr key={k.id} className={k.revokedAt ? 'dev-revoked' : ''}>
                <td className="strong">{k.name}</td>
                <td>
                  <code>{k.prefix}…</code>
                </td>
                <td>
                  {formatDateTime(k.createdAt)}
                  {k.createdBy && <div className="muted small">by {k.createdBy}</div>}
                </td>
                <td>{k.lastUsedAt ? formatDateTime(k.lastUsedAt) : <span className="muted">Never</span>}</td>
                <td>{k.revokedAt ? <span className="badge inactive">Revoked</span> : <span className="badge green">Active</span>}</td>
                <td className="actions">
                  {!k.revokedAt && (
                    <button className="link-btn dev-danger" onClick={() => setRevoking(k)}>
                      Revoke
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {keys?.length === 0 && <EmptyState title="No API keys yet" message="Create a key for each system that will call the API." />}
      </div>

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Create API key"
        subtitle="Name it after the system that will use it, so you know which key to revoke later."
        width={460}
        footer={
          <>
            <button className="btn" onClick={() => setCreating(false)}>
              Cancel
            </button>
            <button className="btn primary" disabled={!name.trim() || busy} onClick={create}>
              Create key
            </button>
          </>
        }
      >
        <Field label="Key name" required value={name} maxLength={100} autoFocus placeholder="e.g. Loan origination system" onChange={(e) => setName(e.target.value)} />
      </Modal>

      <Modal
        open={!!newKey}
        onClose={() => setNewKey(null)}
        title="Copy your new API key"
        subtitle="This is the only time it is shown. Store it in your system's secret settings."
        width={520}
        footer={
          <button className="btn primary" onClick={() => setNewKey(null)}>
            I&apos;ve copied it
          </button>
        }
      >
        <div className="dev-secret">
          <code>{newKey?.key}</code>
          <CopyButton text={newKey?.key ?? ''} onCopied={() => toast('Key copied', 'success')} />
        </div>
      </Modal>

      <Modal
        open={!!revoking}
        onClose={() => setRevoking(null)}
        title={`Revoke "${revoking?.name}"?`}
        subtitle="Calls using this key stop working immediately. This cannot be undone."
        width={460}
        footer={
          <>
            <button className="btn" onClick={() => setRevoking(null)}>
              Keep it
            </button>
            <button className="btn primary dev-danger-btn" disabled={busy} onClick={revoke}>
              Revoke key
            </button>
          </>
        }
      />
    </section>
  )
}

/* ---------------- Webhook ---------------- */

function Webhook() {
  const toast = useToast()
  const [hook, setHook] = useState(undefined)
  const [url, setUrl] = useState('')
  const [enabled, setEnabled] = useState(true)
  const [showSecret, setShowSecret] = useState(false)
  const [busy, setBusy] = useState(false)
  const [deliveries, setDeliveries] = useState([])

  const loadDeliveries = useCallback(() => listWebhookDeliveries().then(setDeliveries, () => {}), [])
  useEffect(() => {
    getWebhook().then(
      (h) => {
        setHook(h)
        setUrl(h?.url ?? '')
        setEnabled(h?.enabled ?? true)
      },
      (err) => toast(err.message, 'error'),
    )
    loadDeliveries()
  }, [toast, loadDeliveries])

  const run = async (fn, done) => {
    setBusy(true)
    try {
      const result = await fn()
      done?.(result)
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const save = () =>
    run(
      () => saveWebhook(url.trim(), enabled),
      (h) => {
        setHook(h)
        toast('Webhook saved', 'success')
      },
    )
  const test = () =>
    run(testWebhook, (r) => {
      toast(r.ok ? `Delivered: your endpoint answered ${r.status}` : `Not delivered: ${r.error}`, r.ok ? 'success' : 'error')
      loadDeliveries()
    })
  const rotate = () =>
    run(rotateWebhookSecret, (h) => {
      setHook(h)
      setShowSecret(true)
      toast('New secret created. Update it in your receiver.', 'success')
    })
  const remove = () =>
    run(deleteWebhook, () => {
      setHook(null)
      setUrl('')
      toast('Webhook removed', 'success')
    })

  const dirty = hook ? url.trim() !== hook.url || enabled !== hook.enabled : !!url.trim()

  return (
    <section className="card pad dev-card">
      <div className="dev-head">
        <span className="dev-icon">
          <Icon name="send" size={18} />
        </span>
        <div>
          <h3>Webhook</h3>
          <p className="muted small">We POST every contract event to this URL as JSON, retrying after 5 s and 30 s if it doesn&apos;t answer 2xx.</p>
        </div>
      </div>

      <div className="dev-hook-form">
        <Field label="Endpoint URL" value={url} placeholder="https://your-system.example.com/esign/webhook" onChange={(e) => setUrl(e.target.value)} />
        <Toggle checked={enabled} onChange={setEnabled} label="Enabled" />
        <button className="btn primary" disabled={busy || !url.trim() || !dirty} onClick={save}>
          Save
        </button>
      </div>

      {hook && (
        <>
          <div className="dev-secret-row">
            <span className="muted small">Signing secret</span>
            <div className="dev-secret">
              <code>{showSecret ? hook.secret : `${hook.secret.slice(0, 10)}${'•'.repeat(12)}`}</code>
              <button className="icon-btn tiny" onClick={() => setShowSecret((v) => !v)} title={showSecret ? 'Hide' : 'Show'}>
                <Icon name={showSecret ? 'eyeOff' : 'eye'} size={14} />
              </button>
              <CopyButton text={hook.secret} onCopied={() => toast('Secret copied', 'success')} />
            </div>
            <div className="dev-hook-actions">
              <button className="btn sm" disabled={busy} onClick={test}>
                <Icon name="send" size={14} /> Send test
              </button>
              <button className="btn sm" disabled={busy} onClick={rotate}>
                <Icon name="refresh" size={14} /> New secret
              </button>
              <button className="btn sm dev-danger" disabled={busy} onClick={remove}>
                <Icon name="trash" size={14} /> Remove
              </button>
            </div>
          </div>
          <details className="dev-details">
            <summary>How to check a delivery is really from us</summary>
            <p className="small">
              Every request has <code>X-Esign-Timestamp</code> and <code>X-Esign-Signature</code>. Compute HMAC-SHA256 of{' '}
              <code>{'`${timestamp}.${rawBody}`'}</code> with the secret above; the header must equal <code>sha256=</code> followed by the hex
              digest. Reject old timestamps to stop replays.
            </p>
            <p className="small">
              Events:{' '}
              {EVENTS.map((e) => (
                <code key={e} className="dev-event">
                  {e}
                </code>
              ))}
              . Each body has <code>event</code>,{' '}
              <code>contract</code> (with your <code>externalRef</code> and <code>status</code>) and <code>signer</code>.
            </p>
          </details>
        </>
      )}

      <div className="dev-deliveries">
        <div className="row-between">
          <h4>Recent deliveries</h4>
          <button className="icon-btn tiny" onClick={loadDeliveries} title="Refresh">
            <Icon name="refresh" size={15} />
          </button>
        </div>
        {deliveries.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Contract</th>
                  <th>Result</th>
                  <th>Attempts</th>
                  <th>Sent</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <code>{d.event}</code>
                    </td>
                    <td>{d.contractId ? <Link to={`/contracts/${d.contractId}`}>{d.contractName ?? d.contractId}</Link> : <span className="muted">—</span>}</td>
                    <td>
                      {d.deliveredAt ? (
                        <span className="badge green">{d.statusCode}</span>
                      ) : d.attempts ? (
                        <span className="badge dev-fail" title={d.error ?? ''}>
                          {d.statusCode ?? 'Failed'}
                        </span>
                      ) : (
                        <span className="badge yellow">Sending</span>
                      )}
                      {!d.deliveredAt && d.error && <div className="muted small">{d.error}</div>}
                    </td>
                    <td>{d.attempts}</td>
                    <td className="nowrap">{formatDateTime(d.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted small">Nothing sent yet.</p>
        )}
      </div>
    </section>
  )
}
