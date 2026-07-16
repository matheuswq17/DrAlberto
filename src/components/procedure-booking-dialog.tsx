"use client";

// Modal "Marcar procedimento" — aberto ao clicar num horário vazio da grade
// da Agenda (Semana). Ao confirmar, GRAVA DE VERDADE no Google Calendar:
// única exceção à regra de somente-leitura do painel, decisão consciente
// para este fluxo pontual e manual do médico.

import { useActionState, useEffect, useState } from "react";
import type { ActionState } from "@/lib/action-state";
import type { ProcedureOption } from "@/lib/procedures";
import { ALL_UNITS, UNIT_LABELS } from "@/lib/units";
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
} from "@/components/ui/dialog";
import { FormSelect } from "@/components/form-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";

export interface BookingSlot {
  dayKey: string; // YYYY-MM-DD
  hour: number; // 0-23, hora local de São Paulo
}

export function ProcedureBookingDialog({
  slot,
  onClose,
  procedures,
  action,
}: {
  slot: BookingSlot | null;
  onClose: () => void;
  procedures: ProcedureOption[];
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(action, null);
  const [procedureId, setProcedureId] = useState(procedures[0]?.id ?? "");

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toastManager.add({
        title: state.message ?? "Procedimento marcado ✓",
        type: "success",
        timeout: 6000,
      });
      onClose();
    } else {
      toastManager.add({ title: state.error, type: "error", timeout: 5000 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  if (procedures.length === 0) return null;

  const selectedProcedure = procedures.find((p) => p.id === procedureId) ?? procedures[0];
  // América/São Paulo é UTC-3 fixo (sem horário de verão desde 2019) — mesma
  // convenção usada em src/lib/agenda.ts (spMidnight).
  const startsAt = slot
    ? new Date(`${slot.dayKey}T${String(slot.hour).padStart(2, "0")}:00:00-03:00`)
    : null;

  return (
    <Dialog open={slot !== null} onOpenChange={(open) => !open && onClose()}>
      {slot && startsAt && selectedProcedure && (
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marcar procedimento</DialogTitle>
            <DialogDescription>
              {String(slot.hour).padStart(2, "0")}h em{" "}
              {slot.dayKey.split("-").reverse().join("/")} — grava direto no
              Google Calendar.
            </DialogDescription>
          </DialogHeader>
          <form action={formAction} className="grid gap-4">
            <input type="hidden" name="starts_at" value={startsAt.toISOString()} />
            <input
              type="hidden"
              name="procedure_name"
              value={selectedProcedure.name}
            />
            <div className="grid gap-1.5">
              <Label htmlFor="procedure_id">Procedimento</Label>
              <FormSelect
                id="procedure_id"
                name="procedure_id"
                defaultValue={procedureId}
                onValueChange={setProcedureId}
                options={procedures.map((p) => ({ value: p.id, label: p.name }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="patient_name">Paciente</Label>
              <Input id="patient_name" name="patient_name" required />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="patient_phone">Telefone</Label>
              <Input
                id="patient_phone"
                name="patient_phone"
                placeholder="62999990000"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="unit">Unidade</Label>
                <FormSelect
                  id="unit"
                  name="unit"
                  options={ALL_UNITS.map((u) => ({ value: u, label: UNIT_LABELS[u] }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="duration_minutes">Duração (min)</Label>
                <Input
                  id="duration_minutes"
                  name="duration_minutes"
                  type="number"
                  min={10}
                  step={5}
                  defaultValue={30}
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="price">Valor (R$)</Label>
              <Input id="price" name="price" type="number" min={0} step="0.01" required />
            </div>
            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" />}>
                Cancelar
              </DialogClose>
              <SubmitButton pendingLabel="Marcando…">Marcar procedimento</SubmitButton>
            </DialogFooter>
          </form>
        </DialogContent>
      )}
    </Dialog>
  );
}
