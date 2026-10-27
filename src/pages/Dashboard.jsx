import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listContracts } from '../services/contractService'
import { CONTRACT_STATUS } from '../constants/contracts'
import { formatDateTime } from '../utils/format'
import Icon from '../components/ui/Icon'
import { EmptyState, SortTh } from '../components/ui/Controls'
import AnimatedNumber from '../components/ui/AnimatedNumber'
import { useToast } from '../components/ui/Toast'

const RANGES = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'last7', label: 'Last 7 Days' },
  { id: 'custom', label: 'Select Date Range' },
]

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

// Contracts list reviewers with the signers; these columns are about signing
const signersOf = (c) => c.signers.filter((s) => s.kind !== 'reviewer')

const SORTERS = {
  name: (a, b) => a.name.localeCompare(b.name),
  createdAt: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
  expiresAt: (a, b) => new Date(a.expiresAt) - new Date(b.expiresAt),
}

export default function Dashboard() {
  const toast = useToast()
  const [contracts, setContracts] = useState(null)
  const [range, setRange] = useState('last7')
  const [custom, setCustom] = useState({ from: '', to: '' })
  const [showCustom, setShowCustom] = useState(false)
  const [sort, setSort] = useState({ key: 'createdAt', dir: -1 })
  const [statusFilter, setStatusFilter] = useState('incomplete')
  const navigate = useNavigate()

  useEffect(() => {
    listContracts()
      .then(setContracts)
      .catch((err) => {
        setContracts([])
        toast(err.message, 'error')
      })
  }, [])

  const inRange = useMemo(() => {
    if (!contracts) return []
    const [from, to] = rangeBounds(range, custom)
    return contracts.filter((c) => {
      const t = new Date(c.createdAt)
      return t >= from && t <= to
    })
  }, [contracts, range, custom])

  const count = (status) => inRange.filter((c) => c.status === status).length
  // Reviewers' approvals are not signatures
  const signatures = inRange.flatMap((c) => c.signers.filter((s) => s.signed && s.kind !== 'reviewer'))
  const sigCount = (method) => signatures.filter((s) => s.method === method).length

  const listed = inRange
    .filter((c) => statusFilter === 'all' || c.status === statusFilter)
    .sort((a, b) => SORTERS[sort.key](a, b) * sort.dir)

  const toggleSort = (key) => setSort((s) => ({ key, dir: s.key === key ? -s.dir : 1 }))

  const stats = [
    { label: 'Total Contracts', value: inRange.length, icon: 'contract', tone: 'neutral' },
    { label: 'Incomplete Contracts', value: count('incomplete'), icon: 'hourglass', tone: 'yellow' },
    { label: 'Completed Contracts', value: count('completed'), icon: 'checkCircle', tone: 'green' },
    { label: 'Expired Contracts', value: count('expired'), icon: 'alert', tone: 'red' },
  ]

  return (
    <div className="page">
      <div className="dash-head">
        <h1>
          <span className="grad-text">Hi, Welcome Back</span> 👋
        </h1>
        <div className="range-tabs">
          {RANGES.map((r) => (
            <button
              key={r.id}
              className={range === r.id ? 'on' : ''}
              onClick={() => {
                if (r.id === 'custom') setShowCustom((s) => !s)
                else {
                  setRange(r.id)
                  setShowCustom(false)
                }
              }}
            >
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

      <div className="stat-grid">
        {stats.map((s) => (
          <div key={s.label} className={`stat-card ${s.tone}`}>
            <span className="stat-icon">
              <Icon name={s.icon} size={22} />
            </span>
            <div>
              <strong>{contracts ? <AnimatedNumber value={s.value} /> : '–'}</strong>
              <span>{s.label}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="esign-card">
        <div className="esign-total">
          <span className="stat-icon">
            <Icon name="signature" size={22} />
          </span>
          <div>
            <strong>{contracts ? <AnimatedNumber value={signatures.length} /> : '–'}</strong>
            <span>Total E-Signatures</span>
          </div>
        </div>
        <div>
          <strong>{contracts ? <AnimatedNumber value={sigCount('AADHAAR_OTP')} /> : '–'}</strong>
          <span>Aadhaar E Signature - OTP</span>
        </div>
        <div>
          <strong>{contracts ? <AnimatedNumber value={sigCount('AADHAAR_FINGERPRINT')} /> : '–'}</strong>
          <span>Aadhaar E-Signature - Fingerprint</span>
        </div>
        <div>
          <strong>{contracts ? <AnimatedNumber value={sigCount('AADHAAR_FACE')} /> : '–'}</strong>
          <span>Aadhaar E Signature - Face Auth</span>
        </div>
      </div>

      <div className="contracts-head">
        <h2 className="section-title">Contracts</h2>
        <div className="seg-tabs">
          {['incomplete', 'completed', 'declined', 'expired', 'cancelled', 'all'].map((s) => (
            <button key={s} className={statusFilter === s ? 'on' : ''} onClick={() => setStatusFilter(s)}>
              {s === 'all' ? 'All' : CONTRACT_STATUS[s].label}
              <span className="seg-count">{s === 'all' ? inRange.length : count(s)}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Contract ID</th>
                <SortTh label="Contract Name" k="name" sort={sort} onSort={toggleSort} />
                <SortTh label="Created At" k="createdAt" sort={sort} onSort={toggleSort} />
                <SortTh label="Expires At" k="expiresAt" sort={sort} onSort={toggleSort} />
                <th>eStamping</th>
                <th>No. of Signers</th>
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
              {listed.map((c) => {
                const st = CONTRACT_STATUS[c.status] ?? { label: c.status, tone: 'grey' }
                return (
                  <tr key={c.id} className="row-link" onClick={() => navigate(`/contracts/${c.id}`)}>
                    <td className="mono">{c.id.slice(0, 12)}…</td>
                    <td className="strong">{c.name}</td>
                    <td>{formatDateTime(c.createdAt)}</td>
                    <td>{formatDateTime(c.expiresAt)}</td>
                    <td>{c.estamping}</td>
                    <td>{signersOf(c).length}</td>
                    <td>
                      <span className={`badge ${st.tone}`}>
                        {c.status !== 'incomplete'
                          ? st.label
                          : c.signers.some((s) => s.kind === 'reviewer' && !s.signed)
                            ? 'In review'
                            : `${signersOf(c).filter((s) => s.signed).length}/${signersOf(c).length} signed`}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {contracts && listed.length === 0 && (
          <EmptyState
            title={statusFilter === 'all' ? 'No contracts' : `No ${CONTRACT_STATUS[statusFilter].label.toLowerCase()} contracts`}
            message="Contracts initiated in the selected period will appear here. Initiate one from the Workflows page."
          />
        )}
      </div>
    </div>
  )
}
