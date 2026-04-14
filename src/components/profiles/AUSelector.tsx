import { useState } from 'react'
import { Info, AlertTriangle } from 'lucide-react'
import type { AUCategorie } from '../../types'

type Niveau = 'critique' | 'important' | 'utile'

interface AUItem {
  id: string
  libelle: string
  description: string
  niveau: Niveau
  warning?: string  // alerte affichée si l'AU est coché
}

interface AUGroup {
  categorie: AUCategorie
  label: string
  couleur: string
  items: AUItem[]
}

const NIVEAU_BADGE: Record<Niveau, string> = {
  critique:  'bg-red-100 text-red-700 border border-red-200',
  important: 'bg-amber-100 text-amber-700 border border-amber-200',
  utile:     'bg-gray-100 text-gray-500 border border-gray-200',
}
const NIVEAU_LABEL: Record<Niveau, string> = {
  critique:  'Critique',
  important: 'Important',
  utile:     'Utile',
}

const AU_GROUPS: AUGroup[] = [
  {
    categorie: 'typographie',
    label: 'Typographie',
    couleur: 'blue',
    items: [
      {
        id: 'typo_arial_12',
        libelle: 'Arial 12 · interligne 1,5',
        description: 'Police sans-serif (Arial) 12pt, interligne 1,5 — base commune pour tous les élèves, y compris dyslexiques.',
        niveau: 'critique',
      },
      {
        id: 'typo_non_justifie',
        libelle: 'Alignement gauche (non justifié)',
        description: 'Texte aligné à gauche : évite les espaces irréguliers qui perturbent le décodage chez les élèves dyslexiques.',
        niveau: 'critique',
      },
      {
        id: 'typo_no_soulignage',
        libelle: 'Supprimer les soulignages décoratifs',
        description: 'Réserver le soulignage aux liens et aux zones à compléter par l\'élève — pas à la mise en forme décorative.',
        niveau: 'utile',
      },
    ],
  },
  {
    categorie: 'structure',
    label: 'Structure',
    couleur: 'green',
    items: [
      {
        id: 'struct_titre_mise_evidence',
        libelle: 'Titres mis en évidence',
        description: 'Titres en gras, taille supérieure, clairement distincts du corps du texte pour faciliter la navigation dans le document.',
        niveau: 'utile',
      },
      {
        id: 'struct_no_distracteurs',
        libelle: 'Supprimer les distracteurs visuels',
        description: 'Retirer les images décoratives, bordures non fonctionnelles et commentaires marginaux qui fragmentent l\'attention.',
        niveau: 'important',
      },
      {
        id: 'struct_commencer_consignes',
        libelle: 'Consignes en premier',
        description: 'Placer les consignes avant le texte ou l\'exercice : l\'élève sait ce qu\'on attend de lui avant de lire.',
        niveau: 'important',
      },
      {
        id: 'struct_numeroter_pages',
        libelle: 'Numéroter les pages',
        description: 'Numérotation systématique des pages pour faciliter la communication élève–enseignant et le repérage.',
        niveau: 'critique',
      },
      {
        id: 'struct_numeroter_exercices',
        libelle: 'Numéroter les exercices',
        description: 'Chaque exercice et sous-question est numéroté dans l\'ordre pour un suivi clair de la progression.',
        niveau: 'critique',
      },
      {
        id: 'struct_no_scinder_tache',
        libelle: 'Ne pas scinder une tâche sur deux pages',
        description: 'Chaque exercice tient sur une seule page — évite les ruptures cognitives en milieu de tâche.',
        niveau: 'important',
      },
      {
        id: 'struct_progression_simple_complexe',
        libelle: 'Progression simple → complexe',
        description: 'Exercices ordonnés du plus accessible au plus exigeant pour soutenir la motivation et la réussite progressive.',
        niveau: 'utile',
      },
    ],
  },
  {
    categorie: 'consignes',
    label: 'Consignes',
    couleur: 'orange',
    items: [
      {
        id: 'consigne_verbe_action_gras',
        libelle: 'Verbe d\'action en gras',
        description: 'Le verbe principal de chaque consigne (souligne, entoure, écris, calcule…) est mis en gras — point d\'entrée visuel immédiat.',
        niveau: 'critique',
      },
      {
        id: 'consigne_formulation_claire',
        libelle: 'Formulation claire et courte',
        description: 'Reformuler les consignes complexes : une idée par phrase, vocabulaire accessible, syntaxe simple.',
        niveau: 'important',
      },
      {
        id: 'consigne_puces_verbe_action',
        libelle: 'Puces — un verbe par puce',
        description: 'Pour les consignes multi-étapes : liste à puces, un verbe d\'action par puce, ordre chronologique.',
        niveau: 'important',
      },
      {
        id: 'consigne_contextualiser',
        libelle: 'Contextualiser l\'objectif',
        description: 'Indiquer pourquoi on fait cet exercice et dans quel cadre — donne du sens et réduit l\'anxiété de performance.',
        niveau: 'important',
      },
      {
        id: 'consigne_modele_resolution',
        libelle: 'Modèle de résolution fourni',
        description: 'Fournir un exemple résolu juste avant l\'exercice — réduit l\'ambiguïté sur ce qui est attendu.',
        niveau: 'utile',
      },
      {
        id: 'consigne_support_adequat',
        libelle: 'Support adéquat à la tâche',
        description: 'Vérifier la cohérence support/tâche : quadrillage pour constructions géométriques, lignes pour production d\'écrits, etc.',
        niveau: 'utile',
      },
      {
        id: 'consigne_evaluation_ciblee',
        libelle: 'Évaluation centrée sur une seule compétence',
        description: 'Vérifier que chaque question évalue uniquement la compétence annoncée, sans interférence d\'autres compétences non ciblées (ex: orthographe dans une éval de compréhension).',
        niveau: 'utile',
      },
    ],
  },
  {
    categorie: 'pictogrammes',
    label: 'Pictogrammes',
    couleur: 'purple',
    items: [
      {
        id: 'picto_arasaac',
        libelle: 'Pictogrammes Arasaac sur les mots-clés',
        description: 'Accompagner les mots-clés et verbes de consigne de pictogrammes Arasaac (libre de droits, API gratuite) — entrée visuelle complémentaire.',
        niveau: 'critique',
      },
      {
        id: 'picto_codes_couleurs',
        libelle: 'Codes couleurs universalisés',
        description: 'Appliquer les codes couleurs conventionnels de l\'établissement (numération, opérateurs, MCDU, lettres, phonèmes, grammaire…).',
        niveau: 'utile',
        warning: 'Nécessite que les codes couleurs aient été définis et partagés à l\'échelle de l\'établissement. AccessDoc appliquera les conventions FWB standard si aucun code école n\'est configuré.',
      },
    ],
  },
  {
    categorie: 'apprentissage',
    label: 'Apprentissage',
    couleur: 'teal',
    items: [
      {
        id: 'appr_bloom_progression',
        libelle: 'Progression selon Bloom',
        description: 'Ordonner les tâches selon la taxonomie révisée de Bloom : mémoriser → comprendre → appliquer → analyser → évaluer → créer.',
        niveau: 'important',
      },
      {
        id: 'appr_exemples_contre_exemples',
        libelle: 'Exemples ET contre-exemples',
        description: 'Fournir des exemples corrects et des contre-exemples explicites pour délimiter clairement les frontières du concept.',
        niveau: 'utile',
      },
      {
        id: 'appr_demo_etape_etape',
        libelle: 'Démonstration étape par étape',
        description: 'Décomposer les procédures en étapes numérotées, une action par étape, avec mise en évidence de la séquence.',
        niveau: 'important',
      },
      {
        id: 'appr_revision_prerequis',
        libelle: 'Rappel des prérequis',
        description: 'Inclure un encart de révision des notions prérequises avant d\'aborder un nouveau concept.',
        niveau: 'important',
      },
      {
        id: 'appr_zones_autocorrection',
        libelle: 'Zones d\'auto-vérification',
        description: 'Prévoir des espaces d\'autocorrection ou de validation après chaque exercice (corrigé intégré, case à cocher, zone de vérification).',
        niveau: 'utile',
      },
      {
        id: 'appr_validation_intermediaire',
        libelle: 'Points de contrôle intermédiaires',
        description: 'Inclure des jalons de compréhension entre les exercices pour que l\'élève confirme sa compréhension avant de progresser.',
        niveau: 'utile',
      },
    ],
  },
]

const COLOR_CLASSES: Record<string, { badge: string; border: string; check: string }> = {
  blue:   { badge: 'bg-blue-50 text-blue-800',    border: 'border-blue-200',   check: 'accent-blue-700' },
  green:  { badge: 'bg-green-50 text-green-800',  border: 'border-green-200',  check: 'accent-green-700' },
  orange: { badge: 'bg-orange-50 text-orange-800', border: 'border-orange-200', check: 'accent-orange-600' },
  purple: { badge: 'bg-purple-50 text-purple-800', border: 'border-purple-200', check: 'accent-purple-700' },
  teal:   { badge: 'bg-teal-50 text-teal-800',    border: 'border-teal-200',   check: 'accent-teal-700' },
}

interface AUSelectorProps {
  selectedAUs: string[]
  onChange: (updated: string[]) => void
}

export default function AUSelector({ selectedAUs, onChange }: AUSelectorProps) {
  const [tooltip, setTooltip] = useState<string | null>(null)

  const toggle = (id: string) => {
    onChange(
      selectedAUs.includes(id)
        ? selectedAUs.filter(a => a !== id)
        : [...selectedAUs, id]
    )
  }

  const toggleAll = (group: AUGroup) => {
    const ids = group.items.map(i => i.id)
    const allSelected = ids.every(id => selectedAUs.includes(id))
    onChange(
      allSelected
        ? selectedAUs.filter(id => !ids.includes(id))
        : Array.from(new Set([...selectedAUs, ...ids]))
    )
  }

  const totalAll = AU_GROUPS.flatMap(g => g.items).length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm text-gray-500">
          <span className="font-medium text-gray-700">{selectedAUs.length}</span>
          /{totalAll} aménagement{selectedAUs.length !== 1 ? 's' : ''} sélectionné{selectedAUs.length !== 1 ? 's' : ''}
        </p>
        <button
          type="button"
          onClick={() => onChange([])}
          className="text-xs text-gray-400 hover:text-red-500 transition"
        >
          Tout désélectionner
        </button>
      </div>

      {/* Légende niveaux */}
      <div className="flex gap-2 flex-wrap text-xs pb-1">
        {(['critique', 'important', 'utile'] as Niveau[]).map(n => (
          <span key={n} className={`px-2 py-0.5 rounded-full text-xs font-medium ${NIVEAU_BADGE[n]}`}>
            {NIVEAU_LABEL[n]}
          </span>
        ))}
        <span className="text-gray-400 self-center">— impact sur l'accessibilité</span>
      </div>

      {AU_GROUPS.map(group => {
        const colors = COLOR_CLASSES[group.couleur]
        const allSelected = group.items.every(i => selectedAUs.includes(i.id))
        const someSelected = group.items.some(i => selectedAUs.includes(i.id))
        const countSelected = group.items.filter(i => selectedAUs.includes(i.id)).length

        return (
          <div key={group.categorie} className={`border ${colors.border} rounded-xl overflow-hidden`}>
            {/* En-tête de catégorie */}
            <div className={`flex items-center justify-between px-4 py-2.5 ${colors.badge}`}>
              <span className="text-sm font-semibold">
                {group.label}
                {countSelected > 0 && (
                  <span className="ml-2 text-xs font-normal opacity-70">
                    {countSelected}/{group.items.length}
                  </span>
                )}
              </span>
              <button
                type="button"
                onClick={() => toggleAll(group)}
                className="text-xs underline opacity-60 hover:opacity-100 transition"
              >
                {allSelected ? 'Désélectionner tout' : someSelected ? 'Tout sélectionner' : 'Tout sélectionner'}
              </button>
            </div>

            {/* Items */}
            <div className="divide-y divide-gray-100 bg-white">
              {group.items.map(item => {
                const isChecked = selectedAUs.includes(item.id)
                return (
                  <div key={item.id}>
                    <label className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggle(item.id)}
                        className={`mt-0.5 w-4 h-4 rounded flex-shrink-0 ${colors.check}`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-gray-800">{item.libelle}</span>
                          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${NIVEAU_BADGE[item.niveau]}`}>
                            {NIVEAU_LABEL[item.niveau]}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onMouseEnter={() => setTooltip(item.id)}
                        onMouseLeave={() => setTooltip(null)}
                        onClick={e => { e.preventDefault(); setTooltip(tooltip === item.id ? null : item.id) }}
                        className="relative flex-shrink-0 text-gray-300 hover:text-blue-500 transition"
                        aria-label={`Description : ${item.libelle}`}
                      >
                        <Info className="w-4 h-4" />
                        {tooltip === item.id && (
                          <div className="absolute right-0 top-6 z-20 w-72 bg-gray-800 text-white
                                          text-xs rounded-lg p-3 shadow-xl leading-relaxed">
                            {item.description}
                          </div>
                        )}
                      </button>
                    </label>
                    {/* Warning si AU coché et nécessite configuration */}
                    {item.warning && isChecked && (
                      <div className="mx-4 mb-2 flex gap-2 bg-amber-50 border border-amber-200
                                      rounded-lg px-3 py-2 text-xs text-amber-700">
                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                        <span>{item.warning}</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
