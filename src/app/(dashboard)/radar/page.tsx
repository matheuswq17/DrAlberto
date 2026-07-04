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
import { Badge } from "@/components/ui/badge";
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

export default async function RadarPage() {
  const supabase = await createClient();
  const { openSlots, waiting, sentSuggestions } = await getRadarData(supabase);
  const queue = waiting.filter((w) => w.status === "aguardando");

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-xl font-semibold">Radar de vagas</h1>
        <p className="text-sm text-muted-foreground">
          Cancelamentos detectados na agenda (checagem a cada 15 min). Aprovar
          envia a oferta por WhatsApp — o agendamento acontece pelo bot quando
          o paciente responde. O site não escreve na agenda.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vagas abertas ({openSlots.length})</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {openSlots.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhuma vaga liberada no momento.
            </p>
          )}
          {openSlots.map(({ slot, candidate }) => (
            <div
              key={slot.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
            >
              <div>
                <p className="text-sm font-medium">
                  {fmtSlot(slot.starts_at)} · {unitLabel(slot.unit)}
                  <Badge className="ml-2" variant="secondary">
                    {slot.reason}
                  </Badge>
                  {slot.status === "sugerida" && (
                    <Badge className="ml-1" variant="outline">
                      oferta enviada
                    </Badge>
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
                      <input type="hidden" name="waiting_id" value={candidate.id} />
                      <Button size="sm" type="submit">
                        Aprovar e enviar WhatsApp
                      </Button>
                    </form>
                    <form action={rejectSuggestion}>
                      <input type="hidden" name="slot_id" value={slot.id} />
                      <input type="hidden" name="waiting_id" value={candidate.id} />
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
          <CardTitle>Fila de espera ({queue.length})</CardTitle>
          <CardDescription>
            Pacientes esperando um encaixe. Ordem de chegada; preferência de
            unidade é priorizada quando a vaga bate.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <form
            action={addToWaitingList}
            className="grid grid-cols-2 items-end gap-3 lg:grid-cols-5"
          >
            <div className="grid gap-1.5">
              <Label htmlFor="patient_name">Paciente</Label>
              <Input id="patient_name" name="patient_name" required />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="phone">WhatsApp</Label>
              <Input id="phone" name="phone" placeholder="62999990000" required />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="preferred_unit">Unidade preferida</Label>
              <select
                id="preferred_unit"
                name="preferred_unit"
                className="h-9 rounded-md border bg-transparent px-2 text-sm"
              >
                <option value="">Qualquer</option>
                {ALL_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {UNIT_LABELS[u]}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="notes">Observações</Label>
              <Input id="notes" name="notes" />
            </div>
            <Button type="submit">Adicionar</Button>
          </form>

          {waiting.length === 0 ? (
            <p className="text-sm text-muted-foreground">Fila vazia.</p>
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
                      <Badge
                        className="ml-2"
                        variant={w.status === "aguardando" ? "secondary" : "outline"}
                      >
                        {w.status}
                      </Badge>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {w.phone}
                      {w.preferred_unit ? ` · prefere ${unitLabel(w.preferred_unit)}` : ""}
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
