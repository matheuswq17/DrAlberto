import type { Lead } from "@/lib/google/sheets";
import { parseLeadDate } from "@/lib/lead-date";

// Período do Funil (func. 6) — filtra o CONJUNTO de leads antes de
// computeFunnel; a fórmula de conversão em si (lib/metrics.ts) não muda.

export const PERIODS = ["7", "30", "90"] as const;
export type Period = (typeof PERIODS)[number];

export function isPeriod(value: string | undefined | null): value is Period {
  return !!value && (PERIODS as readonly string[]).includes(value);
}

export interface PeriodFilterResult {
  filtered: Lead[];
  /** leads fora do recorte por não termos reconhecido a data — nunca contados como "dentro" nem "fora" às cegas */
  unrecognizedDate: number;
}

/**
 * `period: null` = todo o período (comportamento padrão, idêntico ao de
 * antes do seletor existir — não muda nenhum número sem escolha explícita).
 */
export function filterByPeriod(
  leads: Lead[],
  period: Period | null,
  now = new Date()
): PeriodFilterResult {
  if (!period) return { filtered: leads, unrecognizedDate: 0 };

  const days = Number(period);
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - days);

  let unrecognizedDate = 0;
  const filtered = leads.filter((lead) => {
    const date = parseLeadDate(lead.createdAt);
    if (!date) {
      unrecognizedDate += 1;
      return false;
    }
    return date >= cutoff;
  });
  return { filtered, unrecognizedDate };
}
