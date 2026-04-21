import {
  Document, Packer, Paragraph, TextRun, PageBreak,
  AlignmentType, BorderStyle, HeadingLevel,
  Footer, PageNumber, convertInchesToTwip,
  ShadingType,
} from 'docx'
import type { StructuredDocument, DocBloc } from '../types'

// ── Constantes typographiques (selon AUs) ────────────────────────────────────

const FONT_DEFAULT = 'Arial'
const SIZE_NORMAL  = 24   // 12pt en demi-points
const SIZE_H1      = 30   // 15pt
const SIZE_H2      = 26   // 13pt
const SIZE_H3      = 24   // 12pt
const LINE_SPACING = 360  // interligne 1,5 (240 = simple)
const COLOR_TITRE  = '1E3A8A'
const COLOR_CONSIGNE_BG = 'EFF6FF'
const COLOR_CONSIGNE_BORDER = '3B82F6'

// ── Helpers ──────────────────────────────────────────────────────────────────

function runProps(size = SIZE_NORMAL, bold = false, color?: string): object {
  return { font: FONT_DEFAULT, size, bold, ...(color ? { color } : {}) }
}

function paraProps(aus: string[]): object {
  const alignment = aus.includes('typo_non_justifie')
    ? AlignmentType.LEFT
    : AlignmentType.LEFT  // FWB : toujours à gauche pour l'accessibilité
  return {
    alignment,
    spacing: { line: LINE_SPACING, after: 120 },
  }
}

/**
 * Décompose le texte pour mettre le verbe d'action en gras.
 */
function buildConsigneRuns(
  texte: string,
  verbeAction: string | undefined,
  makeVerbBold: boolean
): TextRun[] {
  if (!verbeAction || !makeVerbBold) {
    return [new TextRun({ text: texte, ...runProps() })]
  }

  const idx = texte.toLowerCase().indexOf(verbeAction.toLowerCase())
  if (idx === -1) return [new TextRun({ text: texte, ...runProps() })]

  const before = texte.substring(0, idx)
  const verb   = texte.substring(idx, idx + verbeAction.length)
  const after  = texte.substring(idx + verbeAction.length)

  const runs: TextRun[] = []
  if (before) runs.push(new TextRun({ text: before, ...runProps() }))
  runs.push(new TextRun({ text: verb, ...runProps(SIZE_NORMAL, true) }))
  if (after)  runs.push(new TextRun({ text: after,  ...runProps() }))
  return runs
}

// ── Convertisseurs de blocs → Paragraphs docx ────────────────────────────────

function blocTitre(bloc: DocBloc, aus: string[]): Paragraph {
  const niveau = bloc.niveau ?? 1
  const size   = niveau === 1 ? SIZE_H1 : niveau === 2 ? SIZE_H2 : SIZE_H3
  const showEvidence = aus.includes('struct_titre_mise_evidence')

  return new Paragraph({
    ...(niveau === 1 ? { heading: HeadingLevel.HEADING_1 } : niveau === 2 ? { heading: HeadingLevel.HEADING_2 } : { heading: HeadingLevel.HEADING_3 }),
    ...paraProps(aus),
    spacing: { line: LINE_SPACING, before: 200, after: 160 },
    children: [
      new TextRun({
        text: bloc.texte ?? '',
        ...runProps(size, true, showEvidence && niveau === 1 ? COLOR_TITRE : undefined),
      }),
    ],
  })
}

function blocConsigne(bloc: DocBloc, aus: string[]): Paragraph {
  const makeVerbBold = aus.includes('consigne_verbe_action_gras')
  const runs = buildConsigneRuns(bloc.texte ?? '', bloc.verbeAction, makeVerbBold)

  return new Paragraph({
    ...paraProps(aus),
    // "Même plan" AU : la consigne reste toujours sur la même page que ce qui suit
    keepNext: true,
    spacing: { line: LINE_SPACING, before: 80, after: 80 },
    border: {
      left: {
        color: COLOR_CONSIGNE_BORDER,
        space: 8,
        style: BorderStyle.SINGLE,
        size: 18,
      },
    },
    shading: {
      type: ShadingType.SOLID,
      color: COLOR_CONSIGNE_BG,
      fill: COLOR_CONSIGNE_BG,
    },
    indent: { left: convertInchesToTwip(0.2) },
    children: runs,
  })
}

function blocListe(bloc: DocBloc, aus: string[]): Paragraph[] {
  const makeVerbBold = aus.includes('consigne_verbe_action_gras')
  const items = bloc.items ?? (bloc.texte ? [bloc.texte] : [])

  return items.map((item, i) => {
    // Essaie d'identifier le verbe (premier mot si en majuscule initiale)
    const verbMatch = item.match(/^([A-ZÀ-Ÿ][a-zà-ÿ]+)/)
    const verb = makeVerbBold ? verbMatch?.[1] : undefined
    const runs = buildConsigneRuns(item, verb, makeVerbBold)

    return new Paragraph({
      ...paraProps(aus),
      spacing: { line: LINE_SPACING, after: 60 },
      bullet: { level: 0 },
      children: [
        new TextRun({ text: `${i + 1}. `, ...runProps(SIZE_NORMAL, true) }),
        ...runs,
      ],
    })
  })
}

function blocExercice(bloc: DocBloc, aus: string[]): Paragraph {
  const numero = bloc.numero
  const label  = numero ? `Exercice ${numero}` : ''
  const texte  = bloc.texte ?? ''

  return new Paragraph({
    ...paraProps(aus),
    // "Même plan" : garde les lignes de l'exercice ensemble + reste avec l'espace réponse
    keepLines: true,
    keepNext: true,
    spacing: { line: LINE_SPACING, before: 240, after: 100 },
    children: [
      ...(label
        ? [new TextRun({ text: label + (texte ? ' — ' : ''), ...runProps(SIZE_NORMAL, true, COLOR_TITRE) })]
        : []),
      new TextRun({ text: texte, ...runProps(SIZE_NORMAL, true) }),
    ],
  })
}

function blocEspaceReponse(): Paragraph[] {
  // 3 lignes de tirets pour l'espace réponse
  // keepLines : les 3 lignes restent ensemble sur la même page
  return Array.from({ length: 3 }, () =>
    new Paragraph({
      spacing: { line: LINE_SPACING, after: 0 },
      keepLines: true,
      children: [
        new TextRun({
          text: '_'.repeat(60),
          color: 'D1D5DB',
          font: FONT_DEFAULT,
          size: SIZE_NORMAL,
        }),
      ],
    })
  )
}

function blocParagraphe(bloc: DocBloc, aus: string[]): Paragraph {
  return new Paragraph({
    ...paraProps(aus),
    children: [new TextRun({ text: bloc.texte ?? '', ...runProps() })],
  })
}

// ── Assemblage du document ────────────────────────────────────────────────────

function buildChildren(doc: StructuredDocument, aus: string[]): Paragraph[] {
  const children: Paragraph[] = []

  for (const bloc of doc.blocs) {
    switch (bloc.type) {
      case 'titre':
        children.push(blocTitre(bloc, aus))
        break
      case 'consigne':
        children.push(blocConsigne(bloc, aus))
        break
      case 'liste':
        children.push(...blocListe(bloc, aus))
        break
      case 'exercice':
        children.push(blocExercice(bloc, aus))
        break
      case 'espace_reponse':
        children.push(...blocEspaceReponse())
        break
      case 'saut_de_page':
        // Respecte la pagination du document original
        children.push(new Paragraph({
          spacing: { line: 240, before: 0, after: 0 },
          children: [new PageBreak()],
        }))
        break
      default:
        children.push(blocParagraphe(bloc, aus))
    }
  }

  // Attribution Arasaac si AU pictogrammes activé
  if (aus.includes('picto_arasaac') && doc.mots_cles_pictos?.length) {
    children.push(new Paragraph({ spacing: { line: LINE_SPACING, before: 400 }, children: [] }))
    children.push(new Paragraph({
      spacing: { line: 240 },
      children: [
        new TextRun({
          text: `Pictogrammes © Arasaac (arasaac.org) — Licence CC BY-NC-SA 4.0`,
          font: FONT_DEFAULT,
          size: 18,  // 9pt
          color: '9CA3AF',
          italics: true,
        }),
      ],
    }))
  }

  return children
}

// ── Export principal ──────────────────────────────────────────────────────────

/**
 * Génère un fichier .docx accessible à partir d'un document structuré.
 * Retourne une URL blob prête pour le téléchargement.
 */
export async function generateDocx(
  doc: StructuredDocument,
  selectedAUs: string[],
): Promise<string> {
  const hasPageNumbers = selectedAUs.includes('struct_numeroter_pages')

  const wordDoc = new Document({
    creator: 'AccessDoc PLAI',
    description: 'Document accessible généré par AccessDoc PLAI — Portail PLAI',
    styles: {
      default: {
        document: {
          run: { font: FONT_DEFAULT, size: SIZE_NORMAL },
          paragraph: {
            spacing: { line: LINE_SPACING },
            alignment: AlignmentType.LEFT,
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top:    convertInchesToTwip(1),
              right:  convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left:   convertInchesToTwip(1.25),
            },
          },
        },
        footers: hasPageNumbers
          ? {
              default: new Footer({
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { line: 240 },
                    children: [
                      new TextRun({ text: 'Page ', font: FONT_DEFAULT, size: 18, color: '6B7280' }),
                      new TextRun({ children: [PageNumber.CURRENT], font: FONT_DEFAULT, size: 18, color: '6B7280' }),
                      new TextRun({ text: ' / ', font: FONT_DEFAULT, size: 18, color: '6B7280' }),
                      new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONT_DEFAULT, size: 18, color: '6B7280' }),
                    ],
                  }),
                ],
              }),
            }
          : undefined,
        children: buildChildren(doc, selectedAUs),
      },
    ],
  })

  const blob = await Packer.toBlob(wordDoc)
  return URL.createObjectURL(blob)
}
