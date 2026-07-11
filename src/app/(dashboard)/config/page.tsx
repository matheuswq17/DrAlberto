import { createClient } from "@/lib/supabase/server";
import { ActionForm } from "@/components/action-form";
import { EmptyState } from "@/components/empty-state";
import { FormSelect } from "@/components/form-select";
import { InfoTip } from "@/components/info-tip";
import { PageHeader } from "@/components/page-header";
import { ALL_UNITS, UNIT_LABELS, type UnitId } from "@/lib/units";
import { addScheduleRow, deleteScheduleRow, saveSettings } from "./actions";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CalendarOffIcon } from "lucide-react";

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

  const period = settings.report_period === "mensal" ? "mensal" : "semanal";

  return (
    <div className="grid gap-6 animate-in fade-in duration-200">
      <PageHeader
        eyebrow="Configurações"
        title="Configurações"
        description="Grade de atendimento, resumos por WhatsApp e lembretes automáticos."
      />

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
                <TableHead>Duração (min)</TableHead>
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
                  <TableCell colSpan={6}>
                    <EmptyState icon={CalendarOffIcon}>
                      Nenhuma grade cadastrada ainda.
                    </EmptyState>
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
            <Button type="submit">Adicionar</Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">
              {period === "mensal"
                ? "Resumo mensal por WhatsApp"
                : "Resumo semanal por WhatsApp"}
              <InfoTip>
                O resumo sai só no horário programado (segunda-feira de manhã,
                ou dia 1º no mensal) — nada é enviado na hora em que as coisas
                acontecem. Enquanto o sistema está em modo de teste, toda
                mensagem vai para o número de teste, não para o número
                cadastrado aqui.
              </InfoTip>
            </CardTitle>
            <CardDescription>
              {period === "mensal"
                ? "Você recebe um resumo do mês todo dia 1º de manhã."
                : "Você recebe um resumo da semana toda segunda-feira de manhã."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ActionForm
              action={saveSettings}
              successMessage="Configuração salva ✓"
              // inputs são uncontrolled: a key remonta o form quando os
              // valores salvos mudam, em vez de trocar defaultValue de um
              // campo vivo
              key={`${settings.report_phone ?? ""}|${settings.report_period ?? ""}`}
              className="grid grid-cols-1 gap-4 sm:grid-cols-2"
            >
              <div className="grid gap-1.5">
                <Label htmlFor="report_phone">
                  WhatsApp que recebe o resumo
                </Label>
                <Input
                  id="report_phone"
                  name="report_phone"
                  placeholder="62999990000"
                  defaultValue={settings.report_phone ?? ""}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="report_period">Frequência</Label>
                <FormSelect
                  id="report_period"
                  name="report_period"
                  defaultValue={settings.report_period ?? "semanal"}
                  options={[
                    { value: "semanal", label: "Toda semana" },
                    { value: "mensal", label: "Todo mês" },
                  ]}
                />
              </div>
              <div className="sm:col-span-2">
                <SubmitButton pendingLabel="Salvando…">Salvar</SubmitButton>
              </div>
            </ActionForm>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lembrete automático de retorno</CardTitle>
            <CardDescription>
              O paciente é avisado automaticamente quando está perto da data
              de retorno.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ActionForm
              action={saveSettings}
              successMessage="Configuração salva ✓"
              key={`fu-${settings.followup_lead_days ?? ""}`}
              className="grid grid-cols-1 gap-4 sm:grid-cols-2"
            >
              <div className="grid gap-1.5">
                <Label htmlFor="followup_lead_days">
                  Avisar com quantos dias de antecedência
                </Label>
                <Input
                  id="followup_lead_days"
                  name="followup_lead_days"
                  type="number"
                  min={0}
                  defaultValue={settings.followup_lead_days ?? "3"}
                />
              </div>
              <div className="sm:col-span-2">
                <SubmitButton pendingLabel="Salvando…">Salvar</SubmitButton>
              </div>
            </ActionForm>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">
              Resumo do dia por WhatsApp
              <InfoTip>
                Enviado todo dia às 7h da manhã, só quando estiver ativado,
                para o mesmo WhatsApp do resumo acima. Em modo de teste, vai
                para o número de teste.
              </InfoTip>
            </CardTitle>
            <CardDescription>
              Toda manhã, o essencial do dia: consultas, urgências pendentes e
              encaixes em aberto.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ActionForm
              action={saveSettings}
              successMessage="Configuração salva ✓"
              key={`ds-${settings.daily_summary_enabled ?? ""}`}
              className="grid grid-cols-1 gap-4 sm:grid-cols-2"
            >
              <div className="grid gap-1.5">
                <Label htmlFor="daily_summary_enabled">Resumo do dia</Label>
                <FormSelect
                  id="daily_summary_enabled"
                  name="daily_summary_enabled"
                  defaultValue={settings.daily_summary_enabled ?? "false"}
                  options={[
                    { value: "false", label: "Desativado" },
                    { value: "true", label: "Ativado" },
                  ]}
                />
              </div>
              <div className="sm:col-span-2">
                <SubmitButton pendingLabel="Salvando…">Salvar</SubmitButton>
              </div>
            </ActionForm>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
