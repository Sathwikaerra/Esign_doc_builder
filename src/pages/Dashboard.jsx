import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { listContracts } from '../services/contractService'
import { CONTRACT_STATUS } from '../constants/contracts'
import { SIGNATURE_METHODS } from '../constants/workflow'
import { formatDateTime } from '../utils/format'
import { useAuth } from '../context/AuthContext'
import Icon from '../components/ui/Icon'
import { EmptyState, SortTh } from '../components/ui/Controls'
import AnimatedNumber from '../components/ui/AnimatedNumber'
import MethodIcon from '../components/signing/MethodIcon'
import { useToast } from '../components/ui/Toast'

const RANGES = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'last7', label: 'Last 7 Days' },
  { id: 'custom', label: 'Date Range' },
]

const DAY = 24 * 60 * 60 * 1000

function rangeBounds(range, custom) {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date()
  end.setHours(23, 59, 59, 999)
  if (range === 'yesterday') {
    start.setDate(start.getDate() - 1)
    end.setDate(end.getDate() - 1)
  } else if (range === 'last7') {
    start.setDate(start.getDate() - 6)
  } else if (range === 'custom' && custom.from && custom.to) {
    return [new Date(`${custom.from}T00:00:00`), new Date(`${custom.to}T23:59:59`)]
  }
  return [start, end]
}

// Contracts list reviewers with the signers; these numbers are about signing
const signersOf = (c) => c.signers.filter((s) => s.kind !== 'reviewer')
const inReview = (c) => c.signers.some((s) => s.kind === 'reviewer' && !s.signed)

// Status colours, shared by the donut, the legend and the contracts table
const STATUS_COLORS = { incomplete: '#f59e0b', completed: '#16a34a', declined: '#e11d48', expired: '#94a3b8', cancelled: '#64748b' }

const SORTERS = {
  name: (a, b) => a.name.localeCompare(b.name),
  createdAt: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
  expiresAt: (a, b) => new Date(a.expiresAt) - new Date(b.expiresAt),
}

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

// "in 3 days", "in 5 hours", "2 days ago"
function relative(date) {
  const diff = new Date(date) - Date.now()
  const abs = Math.abs(diff)
  const [n, unit] = abs >= DAY ? [Math.round(abs / DAY), 'day'] : [Math.max(1, Math.round(abs / 3600000)), 'hour']
  const text = `${n} ${unit}${n === 1 ? '' : 's'}`
  return diff >= 0 ? `in ${text}` : `${text} ago`
}

const initials = (name) =>
  name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

/*
 * Daily counts for the sparklines: one bucket per day of the range,
 * or the 7 days ending on the range's last day when the range is a single day.
 */
function dailyBuckets(contracts, [from, to], pick) {
  const days = Math.max(7, Math.round((to - from) / DAY))
  const first = new Date(to)
  first.setHours(0, 0, 0, 0)
  first.setDate(first.getDate() - (days - 1))
  const buckets = new Array(days).fill(0)
  for (const c of contracts) {
    if (!pick(c)) continue
    const i = Math.floor((new Date(c.createdAt) - first) / DAY)
    if (i >= 0 && i < days) buckets[i]++
  }
  return buckets
}

export default function Dashboard() {
  const toast = useToast()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [contracts, setContracts] = useState(null)
  const [range, setRange] = useState('last7')
  const [custom, setCustom] = useState({ from: '', to: '' })
  const [showCustom, setShowCustom] = useState(false)
  const [sort, setSort] = useState({ key: 'createdAt', dir: -1 })
  const [statusFilter, setStatusFilter] = useState('incomplete')

  useEffect(() => {
    listContracts()
      .then(setContracts)
      .catch((err) => {
        setContracts([])
        toast(err.message, 'error')
      })
  }, [])

  const bounds = useMemo(() => rangeBounds(range, custom), [range, custom])
  const inRange = useMemo(() => {
    if (!contracts) return []
    const [from, to] = bounds
    return contracts.filter((c) => {
      const t = new Date(c.createdAt)
      return t >= from && t <= to
    })
  }, [contracts, bounds])

  const count = (status) => inRange.filter((c) => c.status === status).length
  // Reviewers' approvals are not signatures
  const signatures = inRange.flatMap((c) => c.signers.filter((s) => s.signed && s.kind !== 'reviewer'))
  const listed = inRange.filter((c) => statusFilter === 'all' || c.status === statusFilter).sort((a, b) => SORTERS[sort.key](a, b) * sort.dir)
  const toggleSort = (key) => setSort((s) => ({ key, dir: s.key === key ? -s.dir : 1 }))

  // What needs attention right now, across all contracts (not just the selected range)
  const open = (contracts ?? []).filter((c) => c.status === 'incomplete')
  const expiringSoon = open.filter((c) => new Date(c.expiresAt) - Date.now() < 3 * DAY).length
  const reviewing = open.filter(inReview).length
  const completionRate = inRange.length ? Math.round((count('completed') / inRange.length) * 100) : 0

  const spark = (pick) => (contracts ? dailyBuckets(contracts, bounds, pick) : [])
  const stats = [
    { label: 'Total contracts', value: inRange.length, icon: 'contract', tone: 'violet', trend: spark(() => true) },
    { label: 'In progress', value: count('incomplete'), icon: 'hourglass', tone: 'amber', trend: spark((c) => c.status === 'incomplete') },
    { label: 'Completed', value: count('completed'), icon: 'checkCircle', tone: 'green', trend: spark((c) => c.status === 'completed') },
    { label: 'Expired', value: count('expired'), icon: 'alert', tone: 'rose', trend: spark((c) => c.status === 'expired') },
  ]

  const statusSlices = ['incomplete', 'completed', 'declined', 'expired', 'cancelled'].map((s) => ({
    id: s,
    label: CONTRACT_STATUS[s].label,
    value: count(s),
    color: STATUS_COLORS[s],
  }))
  const methodRows = SIGNATURE_METHODS.map((m) => ({ ...m, value: signatures.filter((s) => s.method === m.id).length }))
  const methodMax = Math.max(1, ...methodRows.map((m) => m.value))

  const pickRange = (id) => {
    if (id === 'custom') setShowCustom((s) => !s)
    else {
      setRange(id)
      setShowCustom(false)
    }
  }

  return (
    <div className="page dx">
      {/* Welcome banner */}
      <section className="dx-hero">
        <div className="dx-hero-text">
          <span className="dx-hero-eyebrow">
            <Icon name="calendar" size={14} /> {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
          <h1>
            {greeting()}, {user?.name?.split(' ')[0] || 'there'} 👋
          </h1>
          <p>
            {contracts
              ? open.length
                ? `${open.length} contract${open.length === 1 ? ' is' : 's are'} in progress${reviewing ? `, ${reviewing} waiting on reviewers` : ''}${
                    expiringSoon ? ` and ${expiringSoon} expiring in the next 3 days` : ''
                  }.`
                : 'Everything is signed. Nothing is waiting on anyone right now.'
              : 'Loading your contracts…'}
          </p>
          <div className="dx-hero-actions">
            <Link to="/workflows" className="btn dx-btn-light">
              <Icon name="send" size={16} /> Start a contract
            </Link>
            <Link to="/templates" className="btn dx-btn-ghost">
              <Icon name="template" size={16} /> Templates
            </Link>
          </div>
        </div>
        <div className="dx-hero-side">
          <div className="dx-ring">
            <svg viewBox="0 0 120 120" aria-hidden="true">
              <circle cx="60" cy="60" r="50" className="dx-ring-track" />
              <circle cx="60" cy="60" r="50" className="dx-ring-fill" pathLength="100" strokeDasharray={`${completionRate} 100`} />
            </svg>
            <div>
              <strong>{completionRate}%</strong>
              <span>completed</span>
            </div>
          </div>
          <div className="dx-range">
            {RANGES.map((r) => (
              <button key={r.id} className={range === r.id ? 'on' : ''} onClick={() => pickRange(r.id)}>
                {r.id === 'custom' && range === 'custom' && custom.from ? `${custom.from} → ${custom.to}` : r.label}
              </button>
            ))}
            {showCustom && (
              <div className="range-popover">
                <label>
                  From
                  <input type="date" value={custom.from} onChange={(e) => setCustom({ ...custom, from: e.target.value })} />
                </label>
                <label>
                  To
                  <input type="date" value={custom.to} min={custom.from} onChange={(e) => setCustom({ ...custom, to: e.target.value })} />
                </label>
                <button
                  className="btn primary sm"
                  disabled={!custom.from || !custom.to}
                  onClick={() => {
                    setRange('custom')
                    setShowCustom(false)
                  }}
                >
                  Apply
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Stat cards with a 7+ day trend line */}
      <section className="dx-stats">
        {stats.map((s, i) => (
          <div key={s.label} className={`dx-stat ${s.tone}`} style={{ '--i': i }}>
            <div className="dx-stat-top">
              <span className="dx-stat-icon">
                <Icon name={s.icon} size={20} />
              </span>
              <span className="dx-stat-label">{s.label}</span>
            </div>
            <strong>{contracts ? <AnimatedNumber value={s.value} /> : '–'}</strong>
            <Sparkline values={s.trend} />
          </div>
        ))}
      </section>

      {/* Charts */}
      <section className="dx-panels">
        <div className="dx-panel">
          <div className="dx-panel-head">
            <h3>Contract status</h3>
            <span className="muted small">{RANGES.find((r) => r.id === range)?.label}</span>
          </div>
          <div className="dx-donut-wrap">
            <Donut slices={statusSlices} total={inRange.length} />
            <ul className="dx-legend">
              {statusSlices.map((s) => (
                <li key={s.id}>
                  <button className={statusFilter === s.id ? 'on' : ''} onClick={() => setStatusFilter(s.id)}>
                    <span className="dx-dot" style={{ background: s.color }} />
                    {s.label}
                    <strong>{s.value}</strong>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="dx-panel">
          <div className="dx-panel-head">
            <h3>Signatures by method</h3>
            <span className="dx-total-chip">
              <Icon name="signature" size={14} /> {contracts ? signatures.length : '–'} total
            </span>
          </div>
          <ul className="dx-bars">
            {methodRows.map((m) => (
              <li key={m.id}>
                <MethodIcon method={m.id} size={26} />
                <div className="dx-bar-body">
                  <div className="dx-bar-label">
                    <span>{m.label}</span>
                    <strong>{m.value}</strong>
                  </div>
                  <div className="dx-bar-track">
                    <span style={{ width: `${(m.value / methodMax) * 100}%` }} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Contracts */}
      <section className="dx-contracts">
        <div className="dx-contracts-head">
          <h2>Contracts</h2>
          <div className="seg-tabs">
            {['incomplete', 'completed', 'declined', 'expired', 'cancelled', 'all'].map((s) => (
              <button key={s} className={statusFilter === s ? 'on' : ''} onClick={() => setStatusFilter(s)}>
                {s === 'all' ? 'All' : CONTRACT_STATUS[s].label}
                <span className="seg-count">{s === 'all' ? inRange.length : count(s)}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="card dx-table">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <SortTh label="Contract" k="name" sort={sort} onSort={toggleSort} />
                  <th>People</th>
                  <th>Progress</th>
                  <SortTh label="Created" k="createdAt" sort={sort} onSort={toggleSort} />
                  <SortTh label="Expires / completed" k="expiresAt" sort={sort} onSort={toggleSort} />
                  <th>eStamping</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {!contracts &&
                  [1, 2, 3].map((i) => (
                    <tr key={i} className="skeleton-row">
                      {Array.from({ length: 7 }, (_, j) => (
                        <td key={j}>
                          <span className="skeleton" />
                        </td>
                      ))}
                    </tr>
                  ))}
                {listed.map((c) => (
                  <ContractRow key={c.id} c={c} onOpen={() => navigate(`/contracts/${c.id}`)} />
                ))}
              </tbody>
            </table>
          </div>
          {contracts && listed.length === 0 && (
            <EmptyState
              title={statusFilter === 'all' ? 'No contracts' : `No ${CONTRACT_STATUS[statusFilter].label.toLowerCase()} contracts`}
              message="Contracts initiated in the selected period will appear here. Start one from the Workflows page."
            />
          )}
        </div>
      </section>
    </div>
  )
}

function ContractRow({ c, onOpen }) {
  const st = CONTRACT_STATUS[c.status] ?? { label: c.status, tone: 'grey' }
  const signers = signersOf(c)
  const signed = signers.filter((s) => s.signed).length
  const reviewing = c.status === 'incomplete' && inReview(c)
  const pct = signers.length ? Math.round((signed / signers.length) * 100) : 0
  const urgent = c.status === 'incomplete' && new Date(c.expiresAt) - Date.now() < 3 * DAY
  return (
    <tr className="row-link" style={{ '--c': STATUS_COLORS[c.status] ?? '#94a3b8' }} onClick={onOpen}>
      <td>
        <div className="dx-cell-name">
          <span className="dx-dot" />
          <div>
            <strong>{c.name}</strong>
            <span className="muted small mono">{c.id.slice(0, 12)}…</span>
          </div>
        </div>
      </td>
      <td>
        <div className="dx-row-people" title={c.signers.map((s) => `${s.name}${s.kind === 'reviewer' ? ' (reviewer)' : ''}`).join(', ')}>
          {c.signers.slice(0, 4).map((s) => (
            <span key={s.order} className={`dx-avatar ${s.signed ? 'done' : ''} ${s.kind === 'reviewer' ? 'rev' : ''}`}>
              {initials(s.name)}
            </span>
          ))}
          {c.signers.length > 4 && <span className="dx-avatar more">+{c.signers.length - 4}</span>}
        </div>
      </td>
      <td>
        <div className="dx-row-progress">
          <div className="dx-mini-track">
            <span style={{ width: `${c.status === 'completed' ? 100 : pct}%` }} />
          </div>
          <span className="muted small">{reviewing ? 'Waiting on review' : `${signed}/${signers.length} signed`}</span>
        </div>
      </td>
      <td className="nowrap">{formatDateTime(c.createdAt)}</td>
      <td className="nowrap">
        {c.status === 'incomplete' ? (
          <span className={urgent ? 'dx-urgent' : ''}>Expires {relative(c.expiresAt)}</span>
        ) : c.completedAt ? (
          formatDateTime(c.completedAt)
        ) : (
          <span className="muted">{formatDateTime(c.expiresAt)}</span>
        )}
      </td>
      <td>{c.estamping}</td>
      <td>
        <span className={`badge ${st.tone}`}>{reviewing ? 'In review' : st.label}</span>
      </td>
    </tr>
  )
}

// Small area chart of daily counts; flat when there is nothing to show
function Sparkline({ values }) {
  if (!values.length) return <div className="dx-spark" />
  const max = Math.max(1, ...values)
  const w = 120
  const h = 36
  const pts = values.map((v, i) => [(i / (values.length - 1)) * w, h - 3 - (v / max) * (h - 8)])
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  return (
    <svg className="dx-spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      <path d={`${line} L${w},${h} L0,${h} Z`} className="dx-spark-area" />
      <path d={line} className="dx-spark-line" />
    </svg>
  )
}

function Donut({ slices, total }) {
  const r = 52
  let offset = 0
  return (
    <div className="dx-donut">
      <svg viewBox="0 0 140 140" aria-hidden="true">
        <circle cx="70" cy="70" r={r} className="dx-donut-track" />
        {total > 0 &&
          slices
            .filter((s) => s.value)
            .map((s) => {
              const pct = (s.value / total) * 100
              const el = (
                <circle
                  key={s.id}
                  cx="70"
                  cy="70"
                  r={r}
                  pathLength="100"
                  stroke={s.color}
                  strokeDasharray={`${Math.max(0, pct - 1)} ${100 - Math.max(0, pct - 1)}`}
                  strokeDashoffset={-offset}
                  className="dx-donut-slice"
                />
              )
              offset += pct
              return el
            })}
      </svg>
      <div className="dx-donut-center">
        <strong>{total}</strong>
        <span>contracts</span>
      </div>
    </div>
  )
}
