import { supabase } from './supabase'
import type { FidelityReport, TypeSource } from '../types'

const BUCKET = 'documents'
const RETENTION_DAYS = 30

interface SaveDocumentParams {
  userId: string
  profileId?: string
  filename: string
  typeSource: TypeSource
  docxBlob: Blob
  ausAppliques: string[]
  ocrScore: number
  fidelityReport: FidelityReport
}

interface SavedDocument {
  id: string
  storagePath: string
  expiresAt: string
}

/**
 * Upload le .docx dans Supabase Storage (bucket 'documents') et
 * enregistre la métadonnée dans la table documents.
 * Retourne l'ID, le chemin et la date d'expiration.
 */
export async function saveDocument(params: SaveDocumentParams): Promise<SavedDocument> {
  const {
    userId, profileId, filename, typeSource,
    docxBlob, ausAppliques, ocrScore, fidelityReport,
  } = params

  // ── 1. Insérer la ligne en base (statut 'en_cours') ──────────────────────
  const expiresAt = new Date(Date.now() + RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const { data: row, error: insertError } = await supabase
    .from('documents')
    .insert({
      user_id: userId,
      teacher_profile_id: profileId ?? null,
      nom_fichier_original: filename,
      type_source: typeSource,
      aus_appliques: ausAppliques,
      score_ocr_moyen: ocrScore,
      rapport_fidelite: fidelityReport,
      statut: 'en_cours',
      expires_at: expiresAt,
    })
    .select('id')
    .single()

  if (insertError || !row) {
    throw new Error(`Erreur enregistrement : ${insertError?.message}`)
  }

  // ── 2. Upload .docx dans Storage ─────────────────────────────────────────
  const storagePath = `${userId}/${row.id}.docx`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, docxBlob, {
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      upsert: true,
    })

  if (uploadError) {
    // Marque en erreur mais ne bloque pas l'utilisateur
    await supabase.from('documents').update({ statut: 'erreur' }).eq('id', row.id)
    throw new Error(`Erreur upload : ${uploadError.message}`)
  }

  // ── 3. Mettre à jour statut + chemin ─────────────────────────────────────
  await supabase
    .from('documents')
    .update({
      statut: 'termine',
      url_document_accessible: storagePath,  // chemin relatif, pas URL directe
    })
    .eq('id', row.id)

  return { id: row.id, storagePath, expiresAt }
}

/**
 * Génère une URL signée (valide 1 heure) pour télécharger un .docx.
 */
export async function getDownloadUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 3600)

  if (error || !data?.signedUrl) {
    throw new Error(`Impossible de générer le lien : ${error?.message}`)
  }
  return data.signedUrl
}

/**
 * Supprime un document (Storage + ligne DB).
 */
export async function deleteDocument(docId: string, storagePath: string): Promise<void> {
  await Promise.all([
    supabase.storage.from(BUCKET).remove([storagePath]),
    supabase.from('documents').delete().eq('id', docId),
  ])
}
