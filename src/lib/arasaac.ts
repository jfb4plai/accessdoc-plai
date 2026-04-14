// Arasaac API — libre d'accès, sans authentification
// Licence pictogrammes : CC BY-NC-SA 4.0

export interface ArasaacResult {
  id: number
  url: string
  keywords: string[]
}

/**
 * Recherche un pictogramme Arasaac par mot-clé.
 * Retourne le premier résultat ou null si aucun résultat.
 */
export async function searchArasaac(
  keyword: string,
  lang = 'fr'
): Promise<ArasaacResult | null> {
  try {
    const res = await fetch(
      `https://api.arasaac.org/v1/pictograms/${lang}/search/${encodeURIComponent(keyword)}`
    )
    if (!res.ok) return null

    const results = await res.json()
    if (!results || results.length === 0) return null

    const first = results[0]
    return {
      id: first._id,
      url: `https://static.arasaac.org/pictograms/${first._id}/${first._id}_500.png`,
      keywords: first.keywords?.map((k: { keyword: string }) => k.keyword) || [],
    }
  } catch {
    return null
  }
}

/**
 * Retourne le texte d'attribution obligatoire Arasaac.
 */
export function getArasaacAttribution(): string {
  return 'Pictogrammes © Arasaac (arasaac.org) — Licence CC BY-NC-SA 4.0'
}
