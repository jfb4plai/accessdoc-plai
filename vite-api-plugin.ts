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
Tu reçois un document scolaire extrait (parfois par OCR de qualité variable) et une liste d'Aménagements Universels (AUs) à appliquer.

RÔLE :
1. Identifier le contexte pédagogique du document (voir ci-dessous)
2. Parser le document en blocs sémantiques (titres, consignes, textes, exercices, listes)
3. Appliquer chaque AU sélectionné
4. Retourner UNIQUEMENT un JSON valide, sans texte avant ni après

ÉTAPE 1 — IDENTIFICATION DU CONTEXTE (obligatoire avant tout traitement) :
- Détermine la matière scolaire (français, mathématiques, sciences, éveil, éducation physique, etc.)
- Estime le niveau (maternelle, primaire cycle 1/2/3, secondaire)
- Identifie le type d'exercice dominant (lecture, écriture, calcul, conjugaison, vocabulaire, etc.)
- Repère les champs lexicaux attendus selon le titre et les éléments visibles

ÉTAPE 2 — CONTRÔLE DE COHÉRENCE DE LA TRANSCRIPTION :
- Après transcription, vérifie que chaque mot/phrase est cohérent avec le contexte identifié
- Si un mot transcrit semble incohérent avec le thème (transcription incertaine, police difficile à lire), signale-le dans alertes_pedagogiques : "Mot douteux : '[mot lu]' — attendu dans ce contexte : [suggestion cohérente]"
- En cas d'ambiguïté de lecture, préfère le mot du champ lexical du document à une transcription littérale improbable
- Exemple : thème "animaux de la ferme" + forme visuelle ambiguë → choisis le mot d'animal le plus proche visuellement

CONTRÔLE SPÉCIFIQUE — EXERCICES DE PHONOLOGIE (sons du français) :
- Si le document est un exercice sur des sons/graphèmes, les sons listés dans le titre DOIVENT former une famille phonologique cohérente
- Familles valides en français : "eu / oeu / eur / oeur", "an / en / am / em", "in / ain / ein", "oi / oin", "ou / on", "ill / ail / eil / euil / ouil", etc.
- INVALIDE : "ou" et "oeu" dans la même série (pas de famille phonologique entre ces deux sons)
- VALIDE : "eu" et "oeu" dans la même série (sons proches, graphèmes liés)
- En cursive/scan : le "e" manuscrit ressemble visuellement à un "o" → vérifier la cohérence phonologique avant de valider
- Si tu lis une série de sons incohérente, corrige en priorité le son qui rompt la cohérence de la famille

RÈGLE FONDAMENTALE — CONSERVATION DU CONTENU :
- Inclus TOUT le contenu du document : consignes, listes de mots, phrases à compléter, exercices de choix, grilles, etc.
- Si l'OCR est dégradé (écriture cursive ou manuscrite), conserve quand même TOUS les éléments visibles.
- Ne filtre JAMAIS le contenu par manque de confiance dans l'OCR — inclus même les mots partiellement lisibles.
- Pour chaque exercice numéroté, génère au minimum : 1 bloc consigne + les blocs de contenu qui suivent.
- Les listes de mots (banque de mots) → type "liste", items = chaque mot.
- Les listes d'items numérotés : UN SEUL bloc "liste" par exercice, numérotation CONTINUE de 1 à N même si le document original utilise des sous-groupes (ex: 1-4, 1-4, 1-4 → convertir en 1 à 12). Jamais recommencer à 1 au milieu d'un même exercice.
- Les phrases à trous → type "exercice", texte = la phrase avec "______" pour les blancs.
- Les choix entre parenthèses (mot1 - mot2) → type "exercice", texte = la phrase complète avec les options.
- Les lignes de réponse vides → type "espace_reponse".
- Les changements de page dans le document original → type "saut_de_page" (texte vide). OBLIGATOIRE : insère un saut_de_page entre chaque page du document source pour respecter la pagination.

RÈGLE "MÊME PLAN" (AU fondamental FWB) :
- La consigne et sa plage de travail (exercice + espace réponse) doivent toujours être dans le même groupe de blocs, sans rien d'autre entre les deux.
- Ordre STRICT par exercice : [saut_de_page?] → [consigne] → [exercice/liste/paragraphe] → [espace_reponse].
- Ne jamais placer deux consignes consécutives sans le contenu de travail entre elles.

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
      "type": "titre"|"consigne"|"paragraphe"|"liste"|"exercice"|"espace_reponse"|"saut_de_page",
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
    visionImageUrl?: string
    visionBase64Pages?: string[]
    selectedAUs?: string[]
    profile?: { niveau: string; forme?: string; cours?: string }
  },
  res: ServerResponse,
  env: Record<string, string>
) {
  const apiKey = env.ANTHROPIC_API_KEY
  if (!apiKey) return json(res, 500, { error: 'ANTHROPIC_API_KEY non configurée' })

  const { extractedText, visionImageUrl, visionBase64Pages, selectedAUs, profile } = body
  if (!selectedAUs || (!extractedText && !visionImageUrl && !visionBase64Pages)) {
    return json(res, 400, { error: 'Contenu du document requis' })
  }

  const client = new Anthropic({ apiKey })
  const profileStr = `${profile?.niveau ?? 'primaire'}${profile?.forme ? ` · Forme ${profile.forme}` : ''}${profile?.cours ? ` · ${profile.cours}` : ''}`

  try {
    let message

    if (visionImageUrl || visionBase64Pages) {
      // ── Mode Vision ──────────────────────────────────────────────────────
      const imageContent: Anthropic.ImageBlockParam[] = visionImageUrl
        ? [{ type: 'image', source: { type: 'url', url: visionImageUrl } }]
        : (visionBase64Pages ?? []).map(b64 => ({
            type: 'image' as const,
            source: { type: 'base64' as const, media_type: 'image/jpeg' as const, data: b64 },
          }))

      const visionText = `Analyse ce document scolaire (${imageContent.length} page(s)).
AUs à appliquer : ${JSON.stringify(selectedAUs)}
Niveau FWB : ${profileStr}

Retourne le JSON structuré uniquement.`

      message = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: [...imageContent, { type: 'text', text: visionText }],
        }],
      })
    } else {
      // ── Mode texte (PDF natif, Word) ─────────────────────────────────────
      const userMessage = `Document scolaire extrait :
\`\`\`
${(extractedText ?? '').substring(0, 6000)}
\`\`\`

AUs à appliquer : ${JSON.stringify(selectedAUs)}
Niveau FWB : ${profileStr}

Retourne le JSON structuré uniquement.`

      message = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
      })
    }

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
