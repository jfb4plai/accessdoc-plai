import type { VercelRequest, VercelResponse } from '@vercel/node'
import Anthropic from '@anthropic-ai/sdk'

const SYSTEM_PROMPT = `Tu es un expert en accessibilité pédagogique pour la Fédération Wallonie-Bruxelles (FWB).
Tu reçois un document scolaire extrait (texte brut ou markdown) et une liste d'Aménagements Universels (AUs) à appliquer.

RÔLE :
1. Parser le document en blocs sémantiques (titres, consignes, textes, exercices, listes)
2. Appliquer chaque AU sélectionné au contenu
3. Retourner UNIQUEMENT un JSON valide, sans texte avant ni après

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

  const { extractedText, selectedAUs, profile } = req.body as {
    extractedText?: string
    selectedAUs?: string[]
    profile?: { niveau: string; forme?: string; cours?: string }
  }

  if (!extractedText || !selectedAUs) {
    return res.status(400).json({ error: 'extractedText et selectedAUs requis' })
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
