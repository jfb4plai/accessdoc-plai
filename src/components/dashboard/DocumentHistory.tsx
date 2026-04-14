import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { getDownloadUrl, deleteDocument } from '../../lib/document-saver'
import type { Document } from '../../types'
import {
  FileText, Download, Clock, CheckCircle, XCircle,
  Loader2, Trash2, AlertTriangle,
} from 'lucide-react'

// Jours restants avant expiration
function daysLeft(expiresAt: string): number {
  const diff = new Date(expiresAt).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

function ExpiryBadge({ expiresAt }: { expiresAt?: string }) {
  if (!expiresAt) return null
  const days = daysLeft(expiresAt)
  if (days === 0) return (
    <span className="text-xs text-red-500 font-medium">Expire aujourd'hui</span>
  )
  if (days <= 5) return (
    <span className="flex items-center gap-1 text-xs text-orange-500 font-medium">
      <AlertTriangle className="w-3 h-3" />
      {days}j restants
    </span>
  )
  return (
    <span className="text-xs text-gray-400">{days}j restants</span>
  )
}

function StatusBadge({ statut }: { statut: Document['statut'] }) {
  if (statut === 'termine') return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
      <CheckCircle className="w-3 h-3" /> Terminé
    </span>
  )
  if (statut === 'erreur') return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
      <XCircle className="w-3 h-3" /> Erreur
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
      <Loader2 className="w-3 h-3 animate-spin" /> En cours
    </span>
  )
}

export default function DocumentHistory() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchDocuments = useCallback(async () => {
    setLoading(true)
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const { data } = await supabase
      .from('documents')
      .select('*')
      .gte('created_at', cutoff)           // exclut les docs > 30 jours
      .gt('expires_at', new Date().toISOString())  // exclut les expirés
      .order('created_at', { ascending: false })
      .limit(20)
    setDocuments((data as Document[]) || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchDocuments() }, [fetchDocuments])

  const handleDownload = async (doc: Document) => {
    if (!doc.url_document_accessible) return
    setDownloadingId(doc.id)
    try {
      const url = await getDownloadUrl(doc.url_document_accessible)
      const a = document.createElement('a')
      a.href = url
      a.download = `accessible_${doc.nom_fichier_original.replace(/\.[^.]+$/, '')}.docx`
      a.click()
    } catch (err) {
      console.error('Erreur téléchargement :', err)
      alert('Impossible de télécharger ce document. Le fichier a peut-être expiré.')
    } finally {
      setDownloadingId(null)
    }
  }

  const handleDelete = async (doc: Document) => {
    if (!confirm(`Supprimer définitivement "${doc.nom_fichier_original}" ?`)) return
    setDeletingId(doc.id)
    try {
      await deleteDocument(doc.id, doc.url_document_accessible ?? '')
      setDocuments(prev => prev.filter(d => d.id !== doc.id))
    } catch (err) {
      console.error('Erreur suppression :', err)
    } finally {
      setDeletingId(null)
    }
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('fr-BE', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="w-8 h-8 bg-gray-200 rounded" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-gray-200 rounded w-1/2" />
              <div className="h-3 bg-gray-200 rounded w-1/4" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
        <p className="text-sm">Aucun document converti pour le moment.</p>
        <p className="text-xs mt-1">Les documents sont conservés 30 jours.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-400 mb-3">
        Documents conservés 30 jours · {documents.length} document(s)
      </p>

      {documents.map(doc => {
        const isDownloading = downloadingId === doc.id
        const isDeleting = deletingId === doc.id

        return (
          <div
            key={doc.id}
            className="flex items-center gap-3 p-4 bg-gray-50 hover:bg-blue-50
                       rounded-lg border border-transparent hover:border-blue-200
                       transition group"
          >
            <FileText className="w-7 h-7 text-blue-600 flex-shrink-0" />

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">
                {doc.nom_fichier_original}
              </p>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  {formatDate(doc.created_at)}
                </span>
                {/* @ts-ignore — expires_at n'est pas encore dans le type */}
                <ExpiryBadge expiresAt={doc.expires_at} />
              </div>
            </div>

            <StatusBadge statut={doc.statut} />

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
              {doc.statut === 'termine' && doc.url_document_accessible && (
                <button
                  onClick={() => handleDownload(doc)}
                  disabled={isDownloading}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800
                             font-medium px-2 py-1 rounded hover:bg-blue-100 transition"
                  title="Télécharger le document accessible"
                >
                  {isDownloading
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Download className="w-3.5 h-3.5" />}
                  .docx
                </button>
              )}

              <button
                onClick={() => handleDelete(doc)}
                disabled={isDeleting}
                className="text-gray-400 hover:text-red-500 p-1 rounded
                           hover:bg-red-50 transition"
                title="Supprimer"
              >
                {isDeleting
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Trash2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
