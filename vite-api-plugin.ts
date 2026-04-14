/**
 * Plugin Vite — gestion des routes /api/* en développement local.
 * En production (Vercel), ces routes sont gérées par les fonctions serverless dans /api/.
 */
import type { Plugin, Connect } from 'vite'
import type { IncomingMessage, ServerResponse } from 'http'
import Anthropic from '@anthropic-ai/sdk'

// Lit le body JSON d'une requête Node.js
function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', chunk => { data += chunk })
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}) }
      catch { reject(new Error('Corps JSON invalide')) }
    })
    req.on('error', reject)
  })
}

function json(res: ServerResponse, status: number, data: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(data))
}

// ── Handler /api/ocr ────────────────────────────────────────────────────────
async function handleOcr(
  body: { fileUrl?: string; fileType?: string },
  res: ServerResponse,
  env: Record<string, string>
) {
  const apiKey = env.MISTRAL_API_KEY
  if (!apiKey) return json(res, 500, { error: 'MISTRAL_API_KEY non configurée' })

  const { fileUrl, fileType } = body
  if (!fileUrl || !fileType) return json(res, 400, { error: 'fileUrl et fileType requis' })

  const isImage = fileType.startsWith('image/')
  const documentType = isImage ? 'image_url' : 'document_url'

  try {
    const mistralRes = await fetch('https://api.mistral.ai/v1/ocr', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'mistral-ocr-latest',
        document: { type: documentType, [documentType]: fileUrl },
        include_image_base64: false,
      }),
    })

    if (!mistralRes.ok) {
      const errText = await mistralRes.text()
      return json(res, 502, { error: `Mistral OCR error (${mistralRes.status}): ${errText}` })
    }

    const ocrData = await mistralRes.json() as {
      pages: Array<{ index: number; markdown: string }>
    }
    const totalText = ocrData.pages.map(p => p.markdown).join('\n\n---\n\n')
    json(res, 200, { pages: ocrData.pages, totalText, pageCount: ocrData.pages.length })
  } catch (err) {
    json(res, 500, { error: err instanceof Error ? err.message : 'Erreur inconnue' })
  }
}

// ── Handler /api/analyze ────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Tu es un expert en accessibilité pédagogique pour la Fédération Wallonie-Bruxelles (FWB).
Tu reçois un document scolaire extrait et une liste d'Aménagements Universels (AUs) à appliquer.

RÔLE :
1. Parser le document en blocs sémantiques (titres, consignes, textes, exercices, listes)
2. Appliquer chaque AU sélectionné
3. Retourner UNIQUEMENT un JSON valide, sans texte avant ni après

RÈGLES PAR AU :
- consigne_verbe_action_gras : identifie le verbe d'action principal de chaque consigne (champ "verbeAction")
- consigne_formulation_claire : reformule les consignes longues en phrases courtes (<15 mots)
- consigne_puces_verbe_action : si plusieurs consignes, crée une liste avec une consigne par item
- consigne_contextualiser : ajoute une phrase introductive courte si le contexte manque
- struct_commencer_consignes : place les consignes/questions AVANT le texte support
- struct_numeroter_exercices : numérote chaque exercice (champ "numero")
- struct_no_distracteurs : supprime les éléments décoratifs et non pertinents
- struct_titre_mise_evidence : assure que le titre principal est clairement identifié
- appr_bloom_progression : ordonne du plus simple (mémoriser) au plus complexe (évaluer/créer)
- picto_arasaac : identifie 5-10 mots-clés concrets pour lesquels chercher des pictogrammes

FORMAT JSON :
{
  "titre": "string",
  "blocs": [
    {
      "type": "titre"|"consigne"|"paragraphe"|"liste"|"exercice"|"espace_reponse",
      "texte": "string",
      "niveau": 1|2|3,
      "items": ["string"],
      "verbeAction": "string",
      "numero": 1
    }
  ],
  "aus_appliques": [{ "id": "string", "applique": true, "note": "string" }],
  "alertes_pedagogiques": ["string"],
  "mots_cles_pictos": ["string"]
}
Inclus dans aus_appliques TOUS les AUs reçus.`

async function handleAnalyze(
  body: {
    extractedText?: string
    selectedAUs?: string[]
    profile?: { niveau: string; forme?: string; cours?: string }
  },
  res: ServerResponse,
  env: Record<string, string>
) {
  const apiKey = env.ANTHROPIC_API_KEY
  if (!apiKey) return json(res, 500, { error: 'ANTHROPIC_API_KEY non configurée' })

  const { extractedText, selectedAUs, profile } = body
  if (!extractedText || !selectedAUs) {
    return json(res, 400, { error: 'extractedText et selectedAUs requis' })
  }

  const client = new Anthropic({ apiKey })

  const userMessage = `Document scolaire extrait :
\`\`\`
${extractedText.substring(0, 6000)}
\`\`\`

AUs à appliquer : ${JSON.stringify(selectedAUs)}
Niveau FWB : ${profile?.niveau ?? 'primaire'}${profile?.forme ? ` · Forme ${profile.forme}` : ''}${profile?.cours ? ` · ${profile.cours}` : ''}

Retourne le JSON structuré uniquement.`

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    })

    const rawContent = message.content[0].type === 'text' ? message.content[0].text : ''
    const jsonMatch = rawContent.match(/```json\s*([\s\S]*?)\s*```/) ??
                      rawContent.match(/```\s*([\s\S]*?)\s*```/)
    const jsonStr = jsonMatch ? jsonMatch[1] : rawContent.trim()

    const structured = JSON.parse(jsonStr)
    json(res, 200, structured)
  } catch (err) {
    json(res, 500, { error: err instanceof Error ? err.message : 'Erreur inconnue' })
  }
}

// ── Plugin Vite ─────────────────────────────────────────────────────────────
export function apiPlugin(env: Record<string, string>): Plugin {
  return {
    name: 'local-api-routes',
    configureServer(server) {
      server.middlewares.use(async (
        req: Connect.IncomingMessage,
        res: ServerResponse,
        next: Connect.NextFunction
      ) => {
        if (!req.url?.startsWith('/api/')) return next()

        res.setHeader('Access-Control-Allow-Origin', '*')
        if (req.method === 'OPTIONS') { res.writeHead(204); return res.end() }

        try {
          const body = await readJsonBody(req) as Record<string, unknown>

          if (req.url === '/api/ocr') {
            await handleOcr(body as { fileUrl?: string; fileType?: string }, res, env)
          } else if (req.url === '/api/analyze') {
            await handleAnalyze(
              body as { extractedText?: string; selectedAUs?: string[]; profile?: { niveau: string; forme?: string; cours?: string } },
              res, env
            )
          } else {
            json(res, 404, { error: 'Route inconnue' })
          }
        } catch (err) {
          json(res, 500, { error: err instanceof Error ? err.message : 'Erreur' })
        }
      })
    },
  }
}
