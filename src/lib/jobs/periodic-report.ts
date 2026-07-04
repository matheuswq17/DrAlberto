import type { SupabaseClient } from "@supabase/supabase-js";
import { listEvents } from "@/lib/google/calendar";
import { fetchLeads } from "@/lib/google/sheets";
import { computeFunnel } from "@/lib/metrics";
import { getUrgencies } from "@/lib/urgencies";
import { sendWhatsAppMessage } from "@/lib/evolution";
import type { ScheduleRow } from "@/lib/availability";

// Relatório periódico (func. 7) — ÚNICA mensagem que o site manda para o
// Dr. Alberto, sempre por AGENDAMENTO (cron), nunca disparada por evento.

export interface ReportData {
  periodLabel: string;
  totalEvents: number | null; // null = Calendar indisponível
  totalSlots: number | null; // null = grade não cadastrada
  freedNoShow: number;
  freedCancel: number;
  openUrgencies: number | null; // null = Sheets indisponível
  totalFaq: number | null;
  faqConverted: number | null;
  conversionRate: number | null;
  notes: string[];
}

/** Quantos slots a grade oferece dentro do período. */
export function countScheduledSlots(
  schedules: ScheduleRow[],
  from: Date,
  to: Date
): number {
  let total = 0;
  const day = new Date(from);
  day.setHours(0, 0, 0, 0);
  while (day < to) {
    for (const row of schedules) {
      if (row.weekday !== day.getDay()) continue;
      const [sh, sm] = row.start_time.split(":").map(Number);
      const [eh, em] = row.end_time.split(":").map(Number);
      const minutes = eh * 60 + (em ?? 0) - (sh * 60 + (sm ?? 0));
      if (minutes > 0 && row.slot_minutes > 0) {
        total += Math.floor(minutes / row.slot_minutes);
      }
    }
    day.setDate(day.getDate() + 1);
  }
  return total;
}

export function buildReportMessage(d: ReportData): string {
  const lines: string[] = [
    `📋 Relatório ${d.periodLabel} — Consultório Dr. Alberto Rassi`,
    "",
  ];

  if (d.totalEvents !== null && d.totalSlots !== null && d.totalSlots > 0) {
    const pct = Math.round((d.totalEvents / d.totalSlots) * 100);
    lines.push(
      `Ocupação: ${d.totalEvents} consultas em ${d.totalSlots} horários (${pct}%)`
    );
  } else if (d.totalEvents !== null) {
    lines.push(`Consultas no período: ${d.totalEvents}`);
  }

  lines.push(
    `Vagas liberadas: ${d.freedCancel} cancelamento(s), ${d.freedNoShow} no-show(s)`
  );

  if (d.openUrgencies !== null) {
    lines.push(`Urgências abertas (sem revisão): ${d.openUrgencies}`);
  }

  if (d.totalFaq !== null && d.conversionRate !== null) {
    lines.push(
      `Funil: ${d.totalFaq} conversas de FAQ, ${d.faqConverted} viraram consulta (${Math.round(
        d.conversionRate * 100
      )}%)`
    );
  }

  if (d.notes.length > 0) {
    lines.push("", ...d.notes.map((n) => `⚠️ ${n}`));
  }

  return lines.join("\n");
}

export async function runPeriodicReport(
  supabase: SupabaseClient,
  now = new Date()
): Promise<{ sent: boolean; reason?: string }> {
  const { data: settingsRows } = await supabase
    .from("app_settings")
    .select("key, value");
  const settings = Object.fromEntries(
    (settingsRows ?? []).map((r) => [r.key, r.value])
  );

  const phone = settings.report_phone;
  if (!phone) {
    return { sent: false, reason: "report_phone não configurado em /config" };
  }

  const period = settings.report_period === "mensal" ? "mensal" : "semanal";
  const from = new Date(now);
  if (period === "mensal") from.setMonth(from.getMonth() - 1);
  else from.setDate(from.getDate() - 7);

  const notes: string[] = [];

  let totalEvents: number | null = null;
  try {
    const events = await listEvents(from, now);
    totalEvents = events.filter((e) => !e.allDay).length;
  } catch {
    notes.push("Google Calendar indisponível — ocupação não calculada.");
  }

  const { data: scheduleRows } = await supabase
    .from("unit_schedules")
    .select("unit, weekday, start_time, end_time, slot_minutes");
  const schedules = (scheduleRows ?? []) as ScheduleRow[];
  const totalSlots =
    schedules.length > 0 ? countScheduledSlots(schedules, from, now) : null;

  const { data: freed } = await supabase
    .from("freed_slots")
    .select("reason")
    .gte("detected_at", from.toISOString());
  const freedNoShow = (freed ?? []).filter((f) => f.reason === "no_show").length;
  const freedCancel = (freed ?? []).filter(
    (f) => f.reason === "cancelamento"
  ).length;

  let openUrgencies: number | null = null;
  let totalFaq: number | null = null;
  let faqConverted: number | null = null;
  let conversionRate: number | null = null;
  try {
    const { items } = await getUrgencies(supabase);
    openUrgencies = items.filter((i) => i.status === "aberta").length;
    const funnel = computeFunnel(await fetchLeads());
    totalFaq = funnel.totalFaq;
    faqConverted = funnel.faqConverted;
    conversionRate = funnel.conversionRate;
  } catch {
    notes.push("Google Sheets indisponível — funil e urgências não calculados.");
  }

  const body = buildReportMessage({
    periodLabel: period === "mensal" ? "mensal" : "semanal",
    totalEvents,
    totalSlots,
    freedNoShow,
    freedCancel,
    openUrgencies,
    totalFaq,
    faqConverted,
    conversionRate,
    notes,
  });

  const result = await sendWhatsAppMessage({
    phone,
    body,
    kind: "relatorio_periodico",
  });
  if (!result.ok) return { sent: false, reason: result.error };
  return { sent: true };
}
