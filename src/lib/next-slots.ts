import type { SupabaseClient } from "@supabase/supabase-js";
import { listEvents } from "@/lib/google/calendar";
import {
  nextFreeSlotPerUnit,
  type BusyInterval,
  type ScheduleRow,
  type Slot,
} from "@/lib/availability";
import { ALL_UNITS, UNIT_LABELS, type UnitId } from "@/lib/units";

export interface NextSlotsResult {
  units: Array<{
    unit: UnitId;
    label: string;
    next: Slot | null;
  }>;
  /** aviso não-fatal (ex.: Calendar sem credencial, grade vazia) */
  warning?: string;
}

export async function getNextSlots(
  supabase: SupabaseClient
): Promise<NextSlotsResult> {
  const { data: scheduleRows, error } = await supabase
    .from("unit_schedules")
    .select("unit, weekday, start_time, end_time, slot_minutes");
  if (error) throw new Error(`unit_schedules: ${error.message}`);

  const schedules = (scheduleRows ?? []) as ScheduleRow[];
  if (schedules.length === 0) {
    return {
      units: ALL_UNITS.map((unit) => ({
        unit,
        label: UNIT_LABELS[unit],
        next: null,
      })),
      warning:
        "Nenhuma grade de atendimento cadastrada — configure em Config.",
    };
  }

  const now = new Date();
  const horizon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  let busy: BusyInterval[] = [];
  let warning: string | undefined;
  try {
    const events = await listEvents(now, horizon);
    busy = events
      .filter((e) => !e.allDay)
      .map((e) => ({ start: new Date(e.start), end: new Date(e.end) }));
  } catch (err) {
    warning = `Google Calendar indisponível (${(err as Error).message}) — mostrando a grade sem descontar eventos.`;
  }

  const perUnit = nextFreeSlotPerUnit(schedules, busy, now);
  return {
    units: ALL_UNITS.map((unit) => ({
      unit,
      label: UNIT_LABELS[unit],
      next: perUnit[unit],
    })),
    warning,
  };
}
