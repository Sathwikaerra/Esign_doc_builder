// Page geometry in CSS pixels (96 dpi), shared by the editor and the PDF export.
export const PAGE_SIZES = {
  A4: { label: 'A4', note: '21 × 29.7 cm', width: 794, height: 1123 },
  Letter: { label: 'Letter', note: '8.5 × 11 in', width: 816, height: 1056 },
  Legal: { label: 'Legal', note: '8.5 × 14 in', width: 816, height: 1344 },
}

export const MARGINS = {
  normal: { label: 'Normal', note: '2.54 cm all sides', top: 96, side: 96 },
  narrow: { label: 'Narrow', note: '1.27 cm all sides', top: 48, side: 48 },
  moderate: { label: 'Moderate', note: '2.54 / 1.91 cm', top: 96, side: 72 },
  wide: { label: 'Wide', note: '2.54 / 5.08 cm', top: 96, side: 192 },
}

export const DEFAULT_PAGE_SETUP = { size: 'A4', orientation: 'portrait', margin: 'normal' }

export function pageGeometry(setup = DEFAULT_PAGE_SETUP) {
  const size = PAGE_SIZES[setup.size] ?? PAGE_SIZES.A4
  const margin = MARGINS[setup.margin] ?? MARGINS.normal
  const landscape = setup.orientation === 'landscape'
  return {
    width: landscape ? size.height : size.width,
    height: landscape ? size.width : size.height,
    top: margin.top,
    side: margin.side,
    landscape,
  }
}
