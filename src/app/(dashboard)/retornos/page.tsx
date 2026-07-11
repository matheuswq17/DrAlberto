import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { spDayKey } from "@/lib/agenda";
import {
  FOLLOW_UP_LIGHT_META,
  followUpLight,
} from "@/lib/followup-light";
import { addFollowUp, setFollowUpStatus } from "./actions";
import { ActionForm } from "@/components/action-form";
import { EmptyState } from "@/components/empty-state";
import { PhoneReveal } from "@/components/phone-reveal";
import { StatusBadge, type StatusSemantic } from "@/components/status-badge";
import { SubmitButton } from "@/components/submit-button";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { InboxIcon } from "lucide-react";

export const dynamic = "force-dynamic";

const STATUS_META: Record<string, { label: string; semantic: StatusSemantic }> = {
  pendente: { label: "Pendente", semantic: "routine" },
  lembrete_enviado: { label: "Lembrete enviado", semantic: "warning" },
  agendado: { label: "Agendado", semantic: "ok" },
  concluido: { label: "Concluído", semantic: "ok" },
  cancelado: { label: "Cancelado", semantic: "routine" },
};

function fmtDate(d: string | null): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(`${d}T12:00:00`));
}

export default async function RetornosPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const params = await searchParams;
  // Filtro vindo da Central de pendências (Visão geral) — parâmetro
  // desconhecido/ausente cai no fallback seguro de mostrar tudo.
  const filterAtrasados = params.filter === "atrasados";
  const todayKey = spDayKey(new Date());

  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("follow_ups")
    .select(
      "id, patient_name, phone, procedure, procedure_date, due_date, status, reminder_sent_at, notes"
    )
    .order("due_date", { ascending: true });

  const active = (rows ?? []).filter(
    (r) => !["concluido", "cancelado"].includes(r.status)
  );
  const done = (rows ?? []).filter((r) =>
    ["concluido", "cancelado"].includes(r.status)
  );
  const visibleActive = filterAtrasados
    ? active.filter((r) => followUpLight(r.due_date, todayKey) === "vermelho")
    : active;

  return (
    <div className="grid gap-6 animate-in fade-in duration-200">
      <PageHeader
        eyebrow="Retornos"
        title="Fila de retorno"
        description="Pacientes de biópsia/drenagem/procedimento que precisam voltar. O lembrete por WhatsApp sai automaticamente quando a data se aproxima (job diário do worker)."
      />

      <Card>
        <CardHeader>
          <CardTitle>Adicionar retorno</CardTitle>
        </CardHeader>
        <CardContent>
          <ActionForm
            action={addFollowUp}
            successMessage="Paciente adicionado à fila de retorno ✓"
            className="grid grid-cols-2 items-end gap-3 lg:grid-cols-6"
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
              <Label htmlFor="procedure">Procedimento</Label>
              <Input
                id="procedure"
                name="procedure"
                placeholder="biópsia"
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="procedure_date">Data do procedimento</Label>
              <Input
                id="procedure_date"
                name="procedure_date"
                type="date"
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="due_date">Retorno previsto</Label>
              <Input id="due_date" name="due_date" type="date" required />
            </div>
            <SubmitButton pendingLabel="Adicionando…">Adicionar</SubmitButton>
            <div className="col-span-2 grid gap-1.5 lg:col-span-6">
              <Label htmlFor="notes">Observações (opcional)</Label>
              <Input id="notes" name="notes" />
            </div>
          </ActionForm>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Em acompanhamento (
            {filterAtrasados
              ? `${visibleActive.length} de ${active.length}`
              : active.length}
            )
          </CardTitle>
          {filterAtrasados && (
            <CardDescription className="flex items-center gap-2">
              Mostrando só retornos atrasados.
              <Link href="/retornos" className="font-medium text-primary hover:underline">
                Ver todos →
              </Link>
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <FollowUpTable
            rows={visibleActive}
            todayKey={todayKey}
            emptyMessage={
              filterAtrasados
                ? "Nenhum retorno atrasado agora."
                : undefined
            }
          />
        </CardContent>
      </Card>

      {done.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Encerrados ({done.length})</CardTitle>
            <CardDescription>Concluídos e cancelados.</CardDescription>
          </CardHeader>
          <CardContent>
            <FollowUpTable rows={done} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface Row {
  id: string;
  patient_name: string;
  phone: string;
  procedure: string;
  procedure_date: string;
  due_date: string;
  status: string;
  reminder_sent_at: string | null;
  notes: string | null;
}

function FollowUpTable({
  rows,
  todayKey,
  emptyMessage,
}: {
  rows: Row[];
  /** quando presente, mostra o semáforo de proximidade do retorno */
  todayKey?: string;
  emptyMessage?: string;
}) {
  if (rows.length === 0) {
    return (
      <EmptyState icon={InboxIcon}>
        {emptyMessage ??
          "Nenhum retorno aqui. Adicione pelo formulário acima quando um paciente precisar voltar."}
      </EmptyState>
    );
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Paciente</TableHead>
          <TableHead>Procedimento</TableHead>
          <TableHead>Feito em</TableHead>
          <TableHead>Retorno</TableHead>
          <TableHead>Status</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.id}>
            <TableCell>
              <span className="flex items-center gap-2 font-medium">
                {todayKey && (
                  <span
                    className={`size-2.5 shrink-0 rounded-full ${FOLLOW_UP_LIGHT_META[followUpLight(r.due_date, todayKey)].dotClass}`}
                    title={
                      FOLLOW_UP_LIGHT_META[followUpLight(r.due_date, todayKey)]
                        .label
                    }
                    aria-label={
                      FOLLOW_UP_LIGHT_META[followUpLight(r.due_date, todayKey)]
                        .label
                    }
                    role="img"
                  />
                )}
                {r.patient_name}
              </span>
              <span className="block text-xs text-muted-foreground">
                <PhoneReveal phone={r.phone} />
                {r.notes ? ` · ${r.notes}` : ""}
              </span>
            </TableCell>
            <TableCell>{r.procedure}</TableCell>
            <TableCell>{fmtDate(r.procedure_date)}</TableCell>
            <TableCell>{fmtDate(r.due_date)}</TableCell>
            <TableCell>
              <StatusBadge semantic={STATUS_META[r.status]?.semantic ?? "routine"}>
                {STATUS_META[r.status]?.label ?? r.status}
              </StatusBadge>
            </TableCell>
            <TableCell>
              <div className="flex justify-end gap-1">
                {["pendente", "lembrete_enviado"].includes(r.status) && (
                  <>
                    <StatusButton id={r.id} status="agendado" label="Agendado" />
                    <StatusButton id={r.id} status="cancelado" label="Cancelar" ghost />
                  </>
                )}
                {r.status === "agendado" && (
                  <StatusButton id={r.id} status="concluido" label="Concluído" />
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

const PENDING_LABELS: Record<string, string> = {
  agendado: "Agendando…",
  cancelado: "Cancelando…",
  concluido: "Concluindo…",
};

function StatusButton({
  id,
  status,
  label,
  ghost = false,
}: {
  id: string;
  status: string;
  label: string;
  ghost?: boolean;
}) {
  return (
    <form action={setFollowUpStatus}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <SubmitButton
        variant={ghost ? "ghost" : "outline"}
        size="sm"
        pendingLabel={PENDING_LABELS[status] ?? "Salvando…"}
      >
        {label}
      </SubmitButton>
    </form>
  );
}
