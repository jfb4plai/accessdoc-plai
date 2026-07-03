# AccessDoc PLAI — GELÉ (absorbé par Adaptateur AUs)

> **Statut : développement gelé depuis juillet 2026.**
> Fonctions reprises par **Adaptateur AUs** (`projets/au-convertisseur`,
> https://adaptateur-aus.vercel.app), l'app canonique PLAI d'accessibilité documentaire.

## Ce que faisait AccessDoc

Conversion de documents en versions accessibles, avec comptes et profils :

- Authentification + tableau de bord + éditeur de profils d'adaptation
- Analyse de documents (`api/analyze.ts`) et OCR (`api/ocr.ts`)
- Export DOCX paginé respectant le plan d'origine (« même plan » : consigne/plage
  de travail conservées, sauts de page avant sections et exercices longs,
  numérotation continue des listes)

## À reprendre dans Adaptateur AUs (backlog de consolidation)

| Fonction | Intérêt | État dans Adaptateur AUs |
|---|---|---|
| Export DOCX « même plan » paginé | L'élève DYS garde les mêmes repères que la classe | Absent — priorité 1 du backlog |
| Profils d'adaptation persistants par compte | Réutilisation sans reconfiguration | Partiel (écran Profils) |
| OCR dédié | Documents scannés | Couvert (`pdf-vision`, `transcribe`) |

## Raison du gel

Quatre apps couvraient « rendre un document accessible » (AdaptActif, AccessDoc,
Adaptateur AUs, Narration DYS). Adaptateur AUs est la plus aboutie et alignée sur le
cadre AU FWB/PLAI — c'est elle qui absorbe. La fonctionnalité « même plan » d'AccessDoc
est la contribution la plus précieuse à porter.

Plan complet : `claude-workspace/memory/consolidation-accessibilite-plan.md`
