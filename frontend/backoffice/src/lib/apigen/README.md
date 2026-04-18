# API client (CATL Tour API)

Typed HTTP client généré depuis `openapi.yaml` (copie maîtresse du contrat
back). Base : [`openapi-typescript`](https://openapi-ts.dev/) +
[`openapi-fetch`](https://openapi-ts.dev/openapi-fetch/).

## Fichiers

- `openapi.yaml` — spec (synchronisée avec le contrat fourni par le back)
- `types.ts` — types TypeScript générés (`yarn apigen` pour régénérer)
- `client.ts` — instance `createClient<paths>({ baseUrl })` + middleware
- `mocks/producers.ts` — mock localStorage tant que le ProducerController
  n'est pas dispo côté WMS (interceptes `GET/POST/PUT/DELETE /producers*`
  et répond avec la forme du contrat OpenAPI)
- `mocks/geo.ts` — mock `/geo/geocode` (Nominatim direct) et `/geo/route`
  (OSRM direct) tant que tour-api retourne 501 sur ces endpoints

## Régénérer les types

```bash
yarn apigen
```

## Bascule mock → real

Quand le back expose les producers / geo, retirer la ligne correspondante
dans `client.ts` (`client.use(producersMock)` / `geoMock`). Les appels
dans le code restent identiques — on ne touche à rien d'autre.
