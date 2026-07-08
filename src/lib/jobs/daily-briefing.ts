import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays, spDayKey, spMidnight } from "@/lib/agenda";
import { listEvents } from "@/lib/google/calendar";
import { getUrgencies } from "@/lib/urgencies";
import { sendWhatsAppMessage } from "@/lib/evolution";
import { UNIT_SHORT_LABELS } from "@/lib/units";

// Resumo do dia por WhatsApp — como o relatório periódico, é enviado por
// AGENDAMENTO (cron diário 07:00), nunca disparado por evento, e fica atrás
// do toggle daily_summary_enabled em /config (desligado por padrão).
// Registrado no message_log como 'relatorio_periodico': é a mesma família de
// mensagem agendada e o CHECK da tabela só aceita os 3 kinds originais —
// um kind próprio exigiria migração (decisão a tomar com o Matheus).

export interface DailyBriefingData {
  dateLabel: string;
  /** null = Calendar indisponível */
  consultas: Array<{ time: string; name: string; unitShort: string | null }> | null;
  /** null = Sheets indisponível */
  urgenciasAbertas: number | null;
  encaixesAbertos: number;
}

const MAX_LISTED = 12;

export function buildDailyBriefing(d: DailyBriefingData): string {
  const lines: string[] = [`☀️ Bom dia! Resumo de ${d.dateLabel}:`, ""];

  if (d.consultas === null) {
    lines.push("⚠️ Google Calendar indisponível — consultas não listadas.");
  } else if (d.consultas.length === 0) {
    lines.push("📅 Nenhuma consulta na agenda de hoje.");
  } else {
    lines.push(`📅 ${d.consultas.length} consulta(s):`);
    for (const c of d.consultas.slice(0, MAX_LISTED)) {
      lines.push(`  ${c.time} ${c.name}${c.unitShort ? ` — ${c.unitShort}` : ""}`);
    }
    if (d.consultas.length > MAX_LISTED) {
      lines.push(`  … e mais ${d.consultas.length - MAX_LISTED}.`);
    }
  }

  if (d.urgenciasAbertas === null) {
    lines.push("⚠️ Google Sheets indisponível — urgências não verificadas.");
  } else if (d.urgenciasAbertas > 0) {
    lines.push(`🔴 ${d.urgenciasAbertas} urgência(s) sem revisão.`);
  } else {
    lines.push("Sem urgências pendentes.");
  }

  if (d.encaixesAbertos > 0) {
    lines.push(`🕐 ${d.encaixesAbertos} encaixe(s) em aberto no painel.`);
  }

  return lines.join("\n");
}

export async function runDailyBriefing(
  supabase: SupabaseClient,
  now = new Date()
): Promise<{ sent: boolean; reason?: string }> {
  const { data: settingsRows } = await supabase
    .from("app_settings")
    .select("key, value");
  const settings = Object.fromEntries(
    (settingsRows ?? []).map((r) => [r.key, r.value])
  );

  if (settings.daily_summary_enabled !== "true") {
    return { sent: false, reason: "resumo do dia desativado em /config" };
  }
  const phone = settings.report_phone;
  if (!phone) {
    return { sent: false, reason: "report_phone não configurado em /config" };
  }

  const todayKey = spDayKey(now);

  let consultas: DailyBriefingData["consultas"] = null;
  try {
    const events = await listEvents(
      spMidnight(todayKey),
      spMidnight(addDays(todayKey, 1))
    );
    consultas = events
      .filter((e) => !e.allDay)
      .sort((a, b) => a.start.localeCompare(b.start))
      .map((e) => ({
        time: new Intl.DateTimeFormat("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "America/Sao_Paulo",
        }).format(new Date(e.start)),
        name: e.patientLabel || "(sem título)",
        unitShort: e.unit ? UNIT_SHORT_LABELS[e.unit] : null,
      }));
  } catch {
    // segue com consultas = null; a mensagem avisa a indisponibilidade
  }

  let urgenciasAbertas: number | null = null;
  try {
    const { items, sheetsOk } = await getUrgencies(supabase);
    if (sheetsOk) {
      urgenciasAbertas = items.filter((i) => i.status === "aberta").length;
    }
  } catch {
    // idem
  }

  const { data: freed } = await supabase
    .from("freed_slots")
    .select("id, status")
    .in("status", ["aberta", "sugerida"]);
  const encaixesAbertos = (freed ?? []).length;

  const dateLabel = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(now);

  const body = buildDailyBriefing({
    dateLabel,
    consultas,
    urgenciasAbertas,
    encaixesAbertos,
  });

  const result = await sendWhatsAppMessage({
    phone,
    body,
    kind: "relatorio_periodico",
  });
  if (!result.ok) return { sent: false, reason: result.error };
  return { sent: true };
}
