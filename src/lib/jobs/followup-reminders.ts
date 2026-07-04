import type { SupabaseClient } from "@supabase/supabase-js";
import { sendWhatsAppMessage } from "@/lib/evolution";

// Job diário (func. 4): follow-ups pendentes com due_date se aproximando
// recebem UM lembrete via WhatsApp e passam para status 'lembrete_enviado'.

export interface FollowUpRow {
  id: string;
  patient_name: string;
  phone: string;
  procedure: string;
  procedure_date: string;
  due_date: string; // YYYY-MM-DD
  status: string;
}

/** Pendentes cuja data de retorno está a até `leadDays` dias (ou vencida). */
export function selectDueFollowUps(
  rows: FollowUpRow[],
  today: Date,
  leadDays: number
): FollowUpRow[] {
  const cutoff = new Date(today);
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() + leadDays);
  return rows.filter((r) => {
    if (r.status !== "pendente") return false;
    const due = new Date(`${r.due_date}T00:00:00`);
    return due <= cutoff;
  });
}

export function reminderMessage(row: FollowUpRow): string {
  const due = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(`${row.due_date}T12:00:00`));
  return (
    `Olá, ${row.patient_name}! Aqui é do consultório do Dr. Alberto Rassi. ` +
    `Seu retorno referente a ${row.procedure} está previsto para ${due}. ` +
    `Para agendar, é só responder esta mensagem.`
  );
}

export async function runFollowUpReminders(
  supabase: SupabaseClient,
  now = new Date()
): Promise<{ sent: number; failed: number; checked: number }> {
  const { data: settings } = await supabase
    .from("app_settings")
    .select("key, value")
    .eq("key", "followup_lead_days");
  const leadDays = Number(settings?.[0]?.value ?? 3);

  const { data: rows, error } = await supabase
    .from("follow_ups")
    .select("id, patient_name, phone, procedure, procedure_date, due_date, status")
    .eq("status", "pendente");
  if (error) throw new Error(`follow_ups: ${error.message}`);

  const due = selectDueFollowUps((rows ?? []) as FollowUpRow[], now, leadDays);
  let sent = 0;
  let failed = 0;

  for (const row of due) {
    const result = await sendWhatsAppMessage({
      phone: row.phone,
      body: reminderMessage(row),
      kind: "lembrete_retorno",
      relatedId: row.id,
    });
    if (result.ok) {
      sent += 1;
      await supabase
        .from("follow_ups")
        .update({
          status: "lembrete_enviado",
          reminder_sent_at: new Date().toISOString(),
        })
        .eq("id", row.id);
    } else {
      failed += 1;
      console.error(
        `Lembrete de retorno falhou (${row.id}): ${result.error}`
      );
    }
  }

  return { sent, failed, checked: due.length };
}
