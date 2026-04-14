import { useNavigate } from 'react-router-dom'
import { useProfiles } from '../../hooks/useProfiles'
import { Edit2, Trash2, Star, StarOff, Loader2, PlusCircle } from 'lucide-react'
import type { TeacherProfile } from '../../types'

const NIVEAU_LABELS: Record<string, string> = {
  maternelle:   'Maternelle',
  primaire:     'Primaire',
  secondaire_1: 'Secondaire 1er',
  secondaire_2: 'Secondaire 2ème',
  secondaire_3: 'Secondaire 3ème',
  specialise:   'Spécialisé',
}

export default function ProfileList() {
  const navigate = useNavigate()
  const { profiles, loading, deleteProfile, setDefaultProfile } = useProfiles()

  const handleDelete = async (profile: TeacherProfile) => {
    if (!window.confirm(`Supprimer le profil « ${profile.nom_profil} » ?`)) return
    await deleteProfile(profile.id)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-400 gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Chargement des profils…</span>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {profiles.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 text-sm mb-4">Aucun profil enregistré.</p>
          <button
            onClick={() => navigate('/profils/nouveau')}
            className="inline-flex items-center gap-2 bg-blue-800 text-white text-sm
                       font-medium px-4 py-2.5 rounded-lg hover:bg-blue-900 transition"
          >
            <PlusCircle className="w-4 h-4" />
            Créer un profil
          </button>
        </div>
      ) : (
        <>
          {profiles.map(profile => (
            <div
              key={profile.id}
              className={`flex items-center gap-4 p-4 rounded-xl border transition
                          ${profile.is_default
                            ? 'border-blue-300 bg-blue-50'
                            : 'border-gray-200 bg-white hover:border-blue-200 hover:bg-gray-50'
                          }`}
            >
              {/* Étoile par défaut */}
              <button
                onClick={() => setDefaultProfile(profile.id)}
                className={`flex-shrink-0 transition
                            ${profile.is_default ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-400'}`}
                title={profile.is_default ? 'Profil par défaut' : 'Définir comme profil par défaut'}
              >
                {profile.is_default
                  ? <Star className="w-5 h-5 fill-yellow-500" />
                  : <StarOff className="w-5 h-5" />
                }
              </button>

              {/* Infos profil */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">
                  {profile.nom_profil}
                  {profile.is_default && (
                    <span className="ml-2 text-xs text-blue-600 font-normal">par défaut</span>
                  )}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded">
                    {NIVEAU_LABELS[profile.niveau]}
                  </span>
                  {profile.annee && (
                    <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded">
                      {profile.annee}
                    </span>
                  )}
                  {profile.forme && (
                    <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded">
                      Forme {profile.forme}
                    </span>
                  )}
                  {profile.cours && (
                    <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded">
                      {profile.cours}
                    </span>
                  )}
                  <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded">
                    {profile.aus_selectionnes.length} AU
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => navigate(`/profils/${profile.id}`)}
                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50
                             rounded-lg transition"
                  title="Modifier"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(profile)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50
                             rounded-lg transition"
                  title="Supprimer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          <div className="pt-2 text-center">
            <button
              onClick={() => navigate('/profils/nouveau')}
              className="inline-flex items-center gap-2 text-sm text-blue-700
                         hover:text-blue-900 font-medium transition"
            >
              <PlusCircle className="w-4 h-4" />
              Ajouter un profil
            </button>
          </div>
        </>
      )}
    </div>
  )
}
