import { supabase } from './supabase'

const BUCKET = 'ocr-temp'

/**
 * Upload un fichier dans le bucket ocr-temp de Supabase Storage.
 * Retourne l'URL publique accessible par Mistral OCR.
 * Le fichier doit être supprimé après traitement via deleteOcrFile().
 */
export async function uploadForOcr(file: File, userId: string): Promise<string> {
  // Chemin : {userId}/{timestamp}_{nom_fichier}
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `${userId}/${Date.now()}_${safeName}`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, cacheControl: '300' })

  if (error) {
    throw new Error(`Upload Supabase échoué : ${error.message}`)
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

/**
 * Supprime un fichier temporaire du bucket ocr-temp.
 * À appeler après que l'OCR est terminé (succès ou erreur).
 */
export async function deleteOcrFile(publicUrl: string): Promise<void> {
  // Extrait le chemin depuis l'URL publique
  // Format : https://[project].supabase.co/storage/v1/object/public/ocr-temp/{path}
  const marker = `/object/public/${BUCKET}/`
  const idx = publicUrl.indexOf(marker)
  if (idx === -1) return

  const filePath = decodeURIComponent(publicUrl.slice(idx + marker.length))
  await supabase.storage.from(BUCKET).remove([filePath])
}
