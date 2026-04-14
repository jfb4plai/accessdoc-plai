import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useProfiles } from '../../hooks/useProfiles'
import UploadZone from '../conversion/UploadZone'
import DocumentHistory from './DocumentHistory'
import {
  LogOut, PlusCircle, User, ChevronDown,
  Star, Edit2, Loader2
} from 'lucide-react'
import type { TeacherProfile } from '../../types'

const NIVEAU_LABELS: Record<string, string> = {
  maternelle: 'Maternelle',
  primaire: 'Primaire',
  secondaire_1: 'Secondaire 1er degré',
  secondaire_2: 'Secondaire 2ème degré',
  secondaire_3: 'Secondaire 3ème degré',
  specialise: 'Enseignement spécialisé',
}

export default function Dashboard() {
  const { user, signOut } = useAuth()
  const { profiles, loading: profilesLoading } = useProfiles()
  const navigate = useNavigate()
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const defaultProfile = profiles.find(p => p.is_default) ?? profiles[0] ?? null
  const activeProfileId = selectedProfileId ?? defaultProfile?.id ?? null
  const activeProfile: TeacherProfile | null = profiles.find(p => p.id === activeProfileId) ?? null

  const handleFileSelected = (file: File) => {
    navigate('/conversion', { state: { file, profile: activeProfile } })
  }

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-blue-900 text-white shadow-md">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/plai-logo.svg" alt="PLAI" className="h-8 w-auto brightness-0 invert" />
            <span className="font-bold text-lg">AccessDoc PLAI</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-blue-200 text-sm hidden sm:block">{user?.email}</span>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1 text-sm text-blue-200 hover:text-white
                         transition px-3 py-1.5 rounded-lg hover:bg-blue-800"
            >
              <LogOut className="w-4 h-4" />
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Sélecteur de profil */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-700" />
              Profil enseignant
            </h2>
            <button
              onClick={() => navigate('/profils/nouveau')}
              className="flex items-center gap-1.5 text-sm text-blue-700 hover:text-blue-900
                         font-medium transition"
            >
              <PlusCircle className="w-4 h-4" />
              Nouveau profil
            </button>
          </div>

          {profilesLoading ? (
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Chargement des profils…
            </div>
          ) : profiles.length === 0 ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
              Aucun profil enregistré.{' '}
              <button
                onClick={() => navigate('/profils/nouveau')}
                className="underline font-medium"
              >
                Créez votre premier profil
              </button>{' '}
              pour personnaliser les aménagements universels appliqués.
            </div>
          ) : (
            <div className="flex items-center gap-3">
              {/* Dropdown profil */}
              <div className="relative flex-1 max-w-xs">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="w-full flex items-center justify-between gap-2 px-4 py-2.5
                             border border-gray-300 rounded-lg text-sm bg-white
                             hover:border-blue-400 transition"
                >
                  <span className="truncate">
                    {activeProfile ? activeProfile.nom_profil : 'Sélectionner un profil'}
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                </button>

                {dropdownOpen && (
                  <div className="absolute z-10 top-full left-0 mt-1 w-full bg-white border
                                  border-gray-200 rounded-lg shadow-lg overflow-hidden">
                    {profiles.map(p => (
                      <button
                        key={p.id}
                        onClick={() => { setSelectedProfileId(p.id); setDropdownOpen(false) }}
                        className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm
                                    hover:bg-blue-50 transition text-left
                                    ${p.id === activeProfileId ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'}`}
                      >
                        {p.is_default && <Star className="w-3 h-3 text-yellow-500 flex-shrink-0" />}
                        <span className="truncate">{p.nom_profil}</span>
                        <span className="ml-auto text-xs text-gray-400 flex-shrink-0">
                          {NIVEAU_LABELS[p.niveau] ?? p.niveau}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Infos profil actif */}
              {activeProfile && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span className="bg-gray-100 px-2 py-1 rounded text-xs">
                    {NIVEAU_LABELS[activeProfile.niveau]}
                  </span>
                  {activeProfile.cours && (
                    <span className="bg-gray-100 px-2 py-1 rounded text-xs">
                      {activeProfile.cours}
                    </span>
                  )}
                  <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">
                    {activeProfile.aus_selectionnes.length} AU
                  </span>
                </div>
              )}

              {activeProfile && (
                <button
                  onClick={() => navigate(`/profils/${activeProfile.id}`)}
                  className="text-gray-400 hover:text-blue-600 transition"
                  title="Modifier ce profil"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </section>

        {/* Zone de dépôt */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Convertir un document
          </h2>
          {!activeProfile && profiles.length > 0 && (
            <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
              Sélectionnez un profil enseignant pour personnaliser les aménagements appliqués.
            </div>
          )}
          <UploadZone onFileSelected={handleFileSelected} />
        </section>

        {/* Historique des documents */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Documents récents
          </h2>
          <DocumentHistory />
        </section>
      </main>
    </div>
  )
}
