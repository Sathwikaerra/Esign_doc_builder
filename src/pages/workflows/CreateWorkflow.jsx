import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { WIZARD_STEPS, emptyDraft, participantComplete } from '../../constants/workflow'
import { getWorkflow, getWorkflowFile, saveWorkflow } from '../../services/workflowService'
import { draftFromTemplate, getTemplate } from '../../services/templateService'
import { htmlToPdfFile } from '../../utils/docToPdf'
import Icon from '../../components/ui/Icon'
import { PageTitle } from '../../components/ui/Controls'
import { useToast } from '../../components/ui/Toast'
import UploadStep from './steps/UploadStep'
import BasicStep from './steps/BasicStep'
import AdvancedStep from './steps/AdvancedStep'
import EstampStep from './steps/EstampStep'
import SigneeStep from './steps/SigneeStep'
import ConfirmStep from './steps/ConfirmStep'

function stepValid(step, draft, file) {
  switch (step) {
    case 0:
      return !!draft.name.trim() && !!file
    case 1:
      return !!draft.basic.executorName.trim() && Number(draft.basic.expiryValue) > 0
    case 3: {
      if (!draft.basic.stampingMethod) return true
      const e = draft.estamp
      return !!(e.state && e.article && e.stampDutyAmount && e.firstParty)
    }
    case 4: {
      const signers = draft.participants.filter((p) => p.kind === 'signer')
      return signers.length > 0 && draft.participants.every((p) => participantComplete(p, draft.boxes))
    }
    default:
      return true
  }
}

export default function CreateWorkflow() {
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const toast = useToast()
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState(emptyDraft)
  const [file, setFile] = useState(null)
  const [numPages, setNumPages] = useState(0)
  const [editingSignees, setEditingSignees] = useState(false)
  const [showErrors, setShowErrors] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(!!params.get('draft'))
  const [generating, setGenerating] = useState(null) // template name while its PDF is being built
  const [fromTemplate, setFromTemplate] = useState(null)
  const uploadedFile = useRef(null) // the PDF the server already has

  // Continue a saved draft, or start from a template
  useEffect(() => {
    const draftId = params.get('draft')
    const templateId = location.state?.templateId
    if (draftId) {
      Promise.all([getWorkflow(draftId), getWorkflowFile(draftId)])
        .then(([w, blob]) => {
          if (w) setDraft(w)
          if (blob) {
            const pdf = new File([blob], w?.documentName || 'document.pdf', { type: 'application/pdf' })
            uploadedFile.current = pdf
            setFile(pdf)
          }
        })
        .catch((err) => toast(err.message, 'error'))
        .finally(() => setLoading(false))
    } else if (templateId) {
      getTemplate(templateId).then(async (tpl) => {
        if (!tpl) return toast('That template no longer exists', 'error')
        const next = draftFromTemplate(tpl)
        setDraft(next)
        if (!tpl.content?.replace(/<p><\/p>/g, '').trim()) return
        // The template's document becomes the contract PDF
        setGenerating(tpl.name)
        try {
          const pdf = await htmlToPdfFile(tpl.content, tpl.pageSetup, `${tpl.name}.pdf`)
          setFile(pdf)
          setFromTemplate(tpl.name)
          setDraft((d) => ({ ...d, documentName: pdf.name }))
        } catch {
          toast('Could not build the PDF from this template. Please upload one instead.', 'error')
        } finally {
          setGenerating(null)
        }
      }, (err) => toast(err.message, 'error'))
    }
  }, [])

  // Save to the server; the PDF is only uploaded when it changed since the last save.
  const persist = async (status) => {
    setSaving(true)
    try {
      const changedFile = file && file !== uploadedFile.current ? file : undefined
      const saved = await saveWorkflow(draft, { status, file: changedFile })
      if (changedFile) uploadedFile.current = changedFile
      return saved
    } catch (err) {
      toast(err.message, 'error')
      return null
    } finally {
      setSaving(false)
    }
  }

  const update = (section, patch) =>
    setDraft((d) => (section ? { ...d, [section]: { ...d[section], ...patch } } : { ...d, ...patch }))

  const valid = stepValid(step, draft, file)

  const proceed = async () => {
    if (!valid) return setShowErrors(true)
    setShowErrors(false)
    if (step < WIZARD_STEPS.length - 1) {
      setStep(step + 1)
      window.scrollTo(0, 0)
      return
    }
    const saved = await persist('active')
    if (!saved) return
    toast('Workflow created successfully')
    navigate(`/workflows/${saved.id}`, { replace: true })
  }

  const saveDraft = async () => {
    if (!draft.name.trim()) return toast('Give the workflow a name before saving a draft', 'error')
    const saved = await persist('draft')
    if (!saved) return
    setDraft(saved)
    toast('Draft saved. Find it under Saved Drafts.')
  }

  const cancel = () => {
    if (window.confirm('Discard this workflow? Unsaved changes will be lost.')) navigate('/workflows')
  }

  if (loading) return <div className="page loading-text">Loading draft…</div>

  const stepProps = { draft, update, setDraft, file, setFile, numPages, showErrors }

  return (
    <div className="page wizard">
      <PageTitle title="Workflow" crumbs={['Dashboard', 'Create Workflow']} />

      {!editingSignees && (
        <div className="stepper-row">
          {step > 0 ? (
            <button className="icon-btn" onClick={() => setStep(step - 1)} aria-label="Previous step">
              <Icon name="arrowLeft" />
            </button>
          ) : (
            <span className="stepper-spacer" />
          )}
          <ol className="stepper">
            {WIZARD_STEPS.map((label, i) => (
              <li key={label} className={i < step ? 'done' : i === step ? 'current' : ''}>
                <button
                  type="button"
                  className="step-dot"
                  disabled={i >= step}
                  onClick={() => setStep(i)}
                  aria-label={label}
                >
                  {i < step && <Icon name="check" size={12} strokeWidth={3} />}
                </button>
                <span>{label}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="wizard-body">
        {step === 0 && <UploadStep {...stepProps} generating={generating} fromTemplate={fromTemplate} />}
        {step === 1 && <BasicStep {...stepProps} />}
        {step === 2 && <AdvancedStep {...stepProps} />}
        {step === 3 && <EstampStep {...stepProps} />}
        {step === 4 && (
          <SigneeStep {...stepProps} onPagesLoaded={setNumPages} editing={editingSignees} setEditing={setEditingSignees} />
        )}
        {step === 5 && <ConfirmStep {...stepProps} />}
      </div>

      {!editingSignees && (
        <div className="wizard-footer">
          {showErrors && !valid && <span className="footer-error">Please complete the required fields.</span>}
          <button className="btn" onClick={cancel}>
            Cancel
          </button>
          {step > 0 && (
            <button className="btn icon-only" onClick={saveDraft} disabled={saving} title="Save as draft" aria-label="Save as draft">
              <Icon name="save" size={18} />
            </button>
          )}
          <button className="btn primary" onClick={proceed} disabled={saving || (step === 4 && !valid)}>
            {saving ? 'Saving…' : step === WIZARD_STEPS.length - 1 ? 'Create Workflow' : 'Proceed'}
          </button>
        </div>
      )}
    </div>
  )
}
