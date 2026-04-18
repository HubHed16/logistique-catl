import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type Cooperative = {
  id: string;
  name: string;
  contact: string | null;
};

// Le wizard de réception n'a pas d'étape coop. On prend la première dispo
// (première page, triée par nom côté back) comme coopérative par défaut.
export function useDefaultCooperative() {
  return useQuery<Cooperative | null>({
    queryKey: ["cooperatives", "default"],
    queryFn: async () => {
      const page = await api.get<
        | { content: Cooperative[] }
        | Cooperative[]
      >("/api/wms/cooperatives", { size: 1, page: 0 });
      const list = Array.isArray(page) ? page : (page?.content ?? []);
      return list[0] ?? null;
    },
    staleTime: 5 * 60_000,
    retry: 0,
  });
}
