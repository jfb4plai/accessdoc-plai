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
