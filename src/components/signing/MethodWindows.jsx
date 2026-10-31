import { useEffect, useRef, useState } from 'react'
import { Modal } from '../ui/Overlay'
import Icon from '../ui/Icon'
import MethodIcon from './MethodIcon'
import { Spinner } from '../auth/AuthLayout'
import { SIGNATURE_METHODS } from '../../constants/workflow'
import { completeVerification, startVerification } from '../../services/signingService'

/*
 * One window per signing method. Each runs that method's identity check and then calls
 * onVerified({ method, challengeId?, acceptedName?, summary, stamp? }):
 *   CLICKWRAP            type your name and accept
 *   SMART_ESIGN          code emailed to the signer
 *   AADHAAR_OTP          Aadhaar number, then the OTP sent to the Aadhaar-linked mobile
 *   AADHAAR_FINGERPRINT  Aadhaar number, then a fingerprint scan
 *   AADHAAR_FACE         Aadhaar number, then a live photo from the camera
 *   DSC_TOKEN            pick the certificate on the USB token, then its PIN
 * Every method except Smart eSign produces its own signature stamp; Smart eSign signers draw or type one.
 */

export const methodLabel = (id) => SIGNATURE_METHODS.find((m) => m.id === id)?.label ?? id
export const usesStamp = (method) => method !== 'SMART_ESIGN'

// A signature appearance like the ones eSign providers print: who, how, and when
export function makeStamp({ heading, name, detail }) {
  const ratio = 2
  const W = 420
  const H = 130
  const canvas = document.createElement('canvas')
  canvas.width = W * ratio
  canvas.height = H * ratio
  const ctx = canvas.getContext('2d')
  ctx.scale(ratio, ratio)
  ctx.strokeStyle = '#1e2a78'
  ctx.lineWidth = 1.5
  ctx.strokeRect(1, 1, W - 2, H - 2)
  ctx.fillStyle = '#16a34a'
  ctx.font = 'bold 26px Segoe UI, Arial, sans-serif'
  ctx.fillText('✓', W - 38, 34)
  ctx.fillStyle = '#5b5f7a'
  ctx.font = '13px Segoe UI, Arial, sans-serif'
  ctx.fillText(heading, 14, 24)
  ctx.fillStyle = '#1e2a78'
  ctx.font = 'bold 22px Segoe UI, Arial, sans-serif'
  ctx.fillText(name.slice(0, 32), 14, 58)
  ctx.fillStyle = '#5b5f7a'
  ctx.font = '12.5px Segoe UI, Arial, sans-serif'
  ctx.fillText(detail.slice(0, 60), 14, 86)
  ctx.fillText(`Date: ${new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}`, 14, 110)
  return canvas.toDataURL('image/png')
}

function WindowShell({ open, onClose, method, subtitle, children, footer }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      width={520}
      title={
        <span className="mw-title">
          <MethodIcon method={method} size={28} /> {methodLabel(method)}
        </span>
      }
      subtitle={subtitle}
      footer={footer}
    >
      {children}
    </Modal>
  )
}

function SandboxNote({ children }) {
  return (
    <div className="mw-sandbox">
      <Icon name="info" size={15} />
      <span>
        <b>Test mode.</b> {children}
      </span>
    </div>
  )
}

function Busy({ busy, children }) {
  return busy ? (
    <>
      <Spinner /> Please wait…
    </>
  ) : (
    children
  )
}

const fmtAadhaar = (v) =>
  v
    .replace(/\D/g, '')
    .slice(0, 12)
    .replace(/(\d{4})(?=\d)/g, '$1 ')

function AadhaarStep({ busy, onSubmit, action }) {
  const [number, setNumber] = useState('')
  const [consent, setConsent] = useState(false)
  const digits = number.replace(/\D/g, '')
  return (
    <form
      className="mw-form"
      onSubmit={(e) => {
        e.preventDefault()
        if (digits.length === 12 && consent) onSubmit(digits)
      }}
    >
      <label className="field">
        <span className="field-label">Aadhaar number</span>
        <input
          className="mw-aadhaar"
          inputMode="numeric"
          autoComplete="off"
          placeholder="XXXX XXXX XXXX"
          value={number}
          onChange={(e) => setNumber(fmtAadhaar(e.target.value))}
          autoFocus
        />
      </label>
      <label className="sign-consent">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>
          I consent to using my Aadhaar number for authentication with UIDAI, only to eSign this document. My Aadhaar number is not stored; only its last 4 digits
          appear on the signature.
        </span>
      </label>
      <button className="btn primary block" disabled={digits.length !== 12 || !consent || busy}>
        <Busy busy={busy}>{action}</Busy>
      </button>
    </form>
  )
}

function OtpStep({ sentTo, testCode, busy, onSubmit, onResend }) {
  const [code, setCode] = useState('')
  return (
    <form
      className="mw-form"
      onSubmit={(e) => {
        e.preventDefault()
        if (code.length === 6) onSubmit(code)
      }}
    >
      <p className="mw-lead">
        Enter the 6-digit code sent to <b>{sentTo}</b>.
      </p>
      <input
        className="mw-otp"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        placeholder="••••••"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
        autoFocus
      />
      {testCode && (
        <SandboxNote>
          No SMS is sent. Your test OTP is <b className="mw-code">{testCode}</b> (also printed in the server console).
        </SandboxNote>
      )}
      <button className="btn primary block" disabled={code.length !== 6 || busy}>
        <Busy busy={busy}>Verify code</Busy>
      </button>
      <button type="button" className="btn ghost block" onClick={onResend} disabled={busy}>
        Send a new code
      </button>
    </form>
  )
}

/* ---------- Clickwrap ---------- */

function ClickwrapWindow({ open, onClose, me, contract, onVerified }) {
  const [name, setName] = useState('')
  const [agree, setAgree] = useState(false)
  const ok = name.trim().length >= 2 && agree
  const accept = () =>
    onVerified({
      method: 'CLICKWRAP',
      acceptedName: name.trim(),
      summary: `Accepted as ${name.trim()}`,
      stamp: makeStamp({ heading: 'Accepted electronically (Clickwrap)', name: name.trim(), detail: me.email }),
    })
  return (
    <WindowShell
      open={open}
      onClose={onClose}
      method="CLICKWRAP"
      subtitle="Accept the document by typing your name and clicking I agree."
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" disabled={!ok} onClick={accept}>
            <Icon name="check" size={16} /> I agree
          </button>
        </>
      }
    >
      <div className="mw-terms">
        <p>
          By clicking <b>I agree</b> you confirm that you have read <b>{contract.name}</b>, that you accept its terms, and that clicking is your electronic
          signature, as valid as signing on paper.
        </p>
        <p>Your name, email, IP address, device and the time are recorded with your acceptance.</p>
      </div>
      <label className="field">
        <span className="field-label">Type your full name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={me.name} autoFocus />
      </label>
      <label className="sign-consent mw-gap">
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
        <span>I have read the document and agree to its terms.</span>
      </label>
    </WindowShell>
  )
}

/* ---------- Smart eSign (email OTP) ---------- */

function SmartEsignWindow({ open, onClose, token, me, onVerified, onError }) {
  const [sent, setSent] = useState(null)
  const [busy, setBusy] = useState(false)
  const send = async () => {
    setBusy(true)
    try {
      setSent(await startVerification(token, { method: 'SMART_ESIGN' }))
    } catch (err) {
      onError(err.message)
    } finally {
      setBusy(false)
    }
  }
  const verify = async (code) => {
    setBusy(true)
    try {
      await completeVerification(token, { challengeId: sent.challengeId, code })
      onVerified({ method: 'SMART_ESIGN', challengeId: sent.challengeId, summary: `Code sent to ${sent.sentTo} verified` })
    } catch (err) {
      onError(err.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <WindowShell open={open} onClose={onClose} method="SMART_ESIGN" subtitle="Confirm it is you with a one-time code, then add your signature.">
      {!sent ? (
        <div className="mw-form">
          <div className="mw-device">
            <Icon name="mail" size={22} />
            <div>
              <b>{me.email}</b>
              <span className="muted small">We will email a 6-digit code to this address.</span>
            </div>
          </div>
          <button className="btn primary block" onClick={send} disabled={busy}>
            <Busy busy={busy}>Send code</Busy>
          </button>
        </div>
      ) : (
        <OtpStep sentTo={sent.sentTo} busy={busy} onSubmit={verify} onResend={send} />
      )}
    </WindowShell>
  )
}

/* ---------- Aadhaar OTP ---------- */

function AadhaarOtpWindow({ open, onClose, token, me, sandbox, onVerified, onError }) {
  const [sent, setSent] = useState(null)
  const [aadhaar, setAadhaar] = useState('')
  const [busy, setBusy] = useState(false)
  const send = async (number = aadhaar) => {
    setBusy(true)
    try {
      setSent(await startVerification(token, { method: 'AADHAAR_OTP', aadhaar: number, consent: true }))
      setAadhaar(number)
    } catch (err) {
      onError(err.message)
    } finally {
      setBusy(false)
    }
  }
  const verify = async (code) => {
    setBusy(true)
    try {
      const r = await completeVerification(token, { challengeId: sent.challengeId, code })
      onVerified({
        method: 'AADHAAR_OTP',
        challengeId: sent.challengeId,
        summary: `Aadhaar ${r.aadhaar} verified with OTP`,
        stamp: makeStamp({ heading: 'Digitally signed using Aadhaar eSign (OTP)', name: me.name, detail: `Aadhaar ${r.aadhaar}` }),
      })
    } catch (err) {
      onError(err.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <WindowShell open={open} onClose={onClose} method="AADHAAR_OTP" subtitle="Sign with the OTP that UIDAI sends to the mobile number linked to your Aadhaar.">
      {sandbox && !sent && <SandboxNote>Not connected to UIDAI yet. Use any valid Aadhaar number; the OTP is shown on screen.</SandboxNote>}
      {!sent ? <AadhaarStep busy={busy} onSubmit={send} action="Send OTP" /> : <OtpStep sentTo={sent.sentTo} testCode={sent.testCode} busy={busy} onSubmit={verify} onResend={() => send()} />}
    </WindowShell>
  )
}

/* ---------- Aadhaar fingerprint ---------- */

function FingerprintWindow({ open, onClose, token, me, sandbox, onVerified, onError }) {
  const [started, setStarted] = useState(null)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const start = async (aadhaar) => {
    setBusy(true)
    try {
      setStarted(await startVerification(token, { method: 'AADHAAR_FINGERPRINT', aadhaar, consent: true }))
    } catch (err) {
      onError(err.message)
    } finally {
      setBusy(false)
    }
  }
  const scan = async () => {
    setBusy(true)
    // Imitates the scanner's capture progress; a real RD service returns the encrypted PID block here
    for (let p = 0; p <= 100; p += 10) {
      setProgress(p)
      await new Promise((r) => setTimeout(r, 120))
    }
    try {
      const r = await completeVerification(token, { challengeId: started.challengeId, capture: { quality: 70 + Math.round(Math.random() * 25) } })
      onVerified({
        method: 'AADHAAR_FINGERPRINT',
        challengeId: started.challengeId,
        summary: `Aadhaar ${r.aadhaar} verified with fingerprint`,
        stamp: makeStamp({ heading: 'Digitally signed using Aadhaar eSign (Biometric)', name: me.name, detail: `Aadhaar ${r.aadhaar} · fingerprint` }),
      })
    } catch (err) {
      setProgress(0)
      onError(err.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <WindowShell open={open} onClose={onClose} method="AADHAAR_FINGERPRINT" subtitle="Sign by scanning your fingerprint on a UIDAI-registered scanner.">
      {sandbox && <SandboxNote>No scanner is connected. The scan below is simulated and accepted.</SandboxNote>}
      {!started ? (
        <AadhaarStep busy={busy} onSubmit={start} action="Continue to scanner" />
      ) : (
        <div className="mw-form">
          <div className="mw-device">
            <Icon name="fingerprint" size={22} />
            <div>
              <b>{sandbox ? 'Sandbox scanner' : 'Biometric scanner'}</b>
              <span className="muted small">For Aadhaar {started.aadhaar}. Place your finger flat on the scanner.</span>
            </div>
          </div>
          <div className={`mw-scan ${busy ? 'scanning' : ''}`}>
            <Icon name="fingerprint" size={64} />
            <div className="mw-scan-bar" style={{ width: `${progress}%` }} />
          </div>
          <button className="btn primary block" onClick={scan} disabled={busy}>
            <Busy busy={busy}>Capture fingerprint</Busy>
          </button>
        </div>
      )}
    </WindowShell>
  )
}

/* ---------- Aadhaar face ---------- */

function FaceWindow({ open, onClose, token, me, sandbox, onVerified, onError }) {
  const [started, setStarted] = useState(null)
  const [busy, setBusy] = useState(false)
  const [photo, setPhoto] = useState(null)
  const [cameraError, setCameraError] = useState('')
  const video = useRef(null)
  const stream = useRef(null)

  const stop = () => {
    stream.current?.getTracks().forEach((t) => t.stop())
    stream.current = null
  }
  useEffect(() => stop, [])
  useEffect(() => {
    if (!open) stop()
  }, [open])

  // The video element comes and goes (Retake), so the stream is attached whenever it mounts
  const attachVideo = (el) => {
    video.current = el
    if (el && stream.current && el.srcObject !== stream.current) el.srcObject = stream.current
  }
  const openCamera = async () => {
    setCameraError('')
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 }, audio: false })
      if (video.current) video.current.srcObject = stream.current
    } catch {
      setCameraError('Allow camera access in your browser to continue. Face authentication needs a live photo.')
    }
  }
  const start = async (aadhaar) => {
    setBusy(true)
    try {
      setStarted(await startVerification(token, { method: 'AADHAAR_FACE', aadhaar, consent: true }))
      setTimeout(openCamera, 0)
    } catch (err) {
      onError(err.message)
    } finally {
      setBusy(false)
    }
  }
  const capture = () => {
    const v = video.current
    if (!v?.videoWidth) return
    const c = document.createElement('canvas')
    c.width = 320
    c.height = Math.round((320 * v.videoHeight) / v.videoWidth)
    c.getContext('2d').drawImage(v, 0, 0, c.width, c.height)
    setPhoto(c.toDataURL('image/jpeg', 0.75))
  }
  const verify = async () => {
    setBusy(true)
    try {
      const r = await completeVerification(token, { challengeId: started.challengeId, capture: { photo } })
      stop()
      onVerified({
        method: 'AADHAAR_FACE',
        challengeId: started.challengeId,
        summary: `Aadhaar ${r.aadhaar} verified with face authentication`,
        stamp: makeStamp({ heading: 'Digitally signed using Aadhaar eSign (Face Auth)', name: me.name, detail: `Aadhaar ${r.aadhaar} · face` }),
      })
    } catch (err) {
      onError(err.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <WindowShell open={open} onClose={onClose} method="AADHAAR_FACE" subtitle="Sign by matching a live photo of your face with your Aadhaar record.">
      {sandbox && <SandboxNote>Not connected to UIDAI. Your photo is kept with the audit record but is not matched against Aadhaar.</SandboxNote>}
      {!started ? (
        <AadhaarStep busy={busy} onSubmit={start} action="Continue to camera" />
      ) : (
        <div className="mw-form">
          <div className="mw-camera">
            {photo ? <img src={photo} alt="Your photo" /> : <video ref={attachVideo} autoPlay playsInline muted />}
            {!photo && <div className="mw-face-guide" />}
          </div>
          {cameraError && <p className="mw-error">{cameraError}</p>}
          {cameraError && (
            <button className="btn block" onClick={openCamera}>
              Try the camera again
            </button>
          )}
          {!photo ? (
            <button className="btn primary block" onClick={capture} disabled={!!cameraError}>
              <Icon name="face" size={16} /> Take photo
            </button>
          ) : (
            <>
              <button className="btn primary block" onClick={verify} disabled={busy}>
                <Busy busy={busy}>Use this photo</Busy>
              </button>
              <button
                className="btn ghost block"
                onClick={() => setPhoto(null)}
                disabled={busy}
              >
                Retake
              </button>
            </>
          )}
        </div>
      )}
    </WindowShell>
  )
}

/* ---------- DSC token ---------- */

function DscWindow({ open, onClose, token, sandbox, onVerified, onError }) {
  const [started, setStarted] = useState(null)
  const [cert, setCert] = useState('')
  const [pin, setPin] = useState('')
  const [busy, setBusy] = useState(false)

  const detect = async () => {
    setBusy(true)
    try {
      const r = await startVerification(token, { method: 'DSC_TOKEN' })
      setStarted(r)
      setCert(r.certificates[0]?.id ?? '')
    } catch (err) {
      onError(err.message)
    } finally {
      setBusy(false)
    }
  }
  useEffect(() => {
    if (open && !started) detect()
  }, [open])

  const sign = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      const r = await completeVerification(token, { challengeId: started.challengeId, certificateId: cert, pin })
      onVerified({
        method: 'DSC_TOKEN',
        challengeId: started.challengeId,
        summary: `Certificate of ${r.certificate.subject} (${r.certificate.issuer})`,
        stamp: makeStamp({ heading: 'Digitally signed with DSC', name: r.certificate.subject, detail: `${r.certificate.issuer} · ${r.certificate.serial}` }),
      })
    } catch (err) {
      onError(err.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <WindowShell open={open} onClose={onClose} method="DSC_TOKEN" subtitle="Sign with the digital signature certificate on your USB token.">
      {sandbox && <SandboxNote>No token utility is connected. A test certificate is shown; any 4 to 8 digit PIN works.</SandboxNote>}
      {!started ? (
        <div className="mw-device">
          <Spinner /> <span>Looking for your USB token…</span>
        </div>
      ) : (
        <form className="mw-form" onSubmit={sign}>
          <span className="field-label">Certificates on the token</span>
          {started.certificates.map((c) => (
            <label key={c.id} className={`mw-cert ${cert === c.id ? 'on' : ''}`}>
              <input type="radio" name="cert" checked={cert === c.id} onChange={() => setCert(c.id)} />
              <Icon name="key" size={18} />
              <div>
                <b>{c.subject}</b>
                <span className="muted small">
                  {c.issuer} · serial {c.serial} · valid to {c.validTo}
                </span>
              </div>
            </label>
          ))}
          <label className="field">
            <span className="field-label">Token PIN</span>
            <input type="password" inputMode="numeric" value={pin} maxLength={8} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} autoFocus />
          </label>
          <button className="btn primary block" disabled={!cert || pin.length < 4 || busy}>
            <Busy busy={busy}>Sign with token</Busy>
          </button>
        </form>
      )}
    </WindowShell>
  )
}

const WINDOWS = {
  CLICKWRAP: ClickwrapWindow,
  SMART_ESIGN: SmartEsignWindow,
  AADHAAR_OTP: AadhaarOtpWindow,
  AADHAAR_FINGERPRINT: FingerprintWindow,
  AADHAAR_FACE: FaceWindow,
  DSC_TOKEN: DscWindow,
}

// The window for one method; `key` on the caller resets it each time it opens
export default function MethodWindow({ method, ...props }) {
  const Window = WINDOWS[method] ?? ClickwrapWindow
  return <Window {...props} />
}
