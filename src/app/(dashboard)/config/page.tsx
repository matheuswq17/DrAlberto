import { createClient } from "@/lib/supabase/server";
import { FormSelect } from "@/components/form-select";
import { ALL_UNITS, UNIT_LABELS, type UnitId } from "@/lib/units";
import { addScheduleRow, deleteScheduleRow, saveSettings } from "./actions";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const WEEKDAYS = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

interface ScheduleRowDb {
  id: string;
  unit: UnitId;
  weekday: number;
  start_time: string;
  end_time: string;
  slot_minutes: number;
}

export default async function ConfigPage() {
  const supabase = await createClient();

  const [{ data: schedules }, { data: settingsRows }] = await Promise.all([
    supabase
      .from("unit_schedules")
      .select("id, unit, weekday, start_time, end_time, slot_minutes")
      .order("unit")
      .order("weekday")
      .order("start_time"),
    supabase.from("app_settings").select("key, value"),
  ]);

  const settings = Object.fromEntries(
    (settingsRows ?? []).map((r) => [r.key, r.value])
  );

  return (
    <div className="grid gap-6">
      <h1 className="text-xl font-semibold">Configurações</h1>

      <Card>
        <CardHeader>
          <CardTitle>Grade de atendimento por unidade</CardTitle>
          <CardDescription>
            Usada para calcular o &quot;próximo horário disponível&quot; — os
            eventos do Google Calendar são descontados desta grade.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Unidade</TableHead>
                <TableHead>Dia</TableHead>
                <TableHead>Início</TableHead>
                <TableHead>Fim</TableHead>
                <TableHead>Slot (min)</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {((schedules ?? []) as ScheduleRowDb[]).map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{UNIT_LABELS[row.unit]}</TableCell>
                  <TableCell>{WEEKDAYS[row.weekday]}</TableCell>
                  <TableCell>{row.start_time.slice(0, 5)}</TableCell>
                  <TableCell>{row.end_time.slice(0, 5)}</TableCell>
                  <TableCell>{row.slot_minutes}</TableCell>
                  <TableCell>
                    <form action={deleteScheduleRow}>
                      <input type="hidden" name="id" value={row.id} />
                      <Button variant="ghost" size="sm" type="submit">
                        Remover
                      </Button>
                    </form>
                  </TableCell>
                </TableRow>
              ))}
              {(schedules ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground">
                    Nenhuma grade cadastrada ainda.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <form
            action={addScheduleRow}
            className="grid grid-cols-2 items-end gap-3 sm:grid-cols-6"
          >
            <div className="grid gap-1.5">
              <Label htmlFor="unit">Unidade</Label>
              <FormSelect
                id="unit"
                name="unit"
                options={ALL_UNITS.map((u) => ({
                  value: u,
                  label: UNIT_LABELS[u],
                }))}
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
              <Label htmlFor="slot_minutes">Slot (min)</Label>
              <Input
                id="slot_minutes"
                name="slot_minutes"
                type="number"
                min={10}
                step={5}
                defaultValue={30}
              />
            </div>
            <Button type="submit">Adicionar</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Relatório periódico e lembretes</CardTitle>
          <CardDescription>
            O relatório é enviado por agendamento (nunca por evento). Em safe
            mode, todo WhatsApp vai para o número de teste.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={saveSettings}
            // inputs são uncontrolled: a key remonta o form quando os valores
            // salvos mudam, em vez de trocar defaultValue de um campo vivo
            key={`${settings.report_phone ?? ""}|${settings.report_period ?? ""}|${settings.followup_lead_days ?? ""}`}
            className="grid max-w-xl grid-cols-1 gap-4 sm:grid-cols-3"
          >
            <div className="grid gap-1.5">
              <Label htmlFor="report_phone">WhatsApp do relatório</Label>
              <Input
                id="report_phone"
                name="report_phone"
                placeholder="62999990000"
                defaultValue={settings.report_phone ?? ""}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="report_period">Periodicidade</Label>
              <FormSelect
                id="report_period"
                name="report_period"
                defaultValue={settings.report_period ?? "semanal"}
                options={[
                  { value: "semanal", label: "Semanal" },
                  { value: "mensal", label: "Mensal" },
                ]}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="followup_lead_days">
                Antecedência lembrete (dias)
              </Label>
              <Input
                id="followup_lead_days"
                name="followup_lead_days"
                type="number"
                min={0}
                defaultValue={settings.followup_lead_days ?? "3"}
              />
            </div>
            <div className="sm:col-span-3">
              <Button type="submit">Salvar</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
