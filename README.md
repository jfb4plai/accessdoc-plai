# AccessDoc PLAI — GELÉ (absorbé par DiffActif)

> **Statut : développement gelé depuis juillet 2026.**
> Fonctions reprises par **DiffActif** (`projets/diffactif`,
> https://diffactif.vercel.app), l'app canonique PLAI de différenciation par
> Aménagements Universels. (Adaptateur AUs, première version de DiffActif,
> a été supprimé en juillet 2026.)

## Ce que faisait AccessDoc

Conversion de documents en versions accessibles, avec comptes et profils :

- Authentification + tableau de bord + éditeur de profils d'adaptation
- Analyse de documents (`api/analyze.ts`) et OCR (`api/ocr.ts`)
- Export DOCX paginé respectant le plan d'origine (« même plan » : consigne/plage
  de travail conservées, sauts de page avant sections et exercices longs,
  numérotation continue des listes)

## À reprendre dans DiffActif (backlog de consolidation)

| Fonction | Intérêt | État dans DiffActif |
|---|---|---|
| Export DOCX « même plan » paginé | L'élève DYS garde les mêmes repères que la classe | Absent — priorité 1 du backlog |
| Profils d'adaptation persistants par compte | Réutilisation sans reconfiguration | Couvert (cartographie de profils) |
| OCR dédié | Documents scannés | À vérifier (`api/extract`) |

## Raison du gel

Plusieurs apps couvraient « rendre un document accessible » (AdaptActif, AccessDoc,
Adaptateur AUs, Narration DYS). DiffActif — successeur direct d'Adaptateur AUs —
est l'app canonique alignée sur le cadre AU FWB/PLAI : c'est elle qui absorbe.
La fonctionnalité « même plan » d'AccessDoc est la contribution la plus précieuse
à porter.

Plan complet : `claude-workspace/memory/consolidation-accessibilite-plan.md`

## Licences

- **Code** : [PolyForm Noncommercial 1.0.0](LICENSE). Usage non commercial uniquement.
- **Contenus pédagogiques** : [CC BY-NC-SA 4.0](LICENSE-CONTENT.md). Réutilisation et adaptation non commerciales, avec attribution et partage dans les mêmes conditions.
- **Logo et identité visuelle PLAI** : tous droits réservés (voir `LICENSE-CONTENT.md`).

Auteur : Jean-François Beguin, Référent numérique, https://jfb4plai.com
