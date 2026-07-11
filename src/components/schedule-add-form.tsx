"use client";

import { useActionState, useEffect, useState } from "react";
import type { ActionState } from "@/lib/action-state";
import { findScheduleConflict, isValidTimeRange, type ScheduleRowLike } from "@/lib/schedule-conflict";
import { ALL_UNITS, UNIT_LABELS } from "@/lib/units";
import { toastManager } from "@/components/ui/toast";
import { FormSelect } from "@/components/form-select";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const WEEKDAYS = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

/**
 * Formulário de "Adicionar" grade com validação de conflito no cliente
 * (feedback imediato) e no servidor (a action revalida do zero — nunca
 * confia só na checagem do navegador).
 */
export function ScheduleAddForm({
  action,
  existingSchedules,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  existingSchedules: ScheduleRowLike[];
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    action,
    null
  );
  const [clientError, setClientError] = useState<string | null>(null);

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toastManager.add({
        title: state.message ?? "Grade adicionada ✓",
        type: "success",
        timeout: 3000,
      });
      setClientError(null);
    } else {
      toastManager.add({ title: state.error, type: "error", timeout: 3000 });
    }
  }, [state]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);
    const unit = String(formData.get("unit"));
    const weekday = Number(formData.get("weekday"));
    const start_time = String(formData.get("start_time"));
    const end_time = String(formData.get("end_time"));

    if (!start_time || !end_time || !isValidTimeRange(start_time, end_time)) {
      event.preventDefault();
      setClientError("O horário de início precisa ser antes do fim.");
      return;
    }
    const conflict = findScheduleConflict(
      { unit, weekday, start_time, end_time },
      existingSchedules
    );
    if (conflict) {
      event.preventDefault();
      setClientError(
        `Já existe grade nesse horário: ${WEEKDAYS[conflict.weekday]}, ${conflict.start_time.slice(0, 5)}–${conflict.end_time.slice(0, 5)}.`
      );
      return;
    }
    setClientError(null);
  }

  return (
    <form
      action={formAction}
      onSubmit={handleSubmit}
      className="grid grid-cols-2 items-end gap-3 sm:grid-cols-6"
    >
      <div className="grid gap-1.5">
        <Label htmlFor="unit">Unidade</Label>
        <FormSelect
          id="unit"
          name="unit"
          options={ALL_UNITS.map((u) => ({ value: u, label: UNIT_LABELS[u] }))}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="weekday">Dia</Label>
        <FormSelect
          id="weekday"
          name="weekday"
          defaultValue="1"
          options={WEEKDAYS.map((d, i) => ({ value: String(i), label: d }))}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="start_time">Início</Label>
        <Input id="start_time" name="start_time" type="time" required />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="end_time">Fim</Label>
        <Input id="end_time" name="end_time" type="time" required />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="slot_minutes">Duração da consulta (min)</Label>
        <Input
          id="slot_minutes"
          name="slot_minutes"
          type="number"
          min={10}
          step={5}
          defaultValue={30}
        />
        <p className="text-xs text-muted-foreground">
          Tempo reservado para cada paciente.
        </p>
      </div>
      <SubmitButton pendingLabel="Adicionando…">Adicionar</SubmitButton>
      {clientError && (
        <p
          role="alert"
          style={{ gridColumn: "1 / -1" }}
          className="text-xs font-medium text-destructive"
        >
          {clientError}
        </p>
      )}
    </form>
  );
}
