import { Download, Edit3, FileText } from 'lucide-react'

interface DocumentPreviewProps {
  htmlContent: string
  filename?: string
  docxUrl?: string
  onEdit?: () => void
}

export default function DocumentPreview({
  htmlContent,
  filename = 'document-accessible.docx',
  docxUrl = '#',
  onEdit,
}: DocumentPreviewProps) {
  const handleDownload = () => {
    // En production : déclenche le téléchargement depuis Supabase Storage
    // Pour la démo : ouvre l'URL
    if (docxUrl !== '#') {
      const a = document.createElement('a')
      a.href = docxUrl
      a.download = filename
      a.click()
    } else {
      alert('Le fichier sera disponible en téléchargement une fois connecté à Supabase.')
    }
  }

  return (
    <div className="space-y-4">
      {/* Barre d'actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          <span className="text-sm font-medium text-gray-700">Aperçu du document accessible</span>
        </div>
        <div className="flex items-center gap-2">
          {onEdit && (
            <button
              onClick={onEdit}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-300
                         rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Modifier
            </button>
          )}
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-800 hover:bg-blue-900
                       text-white text-sm font-medium rounded-lg transition"
          >
            <Download className="w-3.5 h-3.5" />
            Télécharger .docx
          </button>
        </div>
      </div>

      {/* Cadre d'aperçu simulant un document Word */}
      <div className="border border-gray-300 rounded-xl overflow-hidden shadow-sm bg-white">
        {/* Barre de titre simulant Word */}
        <div className="bg-gray-100 border-b border-gray-200 px-4 py-2 flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <div className="w-3 h-3 rounded-full bg-green-400" />
          <span className="text-xs text-gray-500 ml-2">{filename}</span>
        </div>

        {/* Contenu HTML rendu */}
        <div
          className="min-h-64 overflow-auto"
          style={{
            background: '#fff',
            // Simule les marges d'une page Word A4
            padding: '40px 48px',
            maxHeight: '600px',
          }}
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      </div>

      <p className="text-xs text-gray-400 text-center">
        Cet aperçu est indicatif. Le fichier .docx final peut différer légèrement.
      </p>
    </div>
  )
}
