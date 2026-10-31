export const WIZARD_STEPS = ['Upload file', 'Basic', 'Advanced', 'eStamp Details', 'Signee Info', 'Confirm']

export const SIGNATURE_METHODS = [
  { id: 'AADHAAR_OTP', label: 'Aadhaar E Sign OTP', short: 'AADHAARESIGN-OTP', icon: 'phone' },
  { id: 'AADHAAR_FINGERPRINT', label: 'Aadhaar Fingerprint', short: 'AADHAARESIGN-FINGERPRINT', icon: 'fingerprint' },
  { id: 'AADHAAR_FACE', label: 'Aadhaar Faceauth', short: 'AADHAARESIGN-FACEAUTH', icon: 'face' },
  { id: 'CLICKWRAP', label: 'Clickwrap', short: 'CLICKWRAP', icon: 'checkCircle' },
  { id: 'SMART_ESIGN', label: 'Smart eSign', short: 'SMART-ESIGN', icon: 'signature' },
  { id: 'DSC_TOKEN', label: 'DSC Token', short: 'DSC-TOKEN', icon: 'key' },
]

export const PRE_SIGNING_METHODS = ['Email OTP', 'Mobile OTP', 'Video KYC']
export const POST_SIGNING_METHODS = ['Feedback Form']
// Older workflows stored location / selfie here; they now have their own switches (captureLocation, capturePhoto)
export const LEGACY_CAPTURES = { 'Location Capture': 'captureLocation', 'Selfie Capture': 'capturePhoto' }

export const PARTICIPANT_KINDS = {
  signer: { label: 'Signer', plural: 'Signers', needsMethods: true, needsBoxes: true },
  reviewer: { label: 'Reviewer', plural: 'Reviewers', needsMethods: false, needsBoxes: false },
  auto: { label: 'Auto Signature', plural: 'Auto Signature', needsMethods: false, needsBoxes: true },
}

export const EXPIRY_UNITS = [
  { value: 'hours', label: 'Hours' },
  { value: 'eod', label: 'End of Day (EOD)' },
  { value: 'days', label: 'Days' },
  { value: 'weeks', label: 'Weeks' },
  { value: 'months', label: 'Months' },
]

export const STAMPING_METHODS = [
  { value: 'eStamping', label: 'eStamping' },
  { value: 'eChallan', label: 'eChallan' },
  { value: 'Revenue Stamp', label: 'Revenue Stamp' },
  { value: 'NeSL', label: 'NeSL (Paperless Stamping)' },
]

export const PDF_CUSTOM_NAMES = ['Contract Name-Signer Name', 'Contract Id-Signer Id', 'Signer Name']

export const USER_DEFINED_FIELDS = [
  'Loan Account Number',
  'Customer ID',
  'Branch Code',
  'Application Number',
  'Product Type',
  'Sanction Amount',
  'Relationship Manager',
]

export const LANGUAGES = ['English', 'Hindi', 'Tamil', 'Telugu', 'Kannada', 'Malayalam', 'Marathi', 'Bengali', 'Gujarati']

export const STATES = [
  'Andhra Pradesh', 'Delhi', 'Gujarat', 'Karnataka', 'Kerala', 'Maharashtra', 'Tamil Nadu', 'Telangana', 'Uttar Pradesh', 'West Bengal',
]

export const DEFAULT_SIGNATORY_LABELS = {
  genderMatch: 'Enable Signatory Gender Match',
  yobMatch: 'Enable Signatory YOB Match',
  uidMatch: 'Enable Signatory UID Last Four Digits Match',
  pincodeMatch: 'Enable Signatory Pincode Match',
  nameMatch: 'Enable Signatory Name Match',
}

// Colours used for signature boxes, one per participant.
export const BOX_COLORS = ['#0f766e', '#7c3aed', '#d97706', '#2563eb', '#db2777', '#4d7c0f']

export function emptyDraft() {
  return {
    name: '',
    documentName: '',
    basic: {
      executorName: '',
      contractName: '',
      expiryValue: 14,
      expiryUnit: 'days',
      signingMethod: 'sequential',
      locationCapture: [],
      nameMatch: false,
      nameMatchThreshold: 70,
      genderMatch: false,
      yobMatch: false,
      uidMatch: false,
      pincodeMatch: false,
      lenientAll: false,
      lenientCoordinates: false,
      checkerApproval: false,
      stampingMethod: '',
      pdfCustomName: '',
      emailSubject: '',
      userDefinedFields: [],
    },
    advanced: {
      callbackUrl: '',
      callbackAuth: 'none',
      callbackHeaderKey: '',
      callbackHeaderValue: '',
      signerCallbackUrl: '',
      signerCallbackAuth: 'none',
      signerCallbackHeaderKey: '',
      signerCallbackHeaderValue: '',
      successRedirectUrl: '',
      failureRedirectUrl: '',
      redirectTime: '',
      oauthTokenUrl: '',
      oauthClientId: '',
      oauthClientSecret: '',
      oauthScope: '',
      mailVisibility: '',
      ccEmails: '',
      smartEsignModes: [],
      clickwrapText: '',
      defaultLanguage: '',
    },
    estamp: {
      state: '',
      article: '',
      stampDutyAmount: '',
      firstParty: '',
      secondParty: '',
      considerationAmount: '',
      paidBy: 'first',
      description: '',
    },
    participants: [],
    boxes: [],
    initiationMessage: 'Please review all the details before initiating the workflow.',
  }
}

export function computeExpiry(value, unit, from = new Date()) {
  const n = Number(value) || 0
  const d = new Date(from)
  if (unit === 'hours') d.setHours(d.getHours() + n)
  else if (unit === 'eod') {
    d.setDate(d.getDate() + n)
    d.setHours(23, 59, 0, 0)
  } else if (unit === 'weeks') d.setDate(d.getDate() + n * 7)
  else if (unit === 'months') d.setMonth(d.getMonth() + n)
  else d.setDate(d.getDate() + n)
  return d
}

export function participantComplete(p, boxes) {
  const kind = PARTICIPANT_KINDS[p.kind]
  if (kind.needsMethods && !p.methods?.length) return false
  if (kind.needsBoxes && !boxes.some((b) => b.owner === p.id)) return false
  return true
}

export const methodLabels = (ids = []) => ids.map((id) => SIGNATURE_METHODS.find((m) => m.id === id)?.label).filter(Boolean)
export const methodShorts = (ids = []) => ids.map((id) => SIGNATURE_METHODS.find((m) => m.id === id)?.short).filter(Boolean)
