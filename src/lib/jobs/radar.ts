import type { SupabaseClient } from "@supabase/supabase-js";
import { listEvents } from "@/lib/google/calendar";

// Radar de vagas liberadas (func. 3): a cada 15 minutos tira um snapshot do
// Calendar (LEITURA apenas) e compara com o snapshot anterior. Evento futuro
// que sumiu = vaga liberada (cancelamento). O site NUNCA escreve no Calendar;
// o remanejamento é só uma mensagem de WhatsApp aprovada por humano — o
// agendamento em si acontece pelo fluxo do bot quando o paciente responde.

export interface SnapshotEvent {
  eventId: string;
  start: string; // ISO
  end: string;
  summary: string;
  unit: string | null;
}

export interface FreedSlotCandidate {
  calendar_event_id: string;
  unit: string | null;
  starts_at: string;
  ends_at: string;
  reason: "cancelamento" | "no_show" | "desconhecido";
}

/**
 * Eventos que existiam no snapshot anterior, começam no futuro e não estão
 * mais na agenda = vaga liberada por cancelamento.
 * (No-show não é detectável só pelo Calendar; fica como marcação manual.)
 */
export function diffSnapshots(
  previous: SnapshotEvent[],
  current: SnapshotEvent[],
  now: Date
): FreedSlotCandidate[] {
  const currentIds = new Set(current.map((e) => e.eventId));
  return previous
    .filter(
      (e) => !currentIds.has(e.eventId) && new Date(e.start) > now
    )
    .map((e) => ({
      calendar_event_id: e.eventId,
      unit: e.unit,
      starts_at: e.start,
      ends_at: e.end,
      reason: "cancelamento" as const,
    }));
}

export async function runRadar(
  supabase: SupabaseClient,
  now = new Date()
): Promise<{ freedDetected: number; snapshotSize: number }> {
  const horizon = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const events = await listEvents(now, horizon);
  const snapshot: SnapshotEvent[] = events
    .filter((e) => !e.allDay)
    .map((e) => ({
      eventId: e.id,
      start: e.start,
      end: e.end,
      summary: e.title,
      unit: e.unit,
    }));

  const { data: prevRow } = await supabase
    .from("calendar_snapshots")
    .select("events, taken_at")
    .order("taken_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let freedDetected = 0;
  if (prevRow) {
    const freed = diffSnapshots(
      prevRow.events as SnapshotEvent[],
      snapshot,
      now
    );
    for (const f of freed) {
      // unique (calendar_event_id, starts_at) evita duplicar em re-execuções
      const { error } = await supabase
        .from("freed_slots")
        .upsert(f, {
          onConflict: "calendar_event_id,starts_at",
          ignoreDuplicates: true,
        });
      if (error) {
        console.error(`freed_slots upsert falhou: ${error.message}`);
      } else {
        freedDetected += 1;
      }
    }
  }

  const { error: snapError } = await supabase
    .from("calendar_snapshots")
    .insert({ taken_at: now.toISOString(), events: snapshot });
  if (snapError) throw new Error(`calendar_snapshots: ${snapError.message}`);

  // manter só os últimos 200 snapshots (15min ≈ 2 dias)
  const { data: old } = await supabase
    .from("calendar_snapshots")
    .select("id")
    .order("taken_at", { ascending: false })
    .range(200, 400);
  if (old && old.length > 0) {
    await supabase
      .from("calendar_snapshots")
      .delete()
      .in(
        "id",
        old.map((o) => o.id)
      );
  }

  return { freedDetected, snapshotSize: snapshot.length };
}
