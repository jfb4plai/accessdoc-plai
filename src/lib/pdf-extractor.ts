import * as pdfjsLib from 'pdfjs-dist'

// Worker pdf.js via URL Vite native
import PDFWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
pdfjsLib.GlobalWorkerOptions.workerSrc = PDFWorker

/**
 * Extrait le texte d'un PDF natif (sélectionnable) via pdf.js.
 * Retourne le texte complet et le nombre de pages.
 */
export async function extractPdfText(
  file: File
): Promise<{ text: string; pageCount: number }> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

  const pageTexts: string[] = []

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items
      .map(item => ('str' in item ? item.str : ''))
      .join(' ')
    if (pageText.trim()) {
      pageTexts.push(pageText.trim())
    }
  }

  return {
    text: pageTexts.join('\n\n'),
    pageCount: pdf.numPages,
  }
}

/**
 * Rend les pages d'un PDF en images JPEG base64 (pour Claude Vision).
 * Utilisé pour les PDFs scannés (ex. Microsoft Lens).
 */
export async function renderPdfPagesToBase64(
  file: File,
  maxPages = 6
): Promise<string[]> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const pageCount = Math.min(pdf.numPages, maxPages)
  const base64Pages: string[] = []

  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i)
    const viewport = page.getViewport({ scale: 1.5 })

    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height

    const ctx = canvas.getContext('2d')!
    await page.render({ canvasContext: ctx, viewport }).promise

    // Extrait le base64 JPEG (sans le préfixe data:image/jpeg;base64,)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.75)
    base64Pages.push(dataUrl.split(',')[1])
  }

  return base64Pages
}
