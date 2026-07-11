import { createClient } from "@/lib/supabase/server";
import { getRadarData } from "@/lib/reschedule";
import { UNIT_LABELS, ALL_UNITS, type UnitId } from "@/lib/units";
import {
  addToWaitingList,
  approveSuggestion,
  ignoreSlot,
  rejectSuggestion,
  removeFromWaitingList,
} from "./actions";
import { ActionForm } from "@/components/action-form";
import { EmptyState } from "@/components/empty-state";
import { FormSelect } from "@/components/form-select";
import { StatusBadge } from "@/components/status-badge";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/page-header";
import { InboxIcon, PuzzleIcon, UsersIcon, UserXIcon } from "lucide-react";

export const dynamic = "force-dynamic";

function fmtSlot(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso));
}

function unitLabel(unit: string | null): string {
  return unit ? (UNIT_LABELS[unit as UnitId] ?? unit) : "sem unidade";
}

export default async function EncaixesPage() {
  const supabase = await createClient();
  const { openSlots, waiting, sentSuggestions } = await getRadarData(supabase);
  const queue = waiting.filter((w) => w.status === "aguardando");

  return (
    <div className="grid gap-6 animate-in fade-in duration-200">
      <PageHeader
        eyebrow="Encaixes"
        title="Encaixes"
        description="Cancelamentos detectados na agenda (checagem a cada 15 min). Aprovar envia a oferta por WhatsApp — o agendamento acontece pelo bot quando o paciente responde. O site não escreve na agenda."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PuzzleIcon className="size-4 text-primary" aria-hidden="true" />
              Vagas abertas ({openSlots.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {openSlots.length === 0 && (
              <EmptyState icon={InboxIcon}>
                Nenhuma vaga liberada no momento.
              </EmptyState>
            )}
            {openSlots.map(({ slot, candidate }) => (
              <div
                key={slot.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
              >
                <div>
                  <p className="text-sm font-medium">
                    {fmtSlot(slot.starts_at)} · {unitLabel(slot.unit)}
                    <StatusBadge semantic="routine" className="ml-2">
                      {slot.reason}
                    </StatusBadge>
                    {slot.status === "sugerida" && (
                      <StatusBadge semantic="warning" className="ml-1">
                        oferta enviada — aguardando resposta
                      </StatusBadge>
                    )}
                  </p>
                  {candidate ? (
                    <p className="text-xs text-muted-foreground">
                      Próximo da fila: <strong>{candidate.patient_name}</strong>{" "}
                      ({candidate.phone}
                      {candidate.preferred_unit
                        ? `, prefere ${unitLabel(candidate.preferred_unit)}`
                        : ""}
                      )
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Ninguém aguardando na fila para sugerir.
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  {candidate && (
                    <>
                      <form action={approveSuggestion}>
                        <input type="hidden" name="slot_id" value={slot.id} />
                        <input
                          type="hidden"
                          name="waiting_id"
                          value={candidate.id}
                        />
                        <Button size="sm" type="submit">
                          Aprovar e enviar WhatsApp
                        </Button>
                      </form>
                      <form action={rejectSuggestion}>
                        <input type="hidden" name="slot_id" value={slot.id} />
                        <input
                          type="hidden"
                          name="waiting_id"
                          value={candidate.id}
                        />
                        <Button variant="outline" size="sm" type="submit">
                          Pular paciente
                        </Button>
                      </form>
                    </>
                  )}
                  <form action={ignoreSlot}>
                    <input type="hidden" name="slot_id" value={slot.id} />
                    <Button variant="ghost" size="sm" type="submit">
                      Ignorar vaga
                    </Button>
                  </form>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UsersIcon className="size-4 text-primary" aria-hidden="true" />
              Fila de espera ({queue.length})
            </CardTitle>
            <CardDescription>
              Pacientes esperando um encaixe. Ordem de chegada; preferência de
              unidade é priorizada quando a vaga bate.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <ActionForm
              action={addToWaitingList}
              successMessage="Paciente adicionado à fila ✓"
              className="grid grid-cols-2 items-end gap-3"
            >
              <div className="grid gap-1.5">
                <Label htmlFor="patient_name">Paciente</Label>
                <Input id="patient_name" name="patient_name" required />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="phone">WhatsApp</Label>
                <Input
                  id="phone"
                  name="phone"
                  placeholder="62999990000"
                  required
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="preferred_unit">Unidade preferida</Label>
                <FormSelect
                  id="preferred_unit"
                  name="preferred_unit"
                  options={[
                    { value: "", label: "Qualquer" },
                    ...ALL_UNITS.map((u) => ({
                      value: u,
                      label: UNIT_LABELS[u],
                    })),
                  ]}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="notes">Observações</Label>
                <Input id="notes" name="notes" />
              </div>
              <SubmitButton pendingLabel="Adicionando…" className="col-span-2">
                Adicionar
              </SubmitButton>
            </ActionForm>

            {waiting.length === 0 ? (
              <EmptyState icon={UserXIcon}>Fila vazia.</EmptyState>
            ) : (
              <div className="grid gap-2">
                {waiting.map((w) => (
                  <div
                    key={w.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {w.patient_name}
                        <StatusBadge
                          className="ml-2"
                          semantic={
                            w.status === "aguardando"
                              ? "routine"
                              : w.status === "contactado"
                                ? "warning"
                                : w.status === "agendado"
                                  ? "ok"
                                  : "routine"
                          }
                        >
                          {w.status}
                        </StatusBadge>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {w.phone}
                        {w.preferred_unit
                          ? ` · prefere ${unitLabel(w.preferred_unit)}`
                          : ""}
                        {w.notes ? ` · ${w.notes}` : ""}
                      </p>
                    </div>
                    {w.status !== "removido" && (
                      <form action={removeFromWaitingList}>
                        <input type="hidden" name="id" value={w.id} />
                        <Button variant="ghost" size="sm" type="submit">
                          Remover
                        </Button>
                      </form>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {sentSuggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Ofertas enviadas</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {sentSuggestions.map((s) => (
              <p key={s.id} className="text-sm text-muted-foreground">
                {s.patient?.patient_name ?? "?"} ←{" "}
                {s.slot ? fmtSlot(s.slot.starts_at) : "vaga"} ·{" "}
                {s.sent_at
                  ? new Intl.DateTimeFormat("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: "America/Sao_Paulo",
                    }).format(new Date(s.created_at))
                  : ""}
              </p>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
