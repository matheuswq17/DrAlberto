"use client";

// Visão Mês da Agenda: cada dia mostra um ponto colorido por hospital que tem
// consulta naquele dia. Clicar no dia abre a lista de consultas; clicar numa
// consulta mostra a mesma ficha estruturada das outras visões (com "Voltar").

import { useState } from "react";
import type { AgendaEntry, MonthCell } from "@/lib/agenda";
import {
  ALL_UNITS,
  NO_UNIT_COLOR,
  UNIT_COLOR,
  type UnitId,
} from "@/lib/units";
import { cn } from "@/lib/utils";
import {
  EntryDetailBody,
  entryDayLabel,
} from "@/components/agenda-entry-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeftIcon, TriangleAlertIcon } from "lucide-react";

const WEEKDAY_HEADERS = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];

export function AgendaMonth({
  cells,
  entries,
  todayKey,
  pendingEventIds,
}: {
  cells: MonthCell[];
  entries: AgendaEntry[];
  todayKey: string;
  pendingEventIds: Set<string>;
}) {
  const [openDay, setOpenDay] = useState<string | null>(null);
  const [selected, setSelected] = useState<AgendaEntry | null>(null);

  const byDay = new Map<string, AgendaEntry[]>();
  for (const entry of entries) {
    const list = byDay.get(entry.dayKey) ?? [];
    list.push(entry);
    byDay.set(entry.dayKey, list);
  }

  const dayEntries = openDay ? (byDay.get(openDay) ?? []) : [];

  function close() {
    setOpenDay(null);
    setSelected(null);
  }

  return (
    <>
      <div className="overflow-hidden rounded-lg border bg-card">
        <div className="grid grid-cols-7 border-b">
          {WEEKDAY_HEADERS.map((label) => (
            <p
              key={label}
              className="px-2 py-1.5 text-center text-xs text-muted-foreground"
            >
              {label}
            </p>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((cell, i) => {
            const list = byDay.get(cell.key) ?? [];
            const unitsHere = ALL_UNITS.filter((u: UnitId) =>
              list.some((e) => e.unit === u)
            );
            const hasNoUnit = list.some((e) => e.unit === null);
            const hasPendingPayment = list.some((e) => pendingEventIds.has(e.id));
            const isToday = cell.key === todayKey;
            return (
              <button
                key={cell.key}
                type="button"
                disabled={list.length === 0}
                onClick={() => setOpenDay(cell.key)}
                className={cn(
                  "flex h-16 flex-col items-start justify-between border-b p-1.5 text-left sm:h-20 sm:p-2",
                  i % 7 !== 0 && "border-l",
                  !cell.inMonth && "bg-muted/40",
                  list.length > 0 && "cursor-pointer hover:bg-accent",
                  isToday && "bg-primary/5"
                )}
              >
                <span
                  className={cn(
                    "text-xs",
                    cell.inMonth ? "text-foreground" : "text-muted-foreground/60",
                    isToday &&
                      "flex size-5 items-center justify-center rounded-full bg-primary font-medium text-primary-foreground"
                  )}
                >
                  {cell.dayNum}
                </span>
                {list.length > 0 && (
                  <span className="flex items-center gap-1">
                    {unitsHere.map((u) => (
                      <span
                        key={u}
                        className={`size-2 rounded-full ${UNIT_COLOR[u].dot}`}
                      />
                    ))}
                    {hasNoUnit && (
                      <span
                        className={`size-2 rounded-full ${NO_UNIT_COLOR.dot}`}
                      />
                    )}
                    {hasPendingPayment && (
                      <TriangleAlertIcon
                        aria-label="Há pagamento pendente neste dia"
                        className="size-2.5 text-status-warning-foreground"
                      />
                    )}
                    <span className="text-[10px] text-muted-foreground">
                      {list.length}
                    </span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <Dialog open={openDay !== null} onOpenChange={(open) => !open && close()}>
        {openDay && (
          <DialogContent>
            {selected ? (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setSelected(null)}
                      aria-label="Voltar para a lista do dia"
                    >
                      <ArrowLeftIcon />
                    </Button>
                    {selected.patientLabel || "(sem título)"}
                  </DialogTitle>
                  <DialogDescription>
                    {entryDayLabel(selected.dayKey)}
                  </DialogDescription>
                </DialogHeader>
                <EntryDetailBody
                  entry={selected}
                  paymentPending={pendingEventIds.has(selected.id)}
                />
              </>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle>{entryDayLabel(openDay)}</DialogTitle>
                  <DialogDescription>
                    {dayEntries.length} consulta
                    {dayEntries.length === 1 ? "" : "s"} — toque para ver a
                    ficha.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-1">
                  {dayEntries.map((entry) => {
                    const color = entry.unit
                      ? UNIT_COLOR[entry.unit]
                      : NO_UNIT_COLOR;
                    return (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => setSelected(entry)}
                        className="flex items-center gap-2 rounded-md border px-2.5 py-2 text-left text-sm hover:bg-accent"
                      >
                        <span
                          className={`size-2.5 shrink-0 rounded-full ${color.dot}`}
                        />
                        <span className="w-10 shrink-0 text-xs text-muted-foreground">
                          {entry.startLabel}
                        </span>
                        <span className="truncate font-medium">
                          {entry.patientLabel || "(sem título)"}
                        </span>
                        {pendingEventIds.has(entry.id) && (
                          <TriangleAlertIcon
                            aria-label="Pagamento pendente"
                            className="size-3 shrink-0 text-status-warning-foreground"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
