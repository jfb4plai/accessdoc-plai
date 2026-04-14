import type { VercelRequest, VercelResponse } from '@vercel/node'

/**
 * POST /api/ocr
 * Reçoit une URL publique Supabase Storage, appelle Mistral OCR, retourne le texte extrait.
 *
 * Body : { fileUrl: string, fileType: string }
 * Response : { pages: MistralPage[], totalText: string, pageCount: number }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.MISTRAL_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'MISTRAL_API_KEY non configurée' })
  }

  const { fileUrl, fileType } = req.body as { fileUrl?: string; fileType?: string }

  if (!fileUrl || !fileType) {
    return res.status(400).json({ error: 'fileUrl et fileType requis' })
  }

  // Détermine le type de document pour Mistral OCR
  const isImage = fileType.startsWith('image/')
  const documentType = isImage ? 'image_url' : 'document_url'

  try {
    const mistralRes = await fetch('https://api.mistral.ai/v1/ocr', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistral-ocr-latest',
        document: {
          type: documentType,
          [documentType]: fileUrl,
        },
        include_image_base64: false, // On ne rapatrie pas les images base64
      }),
    })

    if (!mistralRes.ok) {
      const errText = await mistralRes.text()
      console.error('[OCR] Mistral error:', mistralRes.status, errText)
      return res.status(502).json({ error: `Erreur Mistral OCR (${mistralRes.status})` })
    }

    const ocrData = await mistralRes.json() as {
      pages: Array<{ index: number; markdown: string; dimensions?: { width: number; height: number } }>
      model: string
      usage_info: { pages_processed: number }
    }

    // Concatène le markdown de toutes les pages
    const totalText = ocrData.pages.map(p => p.markdown).join('\n\n---\n\n')

    return res.status(200).json({
      pages: ocrData.pages,
      totalText,
      pageCount: ocrData.pages.length,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur inconnue'
    console.error('[OCR] Exception:', msg)
    return res.status(500).json({ error: msg })
  }
}
