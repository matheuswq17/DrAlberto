import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchLeadsWithQuality, type Lead } from "@/lib/google/sheets";
import {
  isGoogleConfigured,
  suspectRowsWarning,
  type SourceWarning,
} from "@/lib/today";

// Painel de urgência silenciosa (func. 2). PULL APENAS: este módulo (e a tela
// que o usa) somente LÊ e marca estado de revisão. Em hipótese alguma dispara
// notificação — regra inviolável herdada do bot (nó "Notificar Dr." desabilitado).

export type UrgencyStatus = "aberta" | "vista" | "resolvida";

export interface UrgencyItem {
  /** chave estável da linha no Sheets: telefone|timestamp */
  key: string;
  lead: Lead;
  status: UrgencyStatus;
  reviewedAt: string | null;
}

export function urgencyKey(lead: Lead): string {
  return `${lead.phone}|${lead.createdAt}`;
}

export async function getUrgencies(supabase: SupabaseClient): Promise<{
  items: UrgencyItem[];
  warnings: SourceWarning[];
  readAt: string;
  sheetsOk: boolean;
}> {
  const warnings: SourceWarning[] = [];
  let sheetsOk = false;
  let leads: Lead[] = [];
  if (!isGoogleConfigured().sheets) {
    warnings.push({
      kind: "config",
      text: "Google Sheets não configurado — preencha GOOGLE_SHEETS_ID no .env para ver as triagens do bot.",
    });
  } else {
    try {
      const result = await fetchLeadsWithQuality();
      leads = result.leads;
      sheetsOk = true;
      const suspect = suspectRowsWarning(result.suspects);
      if (suspect) warnings.push(suspect);
    } catch (err) {
      warnings.push({
        kind: "erro",
        text: `Leitura do Google Sheets falhou: ${(err as Error).message}`,
      });
    }
  }

  const urgent = leads.filter((l) => l.urgencia);

  const { data: reviews, error } = await supabase
    .from("urgency_reviews")
    .select("sheet_row_key, status, reviewed_at");
  if (error) {
    warnings.push({ kind: "erro", text: `urgency_reviews: ${error.message}` });
  }

  const reviewByKey = new Map(
    (reviews ?? []).map((r) => [r.sheet_row_key, r])
  );

  const items = urgent
    .map((lead) => {
      const review = reviewByKey.get(urgencyKey(lead));
      return {
        key: urgencyKey(lead),
        lead,
        status: (review?.status ?? "aberta") as UrgencyStatus,
        reviewedAt: review?.reviewed_at ?? null,
      };
    })
    // abertas primeiro, depois vistas, resolvidas por último
    .sort((a, b) => {
      const order: Record<UrgencyStatus, number> = {
        aberta: 0,
        vista: 1,
        resolvida: 2,
      };
      return order[a.status] - order[b.status];
    });

  return { items, warnings, readAt: new Date().toISOString(), sheetsOk };
}
