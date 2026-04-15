import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useProfiles } from '../../hooks/useProfiles'
import AUSelector from './AUSelector'
import type { NiveauFWB, FormeSecondaire, TeacherProfile } from '../../types'
import { Save, ArrowLeft, Loader2 } from 'lucide-react'



const NIVEAUX: { value: NiveauFWB; label: string }[] = [
  { value: 'maternelle',    label: 'Maternelle' },
  { value: 'primaire',      label: 'Primaire' },
  { value: 'secondaire_1',  label: 'Secondaire 1er degré' },
  { value: 'secondaire_2',  label: 'Secondaire 2ème degré' },
  { value: 'secondaire_3',  label: 'Secondaire 3ème degré' },
  { value: 'specialise',    label: 'Enseignement spécialisé' },
]

const FORMES: { value: FormeSecondaire; label: string }[] = [
  { value: 'G',  label: 'Général (G)' },
  { value: 'TT', label: 'Technique de Transition (TT)' },
  { value: 'TQ', label: 'Technique de Qualification (TQ)' },
  { value: 'P',  label: 'Professionnelle (P)' },
  { value: 'A',  label: 'Artistique (A)' },
]

const ANNEES_PRIMAIRE = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6']
const ANNEES_SEC1 = ['S1', 'S2']
const ANNEES_SEC23 = ['S3', 'S4', 'S5', 'S6']
const TYPES_SPECIALISE = ['1', '2', '3', '4', '5', '6', '7', '8']
const FORMES_SPECIALISE = ['1', '2', '3', '4']

interface FormState {
  nom_profil: string
  niveau: NiveauFWB
  forme: FormeSecondaire | ''
  annee: string
  cours: string
  type_specialise: string
  forme_specialisee: string
  aus_selectionnes: string[]
  is_default: boolean
}

const DEFAULT_FORM: FormState = {
  nom_profil: '',
  niveau: 'primaire',
  forme: '',
  annee: '',
  cours: '',
  type_specialise: '',
  forme_specialisee: '',
  aus_selectionnes: [],
  is_default: false,
}

export default function ProfileEditor() {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const { profiles, createProfile, updateProfile } = useProfiles()
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isEdit = Boolean(id)

  // Charge le profil existant en mode édition
  useEffect(() => {
    if (isEdit && id && profiles.length > 0) {
      const existing = profiles.find(p => p.id === id)
      if (existing) {
        setForm({
          nom_profil: existing.nom_profil,
          niveau: existing.niveau,
          forme: existing.forme ?? '',
          annee: existing.annee ?? '',
          cours: existing.cours,
          type_specialise: existing.type_specialise ?? '',
          forme_specialisee: existing.forme_specialisee ?? '',
          aus_selectionnes: existing.aus_selectionnes,
          is_default: existing.is_default,
        })
      }
    }
  }, [isEdit, id, profiles])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nom_profil.trim()) {
      setError('Le nom du profil est obligatoire.')
      return
    }

    setSaving(true)
    setError(null)

    const payload: Omit<TeacherProfile, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
      nom_profil: form.nom_profil.trim(),
      niveau: form.niveau,
      forme: form.forme as FormeSecondaire | null || null,
      annee: form.annee || null,
      cours: form.cours.trim(),
      type_specialise: form.type_specialise || null,
      forme_specialisee: form.forme_specialisee || null,
      aus_selectionnes: form.aus_selectionnes,
      is_default: form.is_default,
    }

    let success = false
    if (isEdit && id) {
      success = await updateProfile(id, payload)
    } else {
      const created = await createProfile(payload)
      success = created !== null
    }

    setSaving(false)

    if (success) {
      navigate('/dashboard')
    } else {
      setError('Erreur lors de l\'enregistrement. Veuillez réessayer.')
    }
  }

  // Détermine les champs conditionnels selon le niveau
  const showAnneesPrimaire   = form.niveau === 'primaire'
  const showAnneesSec1       = form.niveau === 'secondaire_1'
  const showFormeSec23       = form.niveau === 'secondaire_2' || form.niveau === 'secondaire_3'
  const showAnnesSec23       = showFormeSec23
  const showSpecialise       = form.niveau === 'specialise'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-blue-900 text-white shadow-md">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-blue-300 hover:text-white transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <img src="/plai-logo.jpg" alt="PLAI" className="h-9 w-auto rounded" />
          <h1 className="text-lg font-bold">
            {isEdit ? 'Modifier le profil' : 'Nouveau profil enseignant'}
          </h1>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Informations de base */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
          <h2 className="text-base font-semibold text-gray-800">Informations du profil</h2>

          {/* Nom du profil */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom du profil <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.nom_profil}
              onChange={e => set('nom_profil', e.target.value)}
              placeholder="Ex. : Mes P3 — Maths"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Niveau */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Niveau scolaire
            </label>
            <select
              value={form.niveau}
              onChange={e => set('niveau', e.target.value as NiveauFWB)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {NIVEAUX.map(n => (
                <option key={n.value} value={n.value}>{n.label}</option>
              ))}
            </select>
          </div>

          {/* Année — Primaire */}
          {showAnneesPrimaire && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Année</label>
              <div className="flex gap-2 flex-wrap">
                {ANNEES_PRIMAIRE.map(a => (
                  <button
                    key={a} type="button"
                    onClick={() => set('annee', a)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition border
                                ${form.annee === a
                                  ? 'bg-blue-700 text-white border-blue-700'
                                  : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                                }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Année — Secondaire 1er degré */}
          {showAnneesSec1 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Année</label>
              <div className="flex gap-2">
                {ANNEES_SEC1.map(a => (
                  <button
                    key={a} type="button"
                    onClick={() => set('annee', a)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition border
                                ${form.annee === a
                                  ? 'bg-blue-700 text-white border-blue-700'
                                  : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                                }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Forme + Année — Secondaire 2ème/3ème degré */}
          {showFormeSec23 && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Forme</label>
                <div className="flex gap-2 flex-wrap">
                  {FORMES.map(f => (
                    <button
                      key={f.value} type="button"
                      onClick={() => set('forme', f.value)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition border
                                  ${form.forme === f.value
                                    ? 'bg-blue-700 text-white border-blue-700'
                                    : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                                  }`}
                      title={f.label}
                    >
                      {f.value}
                    </button>
                  ))}
                </div>
              </div>
              {showAnnesSec23 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Année</label>
                  <div className="flex gap-2 flex-wrap">
                    {ANNEES_SEC23.map(a => (
                      <button
                        key={a} type="button"
                        onClick={() => set('annee', a)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition border
                                    ${form.annee === a
                                      ? 'bg-blue-700 text-white border-blue-700'
                                      : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                                    }`}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Enseignement spécialisé */}
          {showSpecialise && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type (1–8)
                </label>
                <select
                  value={form.type_specialise}
                  onChange={e => set('type_specialise', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">— Choisir —</option>
                  {TYPES_SPECIALISE.map(t => (
                    <option key={t} value={t}>Type {t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Forme (1–4)
                </label>
                <select
                  value={form.forme_specialisee}
                  onChange={e => set('forme_specialisee', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">— Choisir —</option>
                  {FORMES_SPECIALISE.map(f => (
                    <option key={f} value={f}>Forme {f}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Cours / matière */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cours / matière
            </label>
            <input
              type="text"
              value={form.cours}
              onChange={e => set('cours', e.target.value)}
              placeholder="Ex. : Français, Mathématiques, Sciences…"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Profil par défaut */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_default}
              onChange={e => set('is_default', e.target.checked)}
              className="w-4 h-4 accent-blue-700"
            />
            <span className="text-sm text-gray-700">
              Définir comme profil par défaut
            </span>
          </label>
        </section>

        {/* Sélection des AU */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">
            Aménagements universels à appliquer
          </h2>
          <AUSelector
            selectedAUs={form.aus_selectionnes}
            onChange={aus => set('aus_selectionnes', aus)}
          />
        </section>

        {/* Erreur + boutons */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex gap-3 justify-end pb-8">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="px-5 py-2.5 rounded-lg border border-gray-300 text-sm font-medium
                       text-gray-700 hover:bg-gray-50 transition"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-800 hover:bg-blue-900
                       text-white text-sm font-medium rounded-lg transition
                       disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Enregistrement…</>
            ) : (
              <><Save className="w-4 h-4" /> Enregistrer le profil</>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
