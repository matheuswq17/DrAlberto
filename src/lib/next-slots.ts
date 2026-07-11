import type { SupabaseClient } from "@supabase/supabase-js";
import { listEvents } from "@/lib/google/calendar";
import {
  nextFreeSlotPerUnit,
  type BusyInterval,
  type ScheduleRow,
  type Slot,
} from "@/lib/availability";
import { ALL_UNITS, UNIT_LABELS, type UnitId } from "@/lib/units";
import { isGoogleConfigured, type SourceWarning } from "@/lib/today";
import { perfTime } from "@/lib/perf";

export interface NextSlotsResult {
  units: Array<{
    unit: UnitId;
    label: string;
    next: Slot | null;
  }>;
  warnings: SourceWarning[];
  readAt: string;
  /** true quando grade e calendário foram lidos com sucesso */
  ok: boolean;
}

export async function getNextSlots(
  supabase: SupabaseClient
): Promise<NextSlotsResult> {
  const { data: scheduleRows, error } = await supabase
    .from("unit_schedules")
    .select("unit, weekday, start_time, end_time, slot_minutes");
  if (error) throw new Error(`unit_schedules: ${error.message}`);

  const schedules = (scheduleRows ?? []) as ScheduleRow[];
  const warnings: SourceWarning[] = [];
  let ok = true;

  if (schedules.length === 0) {
    return {
      units: ALL_UNITS.map((unit) => ({
        unit,
        label: UNIT_LABELS[unit],
        next: null,
      })),
      warnings: [
        {
          kind: "config",
          text: "Nenhuma grade de atendimento cadastrada — sem ela não há como calcular horários livres.",
          href: "/config",
        },
      ],
      readAt: new Date().toISOString(),
      ok: false,
    };
  }

  const now = new Date();
  const horizon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  let busy: BusyInterval[] = [];
  if (!isGoogleConfigured().calendar) {
    ok = false;
    warnings.push({
      kind: "config",
      text: "Google Calendar não configurado — mostrando a grade sem descontar eventos.",
    });
  } else {
    try {
      const events = await perfTime("google-calendar (next-slots)", listEvents(now, horizon));
      busy = events
        .filter((e) => !e.allDay)
        .map((e) => ({ start: new Date(e.start), end: new Date(e.end) }));
    } catch (err) {
      ok = false;
      warnings.push({
        kind: "erro",
        text: `Leitura do Google Calendar falhou (${(err as Error).message}) — mostrando a grade sem descontar eventos.`,
      });
    }
  }

  const perUnit = nextFreeSlotPerUnit(schedules, busy, now);
  return {
    units: ALL_UNITS.map((unit) => ({
      unit,
      label: UNIT_LABELS[unit],
      next: perUnit[unit],
    })),
    warnings,
    readAt: new Date().toISOString(),
    ok,
  };
}
