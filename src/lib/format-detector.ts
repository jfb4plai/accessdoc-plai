import type { TypeSource } from '../types'

/**
 * Détecte le type de source d'un fichier uploadé.
 * Retourne l'une des 4 valeurs TypeSource.
 */
export async function detectFormat(file: File): Promise<TypeSource> {
  const name = file.name.toLowerCase()
  const type = file.type.toLowerCase()

  // Fichier Word
  if (
    type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    type === 'application/msword' ||
    type === 'application/vnd.oasis.opendocument.text' ||
    name.endsWith('.docx') ||
    name.endsWith('.doc') ||
    name.endsWith('.odt')
  ) {
    return 'word'
  }

  // Image → scan GSM (photo prise avec un smartphone)
  if (type.startsWith('image/')) {
    return 'scan_gsm'
  }

  // PDF : on distingue natif (avec texte sélectionnable) de scanné (image seule)
  if (type === 'application/pdf' || name.endsWith('.pdf')) {
    const isNative = await checkPdfHasText(file)
    return isNative ? 'pdf_natif' : 'pdf_scan'
  }

  // Fallback : on suppose un scan
  return 'scan_gsm'
}

/**
 * Vérifie si un PDF contient du texte extractible (PDF natif).
 * Lit les premiers 4 Ko pour chercher des opérateurs texte PostScript.
 * Heuristique rapide, sans charger pdfjs-dist complet.
 */
async function checkPdfHasText(file: File): Promise<boolean> {
  try {
    // Lecture des 50 premiers Ko du fichier binaire
    // (les opérateurs texte peuvent apparaître au-delà des 4 premiers Ko)
    const slice = file.slice(0, 51200)
    const buffer = await slice.arrayBuffer()
    const bytes = new Uint8Array(buffer)
    // Décode en ignorant les caractères non-ASCII pour éviter les erreurs
    let sample = ''
    for (let i = 0; i < bytes.length; i++) {
      sample += bytes[i] < 128 ? String.fromCharCode(bytes[i]) : ' '
    }

    // Les PDFs natifs contiennent des marqueurs texte comme "BT" (Begin Text)
    // et des opérateurs Tj / TJ / Tf
    const hasTextMarkers = /BT[\s\S]{0,500}(Tj|TJ|Tf)/m.test(sample)
    if (!hasTextMarkers) return false

    // Certains scans (Microsoft Lens, Adobe Scan) ajoutent une couche OCR dans
    // le PDF tout en embarquant l'image comme JPEG (/Subtype /Image + DCTDecode).
    // Dans ce cas, le texte extrait par pdf.js est du charabia → forcer pdf_scan
    // pour passer par Claude Vision.
    const hasEmbeddedJpeg =
      /DCTDecode|JPXDecode/.test(sample) && /\/Subtype\s*\/Image/.test(sample)
    if (hasEmbeddedJpeg) return false // → pdf_scan → Claude Vision

    return true
  } catch {
    // En cas d'erreur de lecture, on suppose pdf_scan (plus prudent)
    return false
  }
}

/**
 * Retourne un libellé lisible pour un TypeSource.
 */
export function labelTypeSource(type: TypeSource): string {
  const labels: Record<TypeSource, string> = {
    scan_gsm: 'Photo / scan smartphone',
    pdf_natif: 'PDF natif (texte sélectionnable)',
    pdf_scan: 'PDF scanné (image)',
    word: 'Document Word / ODT',
  }
  return labels[type]
}
