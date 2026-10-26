import { pageGeometry } from '../components/editor/pageSetup'

// Renders template HTML into a real PDF File, laid out with the template's page setup.
export async function htmlToPdfFile(html, pageSetup, filename = 'document.pdf') {
  const { default: html2pdf } = await import('html2pdf.js')
  const g = pageGeometry(pageSetup)

  const host = document.createElement('div')
  host.style.cssText = 'position:fixed;left:-10000px;top:0;'
  const el = document.createElement('div')
  el.className = 'doc-content doc-print'
  el.style.width = `${g.width - g.side * 2}px`
  el.innerHTML = html
  host.appendChild(el)
  document.body.appendChild(host)

  try {
    const blob = await html2pdf()
      .set({
        margin: [g.top, g.side, g.top, g.side],
        image: { type: 'jpeg', quality: 0.96 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'px', format: [g.width, g.height], orientation: g.landscape ? 'landscape' : 'portrait', hotfixes: ['px_scaling'] },
        pagebreak: { mode: ['css'], before: '.page-break', avoid: ['tr', 'li', 'h1', 'h2', 'h3', '.signature-block', 'img'] },
      })
      .from(el)
      .outputPdf('blob')
    return new File([blob], filename, { type: 'application/pdf' })
  } finally {
    host.remove()
  }
}
