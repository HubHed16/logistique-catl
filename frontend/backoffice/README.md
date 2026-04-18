# CATL · Back-office

Back-office Next.js de la Ceinture Aliment-Terre Liégeoise (hackathon 2026).
Pilotage des flux entrepôt : réception des livraisons producteurs, gestion des
zones de stockage et historique des actions.

## Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS v4 (palette CATL dans `src/app/globals.css`)
- React Query (`@tanstack/react-query`)
- `lucide-react` pour les icônes
- yarn pour l'installation

## Démarrage

```bash
cp .env.local.example .env.local      # NEXT_PUBLIC_API_BASE_URL par défaut : http://localhost:8080
yarn install
yarn dev                                # :3000
```

Backend attendu : `backend/wms/` (Spring Boot, géré par l'autre partie de
l'équipe). En attendant que l'API soit disponible, les pages affichent des
stubs — les features réelles arrivent dans des branches dédiées.

## Routes prévues

| Route        | Statut  | Branche git qui l'implémente  |
| ------------ | ------- | ----------------------------- |
| `/`          | ✅ stub | `feat/backoffice`             |
| `/reception` | ✅ stub | `feat/reception-form`         |
| `/zones`     | ✅ stub | `feat/storage-zones-crud`     |
| `/history`   | ✅ stub | `feat/action-history`         |

## Direction artistique

Palette CATL (cf. `src/app/globals.css`) :

| Token                 | Hex       | Usage                          |
| --------------------- | --------- | ------------------------------ |
| `--color-catl-primary` | `#2c3e50` | navy, headers, titres          |
| `--color-catl-accent`  | `#e67e22` | orange CATL, CTA principaux    |
| `--color-catl-success` | `#27ae60` | validations, états OK          |
| `--color-catl-danger`  | `#e74c3c` | erreurs, destructions          |
| `--color-catl-info`    | `#3498db` | infos                          |
| `--color-catl-text`    | `#546e7a` | texte courant                  |
| `--color-catl-bg`      | `#f4f7f9` | fond d'app                     |

Police : `Segoe UI`, border-radius `6px` (cartes) ou `9999px` (CTA),
ombres très subtiles.

## Références

- `frontend/mcd_catl_wms_svg.html` — MCD (source de vérité pour les DTOs)
- `frontend/image.webp` — diagramme de séquence WMS (flux réception)
- `backend/wms/` — API Spring Boot à consommer
