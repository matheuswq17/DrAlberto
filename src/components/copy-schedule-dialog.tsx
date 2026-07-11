"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import type { ActionState } from "@/lib/action-state";
import { findScheduleConflict, type ScheduleRowLike } from "@/lib/schedule-conflict";
import { UNIT_LABELS, type UnitId } from "@/lib/units";
import { toastManager } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FormSelect } from "@/components/form-select";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";
import { CopyIcon } from "lucide-react";

const WEEKDAYS = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

export interface ScheduleRowForCopy extends ScheduleRowLike {
  unit: UnitId;
  slot_minutes: number;
}

/**
 * Copia uma grade existente para outros dias — prévia mostra, antes de
 * confirmar, quais dias serão copiados e quais serão pulados por conflito
 * (nunca duplica silenciosamente). A cópia só é gravada ao confirmar; até
 * lá, é só um rascunho na tela (reversível).
 */
export function CopyScheduleDialog({
  schedules,
  action,
}: {
  schedules: ScheduleRowForCopy[];
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [open, setOpen] = useState(false);
  const [sourceId, setSourceId] = useState(schedules[0]?.id ?? "");
  const [targetDays, setTargetDays] = useState<number[]>([]);
  const [state, formAction] = useActionState<ActionState, FormData>(
    action,
    null
  );

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toastManager.add({
        title: state.message ?? "Grade copiada ✓",
        type: "success",
        timeout: 4000,
      });
      setOpen(false);
      setTargetDays([]);
    } else {
      toastManager.add({ title: state.error, type: "error", timeout: 4000 });
    }
  }, [state]);

  const source = schedules.find((s) => s.id === sourceId) ?? null;

  const preview = useMemo(() => {
    if (!source) return [];
    return targetDays.map((weekday) => {
      if (weekday === source.weekday) {
        return { weekday, status: "same" as const };
      }
      const conflict = findScheduleConflict(
        {
          unit: source.unit,
          weekday,
          start_time: source.start_time,
          end_time: source.end_time,
        },
        schedules
      );
      return conflict
        ? { weekday, status: "conflict" as const }
        : { weekday, status: "ok" as const };
    });
  }, [source, targetDays, schedules]);

  function toggleDay(day: number) {
    setTargetDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

  const copyCount = preview.filter((p) => p.status === "ok").length;

  if (schedules.length === 0) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setTargetDays([]);
      }}
    >
      <DialogTrigger
        render={<Button type="button" variant="outline" size="sm" />}
      >
        <CopyIcon aria-hidden="true" />
        Copiar grade
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Copiar grade para outros dias</DialogTitle>
          <DialogDescription>
            Escolha uma grade já cadastrada e os dias de destino. Dias com
            conflito de horário são pulados automaticamente.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="grid gap-4">
          <input type="hidden" name="source_id" value={sourceId} />
          <div className="grid gap-1.5">
            <Label htmlFor="copy_source">Grade de origem</Label>
            <FormSelect
              id="copy_source"
              name="source_id_display"
              defaultValue={sourceId}
              onValueChange={setSourceId}
              options={schedules.map((s) => ({
                value: s.id,
                label: `${UNIT_LABELS[s.unit]} · ${WEEKDAYS[s.weekday]} · ${s.start_time.slice(0, 5)}–${s.end_time.slice(0, 5)}`,
              }))}
            />
          </div>

          <fieldset className="grid gap-1.5">
            <legend>
              <Label>Dias de destino</Label>
            </legend>
            <div className="flex flex-wrap gap-3">
              {WEEKDAYS.map((label, day) => (
                <label
                  key={day}
                  className="flex items-center gap-1.5 text-sm text-foreground"
                >
                  <input
                    type="checkbox"
                    name="target_weekday"
                    value={day}
                    checked={targetDays.includes(day)}
                    onChange={() => toggleDay(day)}
                    disabled={source?.weekday === day}
                    className="size-4 rounded border-input accent-primary disabled:opacity-40"
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>

          {preview.length > 0 && (
            <ul className="grid gap-1 rounded-lg border border-border bg-muted/40 p-3 text-xs">
              {preview.map((p) => (
                <li
                  key={p.weekday}
                  className={
                    p.status === "conflict"
                      ? "text-destructive"
                      : p.status === "same"
                        ? "text-muted-foreground"
                        : "text-status-ok-foreground"
                  }
                >
                  {WEEKDAYS[p.weekday]}:{" "}
                  {p.status === "same"
                    ? "é o próprio dia de origem — não entra na cópia."
                    : p.status === "conflict"
                      ? "conflita com uma grade existente — será pulado."
                      : "será copiado."}
                </li>
              ))}
            </ul>
          )}

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancelar
            </DialogClose>
            <SubmitButton pendingLabel="Copiando…" disabled={copyCount === 0}>
              Confirmar cópia{copyCount > 0 ? ` (${copyCount})` : ""}
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
