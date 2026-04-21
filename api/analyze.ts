import type { VercelRequest, VercelResponse } from '@vercel/node'
import Anthropic from '@anthropic-ai/sdk'

// Vercel Hobby = 10s max, Pro = 300s. Claude Vision sur 2 pages dépasse 10s.
export const maxDuration = 60

const SYSTEM_PROMPT = `Tu es un expert en accessibilité pédagogique pour la Fédération Wallonie-Bruxelles (FWB).
Tu reçois un document scolaire extrait (parfois par OCR de qualité variable) et une liste d'Aménagements Universels (AUs) à appliquer.

RÔLE :
1. Identifier le contexte pédagogique du document (voir ci-dessous)
2. Parser le document en blocs sémantiques (titres, consignes, textes, exercices, listes)
3. Appliquer chaque AU sélectionné au contenu
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
- Les phrases à trous → type "exercice", texte = la phrase avec "______" pour les blancs.
- Les choix entre parenthèses (mot1 - mot2) → type "exercice", texte = la phrase complète avec les options.
- Les lignes de réponse vides → type "espace_reponse".

RÈGLES PAR AU :
- consigne_verbe_action_gras : dans chaque consigne, identifie le verbe d'action principal (Lis, Écris, Entoure, Souligne, Calcule, etc.)
- consigne_formulation_claire : reformule les consignes longues en phrases courtes (<15 mots), une idée par phrase
- consigne_puces_verbe_action : si plusieurs consignes, mets chacune sur un item séparé dans une liste
- consigne_contextualiser : si le contexte est absent, ajoute une courte phrase introductive sur l'objectif
- struct_commencer_consignes : place les questions/consignes AVANT le texte support
- struct_numeroter_exercices : numérote chaque exercice (Exercice 1, Exercice 2…)
- struct_no_distracteurs : supprime les mentions décoratives, commentaires de marges, textes non pertinents
- struct_titre_mise_evidence : assure que le titre principal est clairement identifié
- appr_bloom_progression : ordonne les consignes du plus simple (mémoriser) au plus complexe (créer/évaluer)
- picto_arasaac : identifie les 5-10 mots-clés du document pour lesquels chercher des pictogrammes

FORMAT JSON DE SORTIE :
{
  "titre": "string",
  "blocs": [
    {
      "type": "titre" | "consigne" | "paragraphe" | "liste" | "exercice" | "espace_reponse",
      "texte": "string",
      "niveau": 1 | 2 | 3,
      "items": ["string"],
      "verbeAction": "string",
      "numero": 1
    }
  ],
  "aus_appliques": [
    { "id": "string", "applique": true, "note": "string" }
  ],
  "alertes_pedagogiques": ["string"],
  "mots_cles_pictos": ["string"]
}

Inclus dans aus_appliques TOUS les AUs de la liste reçue, avec applique:true/false selon si applicable.`

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY non configurée' })
  }

  const { extractedText, visionImageUrl, visionBase64Pages, selectedAUs, profile } = req.body as {
    extractedText?: string
    visionImageUrl?: string
    visionBase64Pages?: string[]
    selectedAUs?: string[]
    profile?: { niveau: string; forme?: string; cours?: string }
  }

  if (!selectedAUs || (!extractedText && !visionImageUrl && !visionBase64Pages)) {
    return res.status(400).json({ error: 'Contenu du document requis' })
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

    // Extrait le JSON (Claude peut l'entourer de ```json ... ```)
    const jsonMatch = rawContent.match(/```json\s*([\s\S]*?)\s*```/) ??
                      rawContent.match(/```\s*([\s\S]*?)\s*```/)
    const jsonStr = jsonMatch ? jsonMatch[1] : rawContent.trim()

    const structured = JSON.parse(jsonStr)
    return res.status(200).json(structured)

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur inconnue'
    console.error('[Analyze] Error:', msg)
    return res.status(500).json({ error: msg })
  }
}
