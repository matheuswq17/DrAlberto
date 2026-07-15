import type { SupabaseClient } from "@supabase/supabase-js";

export interface ProcedureOption {
  id: string;
  name: string;
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
    .eq("payment_status", "pendente");
  return new Set((data ?? []).map((r) => r.calendar_event_id as string));
}
