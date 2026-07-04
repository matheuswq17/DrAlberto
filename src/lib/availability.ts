import { ALL_UNITS, type UnitId } from "@/lib/units";

// Cálculo de horários livres: unit_schedules (grade de atendimento por
// unidade) menos os eventos do Google Calendar. Como é UM médico e UM
// calendário único, QUALQUER evento ocupa o horário, independente da unidade
// do evento — o médico não pode estar em duas unidades ao mesmo tempo.

export interface ScheduleRow {
  unit: UnitId;
  weekday: number; // 0=domingo … 6=sábado
  start_time: string; // "HH:MM" ou "HH:MM:SS"
  end_time: string;
  slot_minutes: number;
}

export interface BusyInterval {
  start: Date;
  end: Date;
}

export interface Slot {
  start: Date;
  end: Date;
}

function parseTime(base: Date, time: string): Date {
  const [h, m] = time.split(":").map(Number);
  const d = new Date(base);
  d.setHours(h, m ?? 0, 0, 0);
  return d;
}

function overlaps(aStart: Date, aEnd: Date, b: BusyInterval): boolean {
  return aStart < b.end && aEnd > b.start;
}

/** Próximo slot livre de uma unidade a partir de `from`, ou null. */
export function nextFreeSlot(
  unit: UnitId,
  schedules: ScheduleRow[],
  busy: BusyInterval[],
  from: Date,
  horizonDays = 30
): Slot | null {
  const unitRows = schedules.filter((s) => s.unit === unit);
  if (unitRows.length === 0) return null;

  for (let d = 0; d < horizonDays; d++) {
    const day = new Date(from);
    day.setDate(day.getDate() + d);
    day.setHours(0, 0, 0, 0);

    const rows = unitRows
      .filter((r) => r.weekday === day.getDay())
      .sort((a, b) => a.start_time.localeCompare(b.start_time));

    for (const row of rows) {
      const windowStart = parseTime(day, row.start_time);
      const windowEnd = parseTime(day, row.end_time);
      const stepMs = row.slot_minutes * 60 * 1000;

      for (
        let t = windowStart.getTime();
        t + stepMs <= windowEnd.getTime();
        t += stepMs
      ) {
        const slotStart = new Date(t);
        const slotEnd = new Date(t + stepMs);
        if (slotStart <= from) continue;
        if (busy.some((b) => overlaps(slotStart, slotEnd, b))) continue;
        return { start: slotStart, end: slotEnd };
      }
    }
  }
  return null;
}

export function nextFreeSlotPerUnit(
  schedules: ScheduleRow[],
  busy: BusyInterval[],
  from: Date,
  horizonDays = 30
): Record<UnitId, Slot | null> {
  return Object.fromEntries(
    ALL_UNITS.map((u) => [u, nextFreeSlot(u, schedules, busy, from, horizonDays)])
  ) as Record<UnitId, Slot | null>;
}
