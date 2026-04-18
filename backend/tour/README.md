# CATL Tour

Service de préparation des tournées logistiques CATL. Gère les véhicules, clients, produits, infrastructure et tournées (avec arrêts ordonnés) pour les producteurs. Les producteurs eux-mêmes sont gérés par le WMS — ce service consomme leur `producerId` en paramètre.

## Stack

- **Java 25** + **Spring Boot 4.0.5**
- **PostgreSQL 16** + **Liquibase** (migrations YAML)
- **JdbcClient** (pas de JPA)
- **OpenAPI 3.0.3** contract-first — génération des interfaces via `openapi-generator-maven-plugin`

## Architecture

Séparation stricte en trois packages plats :

```
com.catl.tour
├── controller/   # implémente les interfaces générées depuis openapi.yaml
├── service/      # logique métier + repositories JdbcClient (package-private)
└── exception/    # ApiException + GlobalExceptionHandler
```

- Les modèles (`Vehicle`, `Route`, `Stop`, …) et les interfaces d'API sont **générés** depuis [`src/main/resources/openapi.yaml`](src/main/resources/openapi.yaml) dans `target/generated-sources/openapi/`.
- Les repositories sont `package-private` : les controllers ne peuvent pas court-circuiter la couche service.
- Soft-delete via colonne `deleted_at` sur toutes les entités mutables.
- Multi-tenant via colonne `producer_id` (filtre sur listings, champ obligatoire dans les `*Create`).

## Lancer en local (frontend dev)

Compose dédié — API + Postgres :

```bash
cd backend/tour
docker compose up --build
```

| Service        | URL / Host                    |
|----------------|-------------------------------|
| API            | http://localhost:8080         |
| Health         | http://localhost:8080/actuator/health |
| Postgres       | `localhost:5433` (db `tour`)  |

Le port `5433` évite le clash avec le Postgres global du WMS (`5432`).

Credentials DB locale : `tour_user` / `tour_password`.

Liquibase applique les migrations au démarrage de l'API.

## Variables d'environnement

| Nom            | Exemple         |
|----------------|-----------------|
| `DB_HOST`      | `tour-postgres` |
| `DB_PORT`      | `5432`          |
| `DB_NAME`      | `tour`          |
| `DB_USER`      | `tour_user`     |
| `DB_PASSWORD`  | `tour_password` |
| `SPRING_PROFILES_ACTIVE` | `dev` |

## Endpoints principaux

Tous les listings exigent `?producerId={uuid}`.

### Ressources CRUD
- `/vehicles` — types `van|light_truck|heavy_truck`, carburants, coûts
- `/customers` — filtres `search` (nom/adresse) + `type`
- `/products` — catalogue optionnel (`dry|fresh|frozen`)
- `/producers/{producerId}/infrastructure` — GET + PUT (upsert)

### Tournées
- `/routes` — CRUD, filtres `dayOfWeek`, `status`, `scheduledDate`
- `POST /routes/{id}/duplicate` — clone la tournée et ses arrêts
- `POST /routes/{id}/validate` — `draft` → `validated` (exige ≥ 1 arrêt)
- `POST /routes/{id}/optimize` — réordonne les arrêts (nearest-neighbour sur lat/lon)

### Arrêts
- `POST /routes/{id}/stops` — append avec `sequence` auto
- `PATCH /routes/{id}/stops/reorder` — réordonne la tournée entière
- `DELETE /routes/{id}/stops/{stopId}` — renumérote les suivants

Les tournées `validated` ou `completed` sont verrouillées → `409 ROUTE_LOCKED`.

### Lignes produits
- `/stops/{stopId}/items` — CRUD des produits livrés à un arrêt

### Stats
- `/routes/{id}/stats` — KPIs d'une tournée (coût/arrêt, CA/km)
- `/stats/summary?producerId=…&from=…&to=…` — agrégation globale

### Stubs (501 Not Implemented)
- `/geo/geocode`, `/geo/route` — à brancher sur Nominatim / OSRM
- `/routes/{id}/export.pdf`, `/export.gpx`, `/email` — à implémenter

## Développement

### Build local

```bash
mvn clean package
```

Les sources générées (`target/generated-sources/openapi/`) doivent être reconnues comme source root par l'IDE. Sous IntelliJ : *Reload Maven project*.

### Modifier l'API

1. Éditer [`src/main/resources/openapi.yaml`](src/main/resources/openapi.yaml)
2. `mvn generate-sources` (ou rebuild)
3. Adapter les controllers concernés

### Modifier le schéma DB

Ajouter un nouveau changeset dans [`src/main/resources/db/migration/changelogs/`](src/main/resources/db/migration/changelogs/) — **ne jamais éditer un changeset déjà appliqué**.

## Gestion d'erreurs

`GlobalExceptionHandler` renvoie un `Error { code, message }` JSON :

| Status | Code                  | Origine                                    |
|--------|-----------------------|--------------------------------------------|
| 400    | `VALIDATION_FAILED`   | `@Valid` sur body / query                  |
| 400    | `BAD_REQUEST`         | `IllegalArgumentException`                 |
| 400    | `REORDER_MISMATCH`    | Reorder incomplet                          |
| 404    | `NOT_FOUND`           | Ressource absente                          |
| 409    | `ROUTE_LOCKED`        | Modif d'une tournée validée/terminée       |
| 409    | `ROUTE_NOT_DRAFT`     | Validation hors statut `draft`             |
| 422    | `ROUTE_EMPTY`         | Validation d'une tournée sans arrêt        |
| 501    | `NOT_IMPLEMENTED`     | Geo / Export (stubs)                       |
