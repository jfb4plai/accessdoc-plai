// Niveaux scolaires FWB
export type NiveauFWB =
  | 'maternelle'
  | 'primaire'
  | 'secondaire_1'
  | 'secondaire_2'
  | 'secondaire_3'
  | 'specialise'

// Formes de l'enseignement secondaire FWB
export type FormeSecondaire = 'G' | 'TT' | 'TQ' | 'P' | 'A'

// Catégories d'aménagements universels (AU)
export type AUCategorie =
  | 'typographie'
  | 'structure'
  | 'consignes'
  | 'pictogrammes'
  | 'apprentissage'

// Catalogue d'un aménagement universel
export interface AUCatalogue {
  id: string
  categorie: AUCategorie
  libelle: string
  description: string
  regle_application: string
  niveaux_recommandes: NiveauFWB[]
  ordre_application: number
}

// Profil enseignant sauvegardé
export interface TeacherProfile {
  id: string
  user_id: string
  nom_profil: string
  niveau: NiveauFWB
  forme: FormeSecondaire | null
  annee: string | null
  cours: string
  type_specialise: string | null
  forme_specialisee: string | null
  aus_selectionnes: string[]
  is_default: boolean
  created_at: string
  updated_at: string
}

// Type de source du document
export type TypeSource = 'scan_gsm' | 'pdf_natif' | 'pdf_scan' | 'word'

// Document traité
export interface Document {
  id: string
  user_id: string
  teacher_profile_id: string
  nom_fichier_original: string
  type_source: TypeSource
  texte_extrait: string
  structure_json: object
  images_log: ImageDecision[]
  aus_appliques: string[]
  score_ocr_moyen: number | null
  rapport_fidelite: FidelityReport | null
  url_document_accessible: string | null
  statut: 'en_cours' | 'termine' | 'erreur'
  created_at: string
}

// Étape de traitement dans le pipeline
export interface ProcessingStep {
  id: string
  label: string
  status: 'pending' | 'running' | 'done' | 'warning' | 'error'
  detail?: string
}

// Décision prise pour une image lors du traitement
export interface ImageDecision {
  action: 'conserver' | 'remplacer_arasaac' | 'supprimer'
  raison?: string
  picto_id?: number
  picto_url?: string
  alt_text?: string
}

// Résultat d'application d'un AU
export interface AUResult {
  id: string
  libelle: string
  applique: boolean
  note?: string
}

// Rapport de fidélité complet
export interface FidelityReport {
  score_global: number
  aus_appliques: AUResult[]
  images: {
    total: number
    arasaac: number
    conservees: number
    supprimees: number
  }
  alertes_ocr: string[]
  alertes_pedagogiques: string[]
  suggestions: string[]
}

// Bloc de contenu dans un document structuré
export interface DocBloc {
  type: 'titre' | 'consigne' | 'paragraphe' | 'liste' | 'exercice' | 'espace_reponse'
  texte?: string
  niveau?: 1 | 2 | 3
  items?: string[]
  verbeAction?: string
  numero?: number
}

// Document structuré retourné par Claude après application des AUs
export interface StructuredDocument {
  titre: string
  blocs: DocBloc[]
  aus_appliques: AUResult[]
  alertes_pedagogiques: string[]
  mots_cles_pictos?: string[]
}

// Résultat de vérification qualité OCR
export interface QualityResult {
  ok: boolean
  type?: 'blocking' | 'warning'
  zones?: string[]
  message?: string
}
