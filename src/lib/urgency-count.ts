import { unstable_cache } from "next/cache";
import { fetchLeads } from "@/lib/google/sheets";
import { createAdminClient } from "@/lib/supabase/admin";
import { isGoogleConfigured } from "@/lib/today";
import { urgencyKey } from "@/lib/urgencies";

// Contagem de urgências sem revisão para o badge da navegação. Cacheada por
// 2 minutos (a leitura do Sheets é lenta demais para rodar a cada navegação)
// e invalidada na hora quando alguém marca uma urgência como vista/resolvida
// (revalidateTag em urgencias/actions). Só é lida dentro do layout autenticado.

export const URGENCY_COUNT_TAG = "urgency-count";

async function countOpenUrgencies(): Promise<number> {
  if (!isGoogleConfigured().sheets) return 0;
  const leads = await fetchLeads();
  const urgent = leads.filter((l) => l.urgencia);
  if (urgent.length === 0) return 0;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("urgency_reviews")
    .select("sheet_row_key, status");
  if (error) throw new Error(error.message);

  const statusByKey = new Map(
    (data ?? []).map((r) => [r.sheet_row_key, r.status])
  );
  return urgent.filter(
    (l) => (statusByKey.get(urgencyKey(l)) ?? "aberta") === "aberta"
  ).length;
}

export const getOpenUrgencyCount = unstable_cache(
  async () => {
    try {
      return await countOpenUrgencies();
    } catch {
      // badge é conveniência; falha de leitura não pode derrubar o layout
      return 0;
    }
  },
  ["open-urgency-count"],
  { revalidate: 120, tags: [URGENCY_COUNT_TAG] }
);
