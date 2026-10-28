// Colourful icons for the signature methods (More Options and the template form).
// Aadhaar methods share a saffron sun badge; the drawings are our own, not the UIDAI logo.

const Sun = ({ x = 22, y = 8 }) => (
  <g transform={`translate(${x} ${y})`}>
    {Array.from({ length: 8 }, (_, i) => (
      <rect key={i} x="-0.8" y="-6" width="1.6" height="3" rx="0.8" fill="#f59e0b" transform={`rotate(${i * 45})`} />
    ))}
    <circle r="2.8" fill="#ef4444" />
    <circle r="1.2" fill="#fde68a" />
  </g>
)

const ICONS = {
  AADHAAR_OTP: (
    <>
      <rect x="6" y="3" width="15" height="26" rx="3.5" fill="#4f46e5" />
      <rect x="8" y="7" width="11" height="17" rx="1.5" fill="#eef2ff" />
      {[10, 13.5, 17].map((cx, i) => (
        <circle key={cx} cx={cx} cy="15.5" r="1.4" fill={['#22c55e', '#f59e0b', '#ef4444'][i]} />
      ))}
      <rect x="11" y="26" width="5" height="1.4" rx="0.7" fill="#c7d2fe" />
      <Sun x={24} y={8} />
    </>
  ),
  AADHAAR_FINGERPRINT: (
    <>
      <defs>
        <linearGradient id="mi-fp" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f97316" />
          <stop offset="1" stopColor="#dc2626" />
        </linearGradient>
      </defs>
      <g fill="none" stroke="url(#mi-fp)" strokeWidth="1.8" strokeLinecap="round">
        <path d="M7 14a8 8 0 0 1 16 0v3" />
        <path d="M10 15a5 5 0 0 1 10 0v4c0 2-.5 4-1.5 6" />
        <path d="M13 15a2 2 0 0 1 4 0v4c0 3-1 6-3 8" />
        <path d="M10 19v1c0 2 .5 4 1.5 6" />
        <path d="M7 18v1c0 2 .4 3.5 1 5" />
      </g>
      <Sun x={25} y={7} />
    </>
  ),
  AADHAAR_FACE: (
    <>
      <g fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round">
        <path d="M4 10V6a2 2 0 0 1 2-2h4M22 4h4a2 2 0 0 1 2 2v4M28 22v4a2 2 0 0 1-2 2h-4M10 28H6a2 2 0 0 1-2-2v-4" />
      </g>
      <circle cx="16" cy="14" r="5" fill="#fbbf24" />
      <path d="M8.5 25c1-4 4-6 7.5-6s6.5 2 7.5 6" fill="#f97316" />
      <circle cx="14.2" cy="13.5" r="0.8" fill="#78350f" />
      <circle cx="17.8" cy="13.5" r="0.8" fill="#78350f" />
      <Sun x={26} y={7} />
    </>
  ),
  CLICKWRAP: (
    <>
      <circle cx="16" cy="16" r="12" fill="#3b82f6" />
      <circle cx="16" cy="16" r="12" fill="none" stroke="#93c5fd" strokeWidth="2" />
      <path d="M10.5 16.5l3.6 3.6 7.4-7.6" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  SMART_ESIGN: (
    <>
      <path d="M3 22c3-6 5-10 7-10s-1 9 2 9 4-8 6-8-1 7 2 7 4-3 6-4" fill="none" stroke="#0d9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="3" y="26" width="26" height="1.6" rx="0.8" fill="#99f6e4" />
      <g transform="rotate(40 24 8)">
        <rect x="21.5" y="1" width="5" height="12" rx="1.2" fill="#8b5cf6" />
        <path d="M21.5 13h5l-2.5 4z" fill="#f59e0b" />
      </g>
    </>
  ),
  DSC_TOKEN: (
    <>
      <g transform="rotate(-40 16 16)">
        <rect x="10" y="9" width="12" height="17" rx="2.5" fill="#475569" />
        <rect x="12" y="2" width="8" height="8" rx="1" fill="#cbd5e1" />
        <rect x="13.5" y="4" width="1.6" height="2.4" fill="#64748b" />
        <rect x="16.9" y="4" width="1.6" height="2.4" fill="#64748b" />
        <circle cx="16" cy="19" r="3.2" fill="#facc15" />
        <rect x="15.3" y="20" width="1.4" height="4" rx="0.7" fill="#facc15" />
        <circle cx="16" cy="19" r="1.1" fill="#475569" />
      </g>
    </>
  ),
}

export default function MethodIcon({ method, size = 30 }) {
  const art = ICONS[method]
  if (!art) return null
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="method-icon">
      {art}
    </svg>
  )
}
