import type { SupabaseClient } from "@supabase/supabase-js";
import type { UnitId } from "@/lib/units";

export interface ProcedureOption {
  id: string;
  name: string;
}

export interface ProcedureBookingSummary {
  id: string;
  patientName: string;
  patientPhone: string;
  procedureName: string;
  unit: UnitId;
  startsAt: string; // ISO
  endsAt: string; // ISO
  durationMinutes: number;
  paymentStatus: "pendente" | "confirmado";
  calendarEventId: string;
}

interface ActiveBookingRow {
  id: string;
  patient_name: string;
  patient_phone: string;
  unit: UnitId;
  starts_at: string;
  ends_at: string;
  payment_status: "pendente" | "confirmado";
  calendar_event_id: string;
  procedures: { name: string } | { name: string }[] | null;
}

/**
 * Procedimentos marcados ainda ativos (não cancelados), indexados pelo id do
 * evento no Google Calendar — cruza com AgendaEntry.id / CalendarEvent.id
 * pra saber quais blocos da grade têm o botão "Desmarcar"/"Alterar
 * data/hora" (só procedimentos marcados pelo painel, nunca consultas do
 * bot).
 */
export async function getActiveProcedureBookingsByEventId(
  supabase: SupabaseClient
): Promise<Map<string, ProcedureBookingSummary>> {
  const { data } = await supabase
    .from("procedure_bookings")
    .select(
      "id, patient_name, patient_phone, unit, starts_at, ends_at, payment_status, calendar_event_id, procedures(name)"
    )
    .is("canceled_at", null);

  const map = new Map<string, ProcedureBookingSummary>();
  for (const row of (data ?? []) as unknown as ActiveBookingRow[]) {
    const procedure = Array.isArray(row.procedures) ? row.procedures[0] : row.procedures;
    const durationMinutes = Math.round(
      (new Date(row.ends_at).getTime() - new Date(row.starts_at).getTime()) / 60_000
    );
    map.set(row.calendar_event_id, {
      id: row.id,
      patientName: row.patient_name,
      patientPhone: row.patient_phone,
      procedureName: procedure?.name ?? "—",
      unit: row.unit,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      durationMinutes,
      paymentStatus: row.payment_status,
      calendarEventId: row.calendar_event_id,
    });
  }
  return map;
}

/** Catálogo ativo, para o dropdown do modal "Marcar procedimento". */
export async function getActiveProcedures(
  supabase: SupabaseClient
): Promise<ProcedureOption[]> {
  const { data } = await supabase
    .from("procedures")
    .select("id, name")
    .eq("active", true)
    .order("name");
  return (data ?? []) as ProcedureOption[];
}

/**
 * IDs de evento do Calendar com pagamento ainda pendente — usado para
 * cruzar com AgendaEntry.id / CalendarEvent.id e mostrar o selo de aviso nas
 * três visões da Agenda (Dia/Semana/Mês).
 */
export async function getPendingPaymentEventIds(
  supabase: SupabaseClient
): Promise<Set<string>> {
  const { data } = await supabase
    .from("procedure_bookings")
    .select("calendar_event_id")
    .eq("payment_status", "pendente")
    .is("canceled_at", null);
  return new Set((data ?? []).map((r) => r.calendar_event_id as string));
}
