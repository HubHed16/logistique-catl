# Tests e2e (Playwright)

Tests fonctionnels du back-office CATL + simulateur React, avec couverture de
parité face au simulateur legacy (`public/simulator/index.html`).

## Lancer

```bash
# Pré-requis : dev server lancé en parallèle sur :3000
yarn dev

# Dans un autre terminal
yarn test:e2e           # headless
yarn test:e2e:ui        # UI mode (debugging)
yarn test:e2e e2e/simulator-depot.spec.ts   # un seul fichier
```

## Structure

| Fichier | Scope |
| --- | --- |
| `fixtures.ts` | `cleanPage` (localStorage vide) + helper `fillDepot` |
| `backoffice-nav.spec.ts` | Navigation (Accueil / Réception / Zones / Historique / Simulateur) |
| `simulator-depot.spec.ts` | Formulaire dépôt React (16 tests) |
| `simulator-legacy-parity.spec.ts` | Le legacy HTML reste accessible et fonctionnel |

## Parité legacy ↔ React

Table de correspondance entre les IDs du legacy (`index.html`) et la couverture
React. Maintenue **synchronisée** à chaque port de feature.

### Dépôt — implémenté ✅

| Legacy ID / Feature | Valeur(s) / comportement | Test React |
| --- | --- | --- |
| `#pName` | Nom de la ferme | `simulator-depot > la nav permet d'atteindre + remplir tout le form` |
| `#pJobMenu` (21 checkboxes) | 21 métiers multi-select | `simulator-depot > les 21 métiers sont proposés en chips` |
| `#pMail` | Email (optionnel) | couvert via `fillDepot` |
| `#pAddr` + `pAddr-list` | Adresse libre + clic carte | `simulator-depot > cliquer sur la carte en mode Placer pose un marqueur` |
| `#vType` (5 options) | Petit utilitaire → Camion lourd | `les 5 types de véhicule du legacy sont proposés` |
| `#fType` (5 options) | Diesel / Essence / Électrique / GNV / Hybride | `les 5 énergies du legacy sont proposées` |
| `#vFrigo` | Checkbox réfrigéré | `la case Réfrigéré bascule le state` |
| `#vCons`, `#fPrice`, `#vAmort` | Défauts 8.5 / 1.75 / 0.25 | `les valeurs par défaut des champs transport sont celles du legacy` |
| `#driverType` (3 options) | Producteur / Salarié / Prestataire | `les 3 profils Qui livre du legacy sont proposés` |
| `#cH`, `#tPrep`, `#tLoad` | Défauts 18 / 30 / 20 | idem |
| `#surfSec` `#surfFrais` `#surfNeg` `#surfPrep` | Sliders 0-200 pas 5 | `les 4 sliders de surface existent` |
| `#btn-validate-depot` + `lockDepot()` | Verrouiller le dépôt | `remplir tout le form active le bouton et permet de verrouiller` |
| `unlockDepot()` | Rebasculer en édition | `le dépôt verrouillé peut être modifié` |
| `localStorage pnr_logistique_v83_clean` | Restauration au reload | `après reload, le dépôt verrouillé est restauré depuis localStorage` |
| `resetAll()` | Réinitialiser tout | `'Réinitialiser tout' vide le projet et revient en édition` |

### Tournées — non implémenté ⏳ (Phase 2)

| Legacy ID / Feature | Statut React |
| --- | --- |
| `#tName`, `#tDay` (6 jours), `newTour()` | ⏳ Phase 2 |
| `#sClient`, `#sOpType` (3 types 📦/🚜/🏬), `#sAddr`, `#sEuro`, `#sTime` | ⏳ Phase 2 |
| `addStop()`, `#stops-list` (Sortable drag-drop) | ⏳ Phase 2 |
| KPIs `#rTotal`, `#rVal`, `#rDist`, `#rTime`, `#rCostTrans`, `#rCostOps`, `#rRatio` | ⏳ Phase 2 |
| OSRM routing | ⏳ Phase 2 |
| Nominatim autocomplete live | ⏳ Phase 2 |

### Dossier / export — non implémenté ⏳ (Phase 3)

| Legacy ID / Feature | Statut React |
| --- | --- |
| `#global-totals-container`, `saveCurrentTour()` | ⏳ Phase 3 |
| `#tours-list-container` (mes tournées enregistrées) | ⏳ Phase 3 |
| `downloadBackup()`, `uploadBackup()` | ⏳ Phase 3 |
| `openRgpdModal()` + envoi Supabase `tournees_catl` | ⏳ Phase 3 |

## Flakiness connue

Le dev server Next 16 compile les routes à froid (~10-15s par route lors du
premier hit). Le test `la nav permet d'atteindre /zones` est parfois flaky
sur un premier run. On autorise 1 retry en local (2 en CI). Pour un run
déterministe : `yarn build && yarn start` puis relancer les tests contre la
prod build.
