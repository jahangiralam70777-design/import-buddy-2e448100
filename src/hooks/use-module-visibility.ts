import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listModuleVisibility,
  type ModuleKey,
  type ModuleVisibilityRow,
} from "@/lib/module-visibility.functions";

export type { ModuleKey } from "@/lib/module-visibility.functions";

/** Path → module key. Routes not listed are never hidden. */
export const MODULE_BY_PATH: Record<string, ModuleKey> = {
  "/mcq-practice": "mcq_practice",
  "/quiz": "quiz",
  "/mock-test": "mock_test",
  "/flash-cards": "flash_cards",
  "/short-notes": "short_notes",
  "/qns-bank": "qns_bank",
  "/classes": "classes",
};

/** Landing-feature title → module key (for hiding cards on the marketing site). */
export const MODULE_BY_FEATURE_TITLE: Record<string, ModuleKey> = {
  "MCQ Practice": "mcq_practice",
  "Quiz System": "quiz",
  "Mock Test": "mock_test",
  "Flash Cards": "flash_cards",
  "Short Notes": "short_notes",
  "Qns Bank": "qns_bank",
  "Video Classes": "classes",
};

export function useModuleVisibility() {
  const listFn = useServerFn(listModuleVisibility);
  const query = useQuery({
    queryKey: ["module-visibility"],
    queryFn: () => listFn(),
    staleTime: 15_000,
  });

  const hiddenSet = useMemo(() => {
    const s = new Set<ModuleKey>();
    (query.data ?? []).forEach((r: ModuleVisibilityRow) => {
      if (r.hidden) s.add(r.key);
    });
    return s;
  }, [query.data]);

  return {
    rows: query.data ?? [],
    isLoading: query.isLoading,
    isHidden: (key?: ModuleKey | null) => (key ? hiddenSet.has(key) : false),
    isPathHidden: (path: string) => {
      const k = MODULE_BY_PATH[path];
      return k ? hiddenSet.has(k) : false;
    },
  };
}
