import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AcademicLevel = {
  code: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  sort_order: number;
};

export type AcademicSubject = {
  id: string;
  name: string;
  level: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  sort_order: number;
};

export type AcademicChapter = {
  id: string;
  name: string;
  subject_id: string;
  description: string | null;
  sort_order: number;
};

export function useAcademicTree() {
  return useQuery({
    queryKey: ["academic-tree"],
    queryFn: async () => {
      const [levels, subjects, chapters] = await Promise.all([
        supabase
          .from("levels")
          .select("code,name,description,color,icon,sort_order")
          .eq("status", "published")
          .order("sort_order", { ascending: true }),
        supabase
          .from("subjects")
          .select("id,name,level,description,color,icon,sort_order")
          .eq("status", "published")
          .order("sort_order", { ascending: true }),
        supabase
          .from("chapters")
          .select("id,name,subject_id,description,sort_order")
          .eq("status", "published")
          .order("sort_order", { ascending: true }),
      ]);

      if (levels.error) throw levels.error;
      if (subjects.error) throw subjects.error;
      if (chapters.error) throw chapters.error;

      return {
        levels: (levels.data ?? []) as AcademicLevel[],
        subjects: (subjects.data ?? []) as AcademicSubject[],
        chapters: (chapters.data ?? []) as AcademicChapter[],
      };
    },
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
}