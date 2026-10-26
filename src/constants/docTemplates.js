// Starter documents offered when creating a template (like Word's "New" gallery).
const f = (label) => `<span data-field="${label}"></span>`
const sig = (party) => `<div data-signature="${party}"></div>`

export const STARTER_DOCS = [
  {
    id: 'blank',
    name: 'Blank document',
    description: 'Start from an empty page',
    parties: ['Signer 1'],
    html: '<p></p>',
  },
  {
    id: 'service-agreement',
    name: 'Service Agreement',
    description: 'Client and service provider',
    parties: ['Client', 'Service Provider'],
    html: `
<h1 style="text-align: center">SERVICE AGREEMENT</h1>
<p style="text-align: center">Agreement No. ${f('Contract ID')} · Dated ${f("Today's Date")}</p>
<p>This Service Agreement (the "<strong>Agreement</strong>") is entered into between <strong>${f('Client Name')}</strong> (the "Client") and <strong>${f('Service Provider Name')}</strong> (the "Service Provider").</p>
<h2>1. Services</h2>
<p>The Service Provider agrees to deliver the services described in Schedule A with due care, skill and diligence, in accordance with industry standards.</p>
<h2>2. Fees and Payment</h2>
<table><tbody>
<tr><th><p>Item</p></th><th><p>Amount</p></th><th><p>Due</p></th></tr>
<tr><td><p>Setup fee</p></td><td><p>₹ 25,000</p></td><td><p>On signing</p></td></tr>
<tr><td><p>Monthly retainer</p></td><td><p>₹ 40,000</p></td><td><p>1st of every month</p></td></tr>
</tbody></table>
<h2>3. Term and Termination</h2>
<p>This Agreement remains in force until ${f('Expiry Date')} unless terminated earlier by either party with thirty (30) days' written notice.</p>
<h2>4. Confidentiality</h2>
<p>Each party shall keep confidential all information received from the other party and use it only for the purposes of this Agreement.</p>
<p>IN WITNESS WHEREOF, the parties have signed this Agreement on the date first written above.</p>
${sig('Client')}
${sig('Service Provider')}`,
  },
  {
    id: 'nda',
    name: 'Non-Disclosure Agreement',
    description: 'Mutual NDA between two parties',
    parties: ['First Party', 'Second Party'],
    html: `
<h1 style="text-align: center">MUTUAL NON-DISCLOSURE AGREEMENT</h1>
<p>This Agreement is made on ${f("Today's Date")} between <strong>${f('First Party Name')}</strong> and <strong>${f('Second Party Name')}</strong> (each a "Party").</p>
<h2>1. Confidential Information</h2>
<p>"Confidential Information" means any non-public information disclosed by one Party to the other, whether in writing, orally or by inspection, that is marked or reasonably understood to be confidential.</p>
<h2>2. Obligations</h2>
<ul><li><p>Use the Confidential Information only to evaluate the proposed business relationship.</p></li><li><p>Not disclose it to any third party without prior written consent.</p></li><li><p>Protect it with at least the same care used for its own confidential information.</p></li></ul>
<h2>3. Term</h2>
<p>The obligations in this Agreement continue for two (2) years from the date of signing.</p>
${sig('First Party')}
${sig('Second Party')}`,
  },
  {
    id: 'offer-letter',
    name: 'Offer Letter',
    description: 'Employment offer to a candidate',
    parties: ['Candidate', 'HR Manager'],
    html: `
<p style="text-align: right">${f("Today's Date")}</p>
<p><strong>${f('Candidate Name')}</strong><br>${f('Candidate Email')}</p>
<h2>Offer of Employment</h2>
<p>Dear ${f('Candidate Name')},</p>
<p>We are pleased to offer you the position of <strong>Senior Associate</strong> with ${f('Executor Name')}. Your annual cost to company will be <strong>₹ 12,00,000</strong>, payable monthly.</p>
<p>Your expected date of joining is <strong>1 December 2026</strong>. This offer is valid until ${f('Expiry Date')}.</p>
<p>Please sign below to confirm your acceptance.</p>
<p>Warm regards,</p>
${sig('HR Manager')}
${sig('Candidate')}`,
  },
  {
    id: 'loan-agreement',
    name: 'Loan Agreement',
    description: 'Borrower, co-borrower and lender',
    parties: ['Borrower', 'Co-Borrower'],
    html: `
<h1 style="text-align: center">LOAN AGREEMENT</h1>
<p style="text-align: center">Loan Account No. ${f('Contract ID')}</p>
<p>This Loan Agreement is executed on ${f("Today's Date")} between <strong>${f('Executor Name')}</strong> (the "Lender") and <strong>${f('Borrower Name')}</strong> together with <strong>${f('Co-Borrower Name')}</strong> (jointly the "Borrowers").</p>
<h2>1. Loan Details</h2>
<table><tbody>
<tr><th><p>Particular</p></th><th><p>Details</p></th></tr>
<tr><td><p>Sanctioned amount</p></td><td><p>₹ 5,00,000</p></td></tr>
<tr><td><p>Rate of interest</p></td><td><p>10.5% per annum (floating)</p></td></tr>
<tr><td><p>Tenure</p></td><td><p>60 months</p></td></tr>
<tr><td><p>EMI</p></td><td><p>₹ 10,747</p></td></tr>
</tbody></table>
<h2>2. Repayment</h2>
<p>The Borrowers shall repay the loan in equated monthly instalments by auto-debit (NACH) on the 5th of every month.</p>
<h2>3. Default</h2>
<p>Failure to pay any instalment within fifteen (15) days of the due date shall attract penal interest of 2% per month on the overdue amount.</p>
${sig('Borrower')}
${sig('Co-Borrower')}`,
  },
]
