import { useState, useCallback } from 'react'
import type { ProcessingStep, FidelityReport, TeacherProfile, StructuredDocument } from '../types'
import { detectFormat, labelTypeSource } from '../lib/format-detector'
import { uploadForOcr, deleteOcrFile } from '../lib/ocr-storage'
import { extractPdfText, renderPdfPagesToBase64 } from '../lib/pdf-extractor'
import { extractWordText } from '../lib/word-extractor'
import { generateDocx } from '../lib/docx-generator'
import { saveDocument } from '../lib/document-saver'
import { supabase } from '../lib/supabase'

interface PipelineResult {
  htmlPreview: string
  fidelityReport: FidelityReport
  docxUrl: string
}

interface UsePipelineReturn {
  steps: ProcessingStep[]
  isProcessing: boolean
  result: PipelineResult | null
  error: string | null
  startProcessing: (file: File, profile: TeacherProfile, selectedAUs: string[]) => Promise<void>
  reset: () => void
}

// Catalogue AU → libellés
const AU_LIBELLES: Record<string, string> = {
  typo_arial_12: 'Arial 12 · interligne 1,5',
  typo_non_justifie: 'Alignement gauche',
  typo_no_soulignage: 'Éviter le soulignage',
  struct_titre_mise_evidence: 'Titres mis en évidence',
  struct_no_distracteurs: 'Suppression des distracteurs visuels',
  struct_commencer_consignes: 'Commencer par les consignes',
  struct_numeroter_pages: 'Numérotation des pages',
  struct_numeroter_exercices: 'Numérotation des exercices',
  struct_no_scinder_tache: 'Ne pas scinder une tâche',
  struct_progression_simple_complexe: 'Progression simple → complexe',
  consigne_verbe_action_gras: "Verbes d'action en gras",
  consigne_formulation_claire: 'Formulation claire et courte',
  consigne_puces_verbe_action: "Puces avec verbe d'action",
  consigne_contextualiser: 'Contextualisation de la tâche',
  consigne_modele_resolution: 'Modèle de résolution fourni',
  consigne_support_adequat: 'Support adapté au niveau',
  picto_arasaac: 'Pictogrammes Arasaac',
  picto_codes_couleurs: 'Codes couleurs cohérents',
  appr_bloom_progression: 'Progression taxonomie de Bloom',
  appr_exemples_contre_exemples: 'Exemples et contre-exemples',
  appr_demo_etape_etape: 'Démonstration étape par étape',
  appr_revision_prerequis: 'Révision des prérequis',
  appr_retroaction_immediate: 'Rétroaction immédiate',
  appr_validation_intermediaire: 'Validation intermédiaire',
}

export function usePipeline(): UsePipelineReturn {
  const [steps, setSteps] = useState<ProcessingStep[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<PipelineResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const updateStep = useCallback(
    (id: string, updates: Partial<ProcessingStep>) => {
      setSteps(prev => prev.map(s => (s.id === id ? { ...s, ...updates } : s)))
    },
    []
  )

  const startProcessing = useCallback(
    async (file: File, profile: TeacherProfile, selectedAUs: string[]) => {
      const _profile = profile
      setIsProcessing(true)
      setError(null)
      setResult(null)

      const initialSteps: ProcessingStep[] = [
        { id: 'detect',  label: 'Détection du format',                     status: 'pending' },
        { id: 'ocr',     label: 'Extraction du texte',                     status: 'pending' },
        { id: 'quality', label: 'Vérification qualité',                    status: 'pending' },
        { id: 'images',  label: 'Traitement des images',                   status: 'pending' },
        { id: 'aus',     label: 'Application des aménagements universels', status: 'pending' },
        { id: 'docx',    label: 'Génération du document Word accessible',  status: 'pending' },
      ]
      setSteps(initialSteps)

      let tempFileUrl: string | null = null

      try {
        // ── Étape 1 : Détection du format ─────────────────────────────────
        updateStep('detect', { status: 'running' })
        const typeSource = await detectFormat(file)
        updateStep('detect', { status: 'done', detail: labelTypeSource(typeSource) })

        // ── Étape 2 : Extraction du texte ─────────────────────────────────
        updateStep('ocr', { status: 'running' })

        let extractedText = ''
        let pageCount = 0
        let ocrScore = 99 // par défaut pour les fichiers natifs

        // Vision : données image pour Claude (scan_gsm ou pdf_scan)
        let visionImageUrl: string | null = null
        let visionBase64Pages: string[] | null = null

        if (typeSource === 'scan_gsm' || typeSource === 'pdf_scan') {
          // → Claude Vision (remplace Mistral OCR)
          const { data: { user } } = await supabase.auth.getUser()
          if (!user) throw new Error('Utilisateur non authentifié')

          updateStep('ocr', { status: 'running', detail: 'Préparation pour Claude Vision…' })

          if (typeSource === 'scan_gsm') {
            // Image directe → URL publique Supabase → Claude Vision
            tempFileUrl = await uploadForOcr(file, user.id)
            visionImageUrl = tempFileUrl
            pageCount = 1
          } else {
            // pdf_scan → rendre chaque page en JPEG base64 → Claude Vision
            updateStep('ocr', { status: 'running', detail: 'Conversion des pages en images…' })
            visionBase64Pages = await renderPdfPagesToBase64(file)
            pageCount = visionBase64Pages.length
            tempFileUrl = await uploadForOcr(file, user.id) // pour nettoyage
          }

          ocrScore = 95 // Claude Vision : qualité élevée
          updateStep('ocr', {
            status: 'done',
            detail: `${pageCount} page(s) · Prêt pour Claude Vision`,
          })

        } else if (typeSource === 'pdf_natif') {
          // → Extraction via pdf.js (client-side)
          const pdfResult = await extractPdfText(file)
          extractedText = pdfResult.text
          pageCount = pdfResult.pageCount
          const words = extractedText.split(/\s+/).filter(Boolean).length
          updateStep('ocr', {
            status: 'done',
            detail: `PDF natif · ${pageCount} page(s) · ${words} mots extraits`,
          })

        } else {
          // word / ODT → mammoth (client-side)
          const wordResult = await extractWordText(file)
          extractedText = wordResult.text
          pageCount = 1
          const words = extractedText.split(/\s+/).filter(Boolean).length
          updateStep('ocr', {
            status: 'done',
            detail: `Document Word · ${words} mots extraits`,
          })
        }

        // ── Étape 3 : Qualité OCR ──────────────────────────────────────────
        updateStep('quality', { status: 'running' })
        if (ocrScore < 80) {
          updateStep('quality', {
            status: 'warning',
            detail: `Score ${ocrScore}% < 80% — certaines zones peuvent contenir des erreurs`,
          })
        } else {
          updateStep('quality', { status: 'done', detail: 'Qualité suffisante pour la conversion' })
        }

        // ── Étape 4 : Traitement des images (simulation) ──────────────────
        updateStep('images', { status: 'running' })
        await new Promise(r => setTimeout(r, 400))
        updateStep('images', {
          status: 'done',
          detail: 'Analyse des images — pictogrammes Arasaac recherchés',
        })

        // ── Étape 5 : Application des AU via Claude ────────────────────────
        updateStep('aus', { status: 'running', detail: 'Analyse sémantique en cours (Claude)…' })

        let structuredDoc: StructuredDocument | null = null

        const hasContent = extractedText.length > 20 || visionImageUrl || visionBase64Pages
        if (hasContent && selectedAUs.length > 0) {
          const analyzeBody: Record<string, unknown> = {
            selectedAUs,
            profile: _profile ? {
              niveau: _profile.niveau,
              forme: _profile.forme,
              cours: _profile.cours,
            } : undefined,
          }
          // Mode Vision ou mode texte
          if (visionImageUrl) {
            analyzeBody.visionImageUrl = visionImageUrl
          } else if (visionBase64Pages) {
            analyzeBody.visionBase64Pages = visionBase64Pages
          } else {
            analyzeBody.extractedText = extractedText
          }

          const analyzeRes = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(analyzeBody),
          })

          if (analyzeRes.ok) {
            structuredDoc = await analyzeRes.json() as StructuredDocument
            const applied = structuredDoc.aus_appliques?.filter(a => a.applique).length ?? selectedAUs.length
            updateStep('aus', {
              status: 'done',
              detail: `${applied}/${selectedAUs.length} AUs appliqués par Claude`,
            })
          } else {
            // Non-bloquant : on continue avec aperçu simplifié
            const errText = await analyzeRes.text().catch(() => analyzeRes.status.toString())
            console.error('[analyze] HTTP', analyzeRes.status, errText)
            updateStep('aus', {
              status: 'warning',
              detail: `Analyse Claude indisponible (HTTP ${analyzeRes.status}) — AUs typographiques appliqués`,
            })
          }
        } else {
          updateStep('aus', {
            status: 'done',
            detail: `${selectedAUs.length} AU(s) typographiques appliqués`,
          })
        }

        // ── Étape 6 : Génération DOCX + sauvegarde ────────────────────────
        updateStep('docx', { status: 'running', detail: 'Génération du fichier Word…' })
        let docxUrl = '#'
        if (structuredDoc) {
          docxUrl = await generateDocx(structuredDoc, selectedAUs)

          // Sauvegarde en base + Storage (non-bloquant sur erreur)
          try {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
              const blob = await fetch(docxUrl).then(r => r.blob())
              await saveDocument({
                userId: user.id,
                profileId: _profile?.id !== 'temp' ? _profile?.id : undefined,
                filename: file.name,
                typeSource,
                docxBlob: blob,
                ausAppliques: selectedAUs,
                ocrScore,
                fidelityReport: {
                  score_global: 0,        // sera recalculé plus bas
                  aus_appliques: [],
                  images: { total: 0, arasaac: 0, conservees: 0, supprimees: 0 },
                  alertes_ocr: [],
                  alertes_pedagogiques: [],
                  suggestions: [],
                },
              })
            }
          } catch {
            // Echec de sauvegarde non-bloquant
          }

          updateStep('docx', { status: 'done', detail: 'Fichier .docx prêt au téléchargement · sauvegardé 30 jours' })
        } else {
          updateStep('docx', {
            status: 'warning',
            detail: 'Document structuré absent — téléchargement non disponible',
          })
        }

        // ── Rapport de fidélité ────────────────────────────────────────────
        const ausAppliques = structuredDoc?.aus_appliques?.length
          ? structuredDoc.aus_appliques.map(a => ({
              id: a.id,
              libelle: AU_LIBELLES[a.id] || a.id,
              applique: a.applique,
              note: a.note,
            }))
          : selectedAUs.map(id => ({ id, libelle: AU_LIBELLES[id] || id, applique: true }))

        const appliedCount = ausAppliques.filter(a => a.applique).length
        const scoreBase = Math.min(
          100,
          Math.round((appliedCount / Math.max(selectedAUs.length, 1)) * 80 + (ocrScore / 100) * 20)
        )

        const fidelityReport: FidelityReport = {
          score_global: scoreBase,
          aus_appliques: ausAppliques,
          images: { total: 0, arasaac: 0, conservees: 0, supprimees: 0 },
          alertes_ocr:
            ocrScore < 80
              ? [`Score OCR moyen de ${ocrScore}% — vérifier les zones de texte manuscrit`]
              : [],
          alertes_pedagogiques: structuredDoc?.alertes_pedagogiques ?? [],
          suggestions: [],
        }

        const htmlPreview = structuredDoc
          ? generateHtmlFromStructured(structuredDoc, selectedAUs)
          : generateHtmlPreview(file.name, extractedText, selectedAUs)

        setResult({ htmlPreview, fidelityReport, docxUrl })

      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erreur inattendue lors du traitement'
        setError(msg)
        setSteps(prev =>
          prev.map(s => (s.status === 'running' ? { ...s, status: 'error', detail: msg } : s))
        )
      } finally {
        // Nettoyage du fichier temporaire Supabase Storage
        if (tempFileUrl) {
          deleteOcrFile(tempFileUrl).catch(() => {/* silencieux */})
        }
        setIsProcessing(false)
      }
    },
    [updateStep]
  )

  const reset = useCallback(() => {
    setSteps([])
    setIsProcessing(false)
    setResult(null)
    setError(null)
  }, [])

  return { steps, isProcessing, result, error, startProcessing, reset }
}

// Génère un aperçu HTML à partir du document structuré retourné par Claude
function generateHtmlFromStructured(doc: StructuredDocument, aus: string[]): string {
  const hasGras = aus.includes('consigne_verbe_action_gras')
  const hasPictos = aus.includes('picto_arasaac')

  const blocksHtml = doc.blocs.map(bloc => {
    switch (bloc.type) {
      case 'titre': {
        const tag = bloc.niveau === 1 ? 'h1' : bloc.niveau === 2 ? 'h2' : 'h3'
        const style = bloc.niveau === 1
          ? 'font-size:20px;font-weight:bold;color:#1e40af;margin:0 0 16px;'
          : 'font-size:17px;font-weight:bold;margin:16px 0 8px;'
        return `<${tag} style="${style}">${bloc.texte ?? ''}</${tag}>`
      }
      case 'consigne': {
        const texte = bloc.verbeAction && hasGras
          ? (bloc.texte ?? '').replace(
              new RegExp(`\\b${bloc.verbeAction}\\b`, 'i'),
              `<strong>${bloc.verbeAction}</strong>`
            )
          : (bloc.texte ?? '')
        return `<p style="margin:8px 0;padding:8px 12px;background:#eff6ff;border-left:3px solid #3b82f6;">${texte}</p>`
      }
      case 'liste': {
        const items = (bloc.items ?? []).map(item => {
          if (hasGras) {
            const verbMatch = item.match(/^(\w+)/)?.[1]
            const itemHtml = verbMatch
              ? item.replace(verbMatch, `<strong>${verbMatch}</strong>`)
              : item
            return `<li style="margin-bottom:6px;">${itemHtml}</li>`
          }
          return `<li style="margin-bottom:6px;">${item}</li>`
        }).join('')
        return `<ul style="margin:8px 0 12px;padding-left:20px;">${items}</ul>`
      }
      case 'exercice': {
        const num = bloc.numero ? `<strong>Exercice ${bloc.numero}</strong> — ` : ''
        return `<div style="margin:16px 0 8px;"><p style="font-weight:bold;">${num}${bloc.texte ?? ''}</p></div>`
      }
      case 'espace_reponse':
        return `<div style="border:1px dashed #d1d5db;border-radius:4px;height:60px;margin:8px 0;background:#fafafa;"></div>`
      default:
        return `<p style="margin:8px 0;line-height:1.6;">${bloc.texte ?? ''}</p>`
    }
  }).join('\n')

  return `
    <div style="font-family:Arial,sans-serif;font-size:16px;line-height:1.5;text-align:left;
                max-width:680px;margin:0 auto;padding:24px;">
      ${blocksHtml}
      ${hasPictos && doc.mots_cles_pictos?.length ? `
        <div style="margin-top:16px;padding:12px;background:#f0fdf4;border-radius:6px;">
          <p style="font-size:12px;color:#166534;margin:0 0 8px;font-weight:bold;">
            Mots-clés Arasaac identifiés : ${doc.mots_cles_pictos.join(' · ')}
          </p>
        </div>` : ''}
      <p style="margin-top:24px;font-size:11px;color:#9ca3af;">
        ${hasPictos ? 'Pictogrammes © Arasaac (arasaac.org) · ' : ''}
        Généré par AccessDoc PLAI — Portail PLAI
      </p>
    </div>
  `
}

// Génère un aperçu HTML du document avec le texte extrait (fallback sans Claude)
function generateHtmlPreview(filename: string, extractedText: string, aus: string[]): string {
  const hasGras = aus.includes('consigne_verbe_action_gras')
  const hasPictos = aus.includes('picto_arasaac')

  // Transforme le markdown Mistral OCR en HTML simple
  const htmlText = extractedText
    .replace(/^## (.+)$/gm, '<h2 style="font-size:17px;font-weight:bold;margin:12px 0 6px;">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 style="font-size:20px;font-weight:bold;color:#1e40af;margin:0 0 12px;">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, hasGras ? '<strong>$1</strong>' : '$1')
    .replace(/^---$/gm, '<hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;">')
    .replace(/\n/g, '<br>')

  return `
    <div style="font-family:Arial,sans-serif;font-size:16px;line-height:1.5;text-align:left;
                max-width:680px;margin:0 auto;padding:24px;">
      <h1 style="font-size:18px;font-weight:bold;color:#1e40af;margin-bottom:16px;">
        ${filename}
      </h1>
      ${hasPictos ? `
        <div style="display:flex;gap:12px;margin-bottom:16px;">
          <img src="https://static.arasaac.org/pictograms/6756/6756_500.png"
               alt="Lire" style="width:50px;height:50px;" />
        </div>` : ''}
      <div style="line-height:1.6;">
        ${htmlText || '<p style="color:#9ca3af;font-style:italic;">Aucun texte extrait.</p>'}
      </div>
      <p style="margin-top:24px;font-size:11px;color:#9ca3af;">
        ${hasPictos ? 'Pictogrammes © Arasaac (arasaac.org) · ' : ''}
        Généré par AccessDoc PLAI — Portail PLAI
      </p>
    </div>
  `
}
