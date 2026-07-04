import type { SupabaseClient } from "@supabase/supabase-js";

// Remanejamento em 1 clique (func. 3) — SEMPRE com aprovação humana.
// Aprovar envia a oferta por WhatsApp; o agendamento em si acontece no fluxo
// do bot quando o paciente responde. Nenhuma escrita no Google Calendar.

export interface FreedSlotRow {
  id: string;
  calendar_event_id: string;
  unit: string | null;
  starts_at: string;
  ends_at: string;
  reason: string;
  status: string;
}

export interface WaitingRow {
  id: string;
  patient_name: string;
  phone: string;
  preferred_unit: string | null;
  notes: string | null;
  status: string;
  created_at: string;
}

export interface SuggestionRow {
  id: string;
  freed_slot_id: string;
  waiting_list_id: string;
  status: string;
  sent_at: string | null;
  created_at: string;
}

export interface RadarSlot {
  slot: FreedSlotRow;
  /** próximo da fila ainda não sugerido para esta vaga (preferência de unidade primeiro, depois FIFO) */
  candidate: WaitingRow | null;
}

/**
 * Escolhe o próximo candidato da fila para uma vaga: entradas 'aguardando'
 * sem sugestão anterior (enviada OU rejeitada) para a mesma vaga; quem
 * prefere a unidade da vaga vem primeiro; empate = ordem de chegada.
 */
export function pickCandidate(
  slot: FreedSlotRow,
  waiting: WaitingRow[],
  suggestions: SuggestionRow[]
): WaitingRow | null {
  const alreadyTried = new Set(
    suggestions
      .filter((s) => s.freed_slot_id === slot.id)
      .map((s) => s.waiting_list_id)
  );
  const eligible = waiting
    .filter((w) => w.status === "aguardando" && !alreadyTried.has(w.id))
    .sort((a, b) => {
      const aPref = a.preferred_unit === slot.unit ? 0 : 1;
      const bPref = b.preferred_unit === slot.unit ? 0 : 1;
      if (aPref !== bPref) return aPref - bPref;
      return a.created_at.localeCompare(b.created_at);
    });
  return eligible[0] ?? null;
}

export function offerMessage(
  patientName: string,
  slot: FreedSlotRow,
  unitLabel: string
): string {
  const when = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(slot.starts_at));
  return (
    `Olá, ${patientName}! Aqui é do consultório do Dr. Alberto Rassi. ` +
    `Abriu um horário: ${when}, na unidade ${unitLabel}. ` +
    `Se quiser aproveitar, responda esta mensagem para confirmar.`
  );
}

export async function getRadarData(supabase: SupabaseClient): Promise<{
  openSlots: RadarSlot[];
  waiting: WaitingRow[];
  sentSuggestions: Array<
    SuggestionRow & { slot?: FreedSlotRow; patient?: WaitingRow }
  >;
}> {
  const nowIso = new Date().toISOString();

  const [slotsRes, waitingRes, suggRes] = await Promise.all([
    supabase
      .from("freed_slots")
      .select("*")
      .in("status", ["aberta", "sugerida"])
      .gte("starts_at", nowIso)
      .order("starts_at"),
    supabase.from("waiting_list").select("*").order("created_at"),
    supabase
      .from("reschedule_suggestions")
      .select("*")
      .order("created_at", { ascending: false }),
  ]);

  const slots = (slotsRes.data ?? []) as FreedSlotRow[];
  const waiting = (waitingRes.data ?? []) as WaitingRow[];
  const suggestions = (suggRes.data ?? []) as SuggestionRow[];

  const slotById = new Map(slots.map((s) => [s.id, s]));
  const waitingById = new Map(waiting.map((w) => [w.id, w]));

  return {
    openSlots: slots.map((slot) => ({
      slot,
      candidate: pickCandidate(slot, waiting, suggestions),
    })),
    waiting: waiting.filter((w) => w.status !== "removido"),
    sentSuggestions: suggestions
      .filter((s) => s.status === "aprovada_enviada")
      .slice(0, 20)
      .map((s) => ({
        ...s,
        slot: slotById.get(s.freed_slot_id),
        patient: waitingById.get(s.waiting_list_id),
      })),
  };
}
