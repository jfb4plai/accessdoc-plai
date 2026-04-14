import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import type { Document } from '../../types'
import { FileText, Download, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react'

export default function DocumentHistory() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDocuments = async () => {
      const { data } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)

      setDocuments((data as Document[]) || [])
      setLoading(false)
    }
    fetchDocuments()
  }, [])

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('fr-BE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const StatusBadge = ({ statut }: { statut: Document['statut'] }) => {
    if (statut === 'termine') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
          <CheckCircle className="w-3 h-3" /> Terminé
        </span>
      )
    }
    if (statut === 'erreur') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
          <XCircle className="w-3 h-3" /> Erreur
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
        <Loader2 className="w-3 h-3 animate-spin" /> En cours
      </span>
    )
  }

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
        <p className="text-xs mt-1">Glissez-déposez un fichier pour commencer.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {documents.map(doc => (
        <div
          key={doc.id}
          className="flex items-center gap-4 p-4 bg-gray-50 hover:bg-blue-50 rounded-lg
                     border border-transparent hover:border-blue-200 transition group"
        >
          <FileText className="w-8 h-8 text-blue-600 flex-shrink-0" />

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">
              {doc.nom_fichier_original}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <Clock className="w-3 h-3 text-gray-400" />
              <span className="text-xs text-gray-500">{formatDate(doc.created_at)}</span>
            </div>
          </div>

          <StatusBadge statut={doc.statut} />

          {doc.statut === 'termine' && doc.url_document_accessible && (
            <a
              href={doc.url_document_accessible}
              download
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800
                         font-medium opacity-0 group-hover:opacity-100 transition"
              title="Télécharger le document accessible"
            >
              <Download className="w-4 h-4" />
              .docx
            </a>
          )}
        </div>
      ))}
    </div>
  )
}
