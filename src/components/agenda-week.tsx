"use client";

// Visão Semana da Agenda: grade dias × horas, um bloco colorido por consulta
// (cor fixa do hospital, nome do paciente truncado). Área sem bloco = horário
// livre (linhas pontilhadas cinza). Clique no bloco abre a ficha do paciente.

import { useState } from "react";
import type { AgendaEntry } from "@/lib/agenda";
import { NO_UNIT_COLOR, UNIT_COLOR } from "@/lib/units";
import { cn } from "@/lib/utils";
import { AgendaEntryDialog } from "@/components/agenda-entry-dialog";

const HOUR_PX = 48;

export interface WeekDayCol {
  key: string;
  weekdayLabel: string; // "seg."
  dayLabel: string; // "07/07"
  isToday: boolean;
}

export function AgendaWeek({
  days,
  entries,
  startHour,
  endHour,
}: {
  days: WeekDayCol[];
  entries: AgendaEntry[];
  startHour: number;
  endHour: number;
}) {
  const [selected, setSelected] = useState<AgendaEntry | null>(null);

  const heightPx = (endHour - startHour) * HOUR_PX;
  const hours = Array.from(
    { length: endHour - startHour },
    (_, i) => startHour + i
  );
  const topOf = (min: number) => ((min - startHour * 60) / 60) * HOUR_PX;

  return (
    <>
      <div className="overflow-x-auto rounded-lg border bg-card">
        <div className="min-w-[760px]">
          <div className="grid grid-cols-[52px_repeat(7,minmax(0,1fr))] border-b">
            <div />
            {days.map((day) => (
              <div
                key={day.key}
                className={cn(
                  "border-l px-2 py-2 text-center",
                  day.isToday && "bg-primary/5"
                )}
              >
                <p className="text-xs text-muted-foreground">
                  {day.weekdayLabel}
                </p>
                <p
                  className={cn(
                    "text-sm font-medium",
                    day.isToday && "text-primary"
                  )}
                >
                  {day.dayLabel}
                </p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-[52px_repeat(7,minmax(0,1fr))]">
            <div className="relative" style={{ height: heightPx }}>
              {hours.map((h) => (
                <span
                  key={h}
                  className="absolute right-1.5 text-[10px] leading-none text-muted-foreground"
                  style={{ top: (h - startHour) * HOUR_PX + 3 }}
                >
                  {h}h
                </span>
              ))}
            </div>

            {days.map((day) => (
              <div
                key={day.key}
                className={cn(
                  "relative border-l",
                  day.isToday && "bg-primary/5"
                )}
                style={{ height: heightPx }}
              >
                {/* linhas pontilhadas de hora em hora = horários livres */}
                {hours.map((h) => (
                  <div
                    key={h}
                    aria-hidden
                    className="absolute inset-x-0 border-t border-dashed border-border/70"
                    style={{ top: (h - startHour) * HOUR_PX }}
                  />
                ))}

                {entries
                  .filter((e) => e.dayKey === day.key)
                  .map((entry) => {
                    const color = entry.unit
                      ? UNIT_COLOR[entry.unit]
                      : NO_UNIT_COLOR;
                    return (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => setSelected(entry)}
                        title={`${entry.startLabel} ${entry.patientLabel}`}
                        className={cn(
                          "absolute inset-x-0.5 overflow-hidden rounded-md border-l-4 px-1.5 py-0.5 text-left transition-opacity hover:opacity-80",
                          color.block
                        )}
                        style={{
                          top: topOf(entry.startMin),
                          height: Math.max(
                            topOf(entry.endMin) - topOf(entry.startMin),
                            22
                          ),
                        }}
                      >
                        <span className="block truncate text-xs font-medium text-foreground">
                          {entry.patientLabel || "(sem título)"}
                        </span>
                        <span className="block truncate text-[10px] text-muted-foreground">
                          {entry.startLabel}
                        </span>
                      </button>
                    );
                  })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <AgendaEntryDialog entry={selected} onClose={() => setSelected(null)} />
    </>
  );
}
