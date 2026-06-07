import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listLevels } from "@/lib/learning.functions";

export type LevelRow = {
  code: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  sort_order: number;
};

/**
 * Returns admin-managed levels in real-time. Realtime invalidator
 * already invalidates ["levels"] when levels table changes.
 */
export function useLevels() {
  const fn = useServerFn(listLevels);
  return useQuery({
    queryKey: ["levels"],
    queryFn: () => fn() as Promise<LevelRow[]>,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });
}
