import createClient from "openapi-fetch";
import type { paths } from "./types";
import { producersMock } from "./mocks/producers";
import { geoMock } from "./mocks/geo";

// Base URL — le back tour-api expose les routes à la racine (pas /api/v1
// malgré ce que dit le champ `servers:` de l'OpenAPI). On force via env.
const BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

export const apiClient = createClient<paths>({
  baseUrl: BASE_URL,
  // JSON par défaut, middlewares geo/producers se greffent ci-dessous
});

// Middlewares mock — à retirer au fur et à mesure que le back expose
// officiellement les endpoints correspondants.
apiClient.use(producersMock);
apiClient.use(geoMock);

export type ApiClient = typeof apiClient;
