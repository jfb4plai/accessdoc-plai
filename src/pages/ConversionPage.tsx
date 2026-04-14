import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { usePipeline } from '../hooks/usePipeline'
import ProcessingPipeline from '../components/conversion/ProcessingPipeline'
import DocumentPreview from '../components/conversion/DocumentPreview'
import FidelityReport from '../components/report/FidelityReport'
import UploadZone from '../components/conversion/UploadZone'
import { BookOpen, ArrowLeft, RefreshCw } from 'lucide-react'
import type { TeacherProfile } from '../types'

interface LocationState {
  file?: File
  profile?: TeacherProfile | null
}

export default function ConversionPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const state = (location.state as LocationState) || {}
  const { file, profile } = state

  const { steps, isProcessing, result, error, startProcessing, reset } = usePipeline()

  // Démarre automatiquement le traitement si un fichier est passé en state
  useEffect(() => {
    if (file) {
      const aus = profile?.aus_selectionnes ?? []
      // Crée un profil minimal si aucun profil n'est sélectionné
      const safeProfile: TeacherProfile = profile ?? {
        id: 'temp',
        user_id: 'temp',
        nom_profil: 'Sans profil',
        niveau: 'primaire',
        forme: null,
        annee: null,
        cours: '',
        type_specialise: null,
        forme_specialisee: null,
        aus_selectionnes: [],
        is_default: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      startProcessing(file, safeProfile, aus)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Ne s'exécute qu'au montage

  const handleNewFile = (newFile: File) => {
    reset()
    const safeProfile: TeacherProfile = profile ?? {
      id: 'temp',
      user_id: 'temp',
      nom_profil: 'Sans profil',
      niveau: 'primaire',
      forme: null,
      annee: null,
      cours: '',
      type_specialise: null,
      forme_specialisee: null,
      aus_selectionnes: [],
      is_default: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    startProcessing(newFile, safeProfile, safeProfile.aus_selectionnes)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-blue-900 text-white shadow-md">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-blue-300 hover:text-white transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <BookOpen className="w-5 h-5" />
          <h1 className="text-lg font-bold">Conversion en cours</h1>
          {profile && (
            <span className="text-blue-300 text-sm ml-2">
              Profil : {profile.nom_profil}
            </span>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Pas de fichier → zone d'upload */}
        {!file && steps.length === 0 && (
          <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Choisir un document à convertir
            </h2>
            <UploadZone onFileSelected={handleNewFile} />
          </section>
        )}

        {/* Pipeline de traitement */}
        {steps.length > 0 && (
          <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              {isProcessing ? 'Traitement en cours…' : error ? 'Erreur de traitement' : 'Traitement terminé'}
            </h2>
            <ProcessingPipeline steps={steps} />

            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
                {error}
              </div>
            )}

            {!isProcessing && (
              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => { reset(); navigate('/dashboard') }}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300
                             rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Retour au tableau de bord
                </button>
                <button
                  onClick={reset}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300
                             rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition"
                >
                  <RefreshCw className="w-4 h-4" />
                  Nouveau document
                </button>
              </div>
            )}
          </section>
        )}

        {/* Résultats : aperçu + rapport côte à côte sur grands écrans */}
        {result && !isProcessing && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">
                Document accessible
              </h2>
              <DocumentPreview
                htmlContent={result.htmlPreview}
                filename={file ? `accessible_${file.name.replace(/\.[^.]+$/, '')}.docx` : 'document-accessible.docx'}
                docxUrl={result.docxUrl}
              />
            </section>

            <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">
                Rapport de fidélité
              </h2>
              <FidelityReport report={result.fidelityReport} />
            </section>
          </div>
        )}
      </main>
    </div>
  )
}
