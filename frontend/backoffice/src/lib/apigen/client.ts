import createClient from "openapi-fetch";
import type { paths } from "./types";
import { geoMock } from "./mocks/geo";

// Base URL relative → les Route Handlers sous src/app/api/tour/[...path]
// proxient /api/tour/* vers tour-api. Avantage : même origine côté browser
// (pas de CORS), la cible du proxy est lue côté serveur à chaque requête.
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api/tour";

export const apiClient = createClient<paths>({
  baseUrl: BASE_URL,
});

// Mock /geo/geocode + /geo/route (tour-api renvoie 501 en attendant les
// providers officiels). Les producers, eux, sont servis en direct par
// wms-api via /api/wms/* (cf. lib/simulator/wms-client.ts).
apiClient.use(geoMock);

export type ApiClient = typeof apiClient;
