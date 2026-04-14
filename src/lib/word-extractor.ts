import mammoth from 'mammoth'

/**
 * Extrait le texte brut d'un fichier Word (.docx / .doc / .odt) via mammoth.
 * Retourne le texte et le HTML minimal (pour estimation de structure).
 */
export async function extractWordText(
  file: File
): Promise<{ text: string; html: string }> {
  const arrayBuffer = await file.arrayBuffer()

  const [rawResult, htmlResult] = await Promise.all([
    mammoth.extractRawText({ arrayBuffer }),
    mammoth.convertToHtml({ arrayBuffer }),
  ])

  return {
    text: rawResult.value,
    html: htmlResult.value,
  }
}
