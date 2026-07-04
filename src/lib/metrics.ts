import type { Lead } from "@/lib/google/sheets";

// Agregações do funil (func. 6) e insumos do relatório periódico (func. 7).
// Tudo calculado sobre os leads do Sheets — leitura apenas, sem LLM.

export interface QuestionStat {
  question: string;
  count: number;
  converted: number;
}

export interface FunnelMetrics {
  totalLeads: number;
  totalFaq: number;
  faqConverted: number;
  /** taxa FAQ→agendamento, 0..1 (0 quando não há FAQ) */
  conversionRate: number;
  topQuestions: QuestionStat[];
  /** perguntas mais frequentes que nunca converteram */
  topUnconverted: QuestionStat[];
}

function isFaq(lead: Lead): boolean {
  return lead.tipo.includes("faq") || lead.perguntaFaq.trim() !== "";
}

function normalizeQuestion(q: string): string {
  return q.trim().replace(/\s+/g, " ");
}

/**
 * Um lead de FAQ "converteu" quando a própria linha está marcada como
 * agendado OU quando existe outra linha do mesmo telefone marcada como
 * agendada (o paciente perguntou e depois marcou).
 */
export function computeFunnel(leads: Lead[]): FunnelMetrics {
  const phonesAgendados = new Set(
    leads.filter((l) => l.agendado && l.phone).map((l) => l.phone)
  );

  const faqLeads = leads.filter(isFaq);
  const convertedOf = (l: Lead) =>
    l.agendado || (l.phone !== "" && phonesAgendados.has(l.phone));

  const byQuestion = new Map<string, QuestionStat>();
  for (const lead of faqLeads) {
    const q = normalizeQuestion(lead.perguntaFaq);
    if (!q) continue;
    const key = q.toLowerCase();
    const stat = byQuestion.get(key) ?? { question: q, count: 0, converted: 0 };
    stat.count += 1;
    if (convertedOf(lead)) stat.converted += 1;
    byQuestion.set(key, stat);
  }

  const allQuestions = [...byQuestion.values()].sort(
    (a, b) => b.count - a.count
  );
  const faqConverted = faqLeads.filter(convertedOf).length;

  return {
    totalLeads: leads.length,
    totalFaq: faqLeads.length,
    faqConverted,
    conversionRate: faqLeads.length > 0 ? faqConverted / faqLeads.length : 0,
    topQuestions: allQuestions.slice(0, 10),
    topUnconverted: allQuestions
      .filter((q) => q.converted === 0)
      .slice(0, 10),
  };
}
