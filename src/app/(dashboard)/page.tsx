import { redirect } from "next/navigation";
import Link from "next/link";
import {
  BellIcon,
  Building2Icon,
  CalendarClockIcon,
  CalendarIcon,
  CalendarX2Icon,
  CheckIcon,
  ClockIcon,
  PuzzleIcon,
  TriangleAlertIcon,
  type LucideIcon,
} from "lucide-react";
import { buildGreeting } from "@/lib/greeting";
import { cn } from "@/lib/utils";
import { getTodayAgenda } from "@/lib/today";
import { getNextSlots } from "@/lib/next-slots";
import { getOpenUrgencyCount } from "@/lib/urgency-count";
import { getRadarData } from "@/lib/reschedule";
import { spDayKey } from "@/lib/agenda";
import { followUpLight } from "@/lib/followup-light";
import { UNIT_COLOR, UNIT_SHORT_LABELS, NO_UNIT_COLOR } from "@/lib/units";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/supabase/session";
import { perfTime } from "@/lib/perf";
import { EmptyState } from "@/components/empty-state";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { SourceWarnings } from "@/components/source-status";
import { StatusBadge } from "@/components/status-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

const TZ = "America/Sao_Paulo";
const VALID_VIEWS = new Set(["dia", "semana", "mes"]);

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  }).format(new Date(iso));
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; d?: string }>;
}) {
  // Bookmarks antigos da Agenda (que morava em "/") continuam funcionando.
  const params = await searchParams;
  if (params.view && VALID_VIEWS.has(params.view)) {
    const qs = new URLSearchParams();
    qs.set("view", params.view);
    if (params.d) qs.set("d", params.d);
    redirect(`/agenda?${qs.toString()}`);
  }

  const supabase = await createClient();
  const { profile } = await perfTime("session-validation", getSessionProfile());

  const now = new Date();
  const hourNow = Number(
    new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", hourCycle: "h23", timeZone: TZ }).format(
      now
    )
  );
  const dateLabel = capitalize(
    new Intl.DateTimeFormat("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      timeZone: TZ,
    }).format(now)
  );
  // Nome ausente (sem perfil cadastrado) cai no fallback "Bom dia" sem nome —
  // não usamos o e-mail aqui, que não é um nome de exibição.
  const greeting = buildGreeting(hourNow, profile?.name ?? null, profile?.role ?? null);

  const [agenda, nextSlots, urgencyCount, radar] = await Promise.all([
    perfTime("agenda-calculation", getTodayAgenda()),
    perfTime("horarios-livres", getNextSlots(supabase)),
    perfTime("sinalizacoes-count", getOpenUrgencyCount()),
    perfTime("encaixes-radar", getRadarData(supabase)),
  ]);

  const todayKey = spDayKey(now);
  const { data: followUps } = await perfTime(
    "retornos-query",
    supabase.from("follow_ups").select("due_date, status")
  );
  const activeFollowUps = (followUps ?? []).filter(
    (f) => !["concluido", "cancelado"].includes(f.status)
  );
  const overdueFollowUps = activeFollowUps.filter(
    (f) => followUpLight(f.due_date, todayKey) === "vermelho"
  ).length;

  const allEntries = agenda.byUnit
    .flatMap((g) => g.entries)
    .sort((a, b) => a.event.start.localeCompare(b.event.start));
  const totalToday = allEntries.length;

  const soonestSlot = nextSlots.units
    .filter((u) => u.next)
    .sort((a, b) => a.next!.start.getTime() - b.next!.start.getTime())[0];

  // Central de pendências v1 — só o que o painel já calcula com dados
  // reais (sinalizações do bot, retornos atrasados). Alertas de fonte/config
  // (ex.: grade ausente) já aparecem no banner de SourceWarnings acima, então
  // não entram aqui de novo para não duplicar o mesmo aviso na página.
  interface PendingItem {
    icon: LucideIcon;
    tone: "urgent" | "warning";
    text: string;
    href: string;
  }
  const pendingItems: PendingItem[] = [];
  if (urgencyCount > 0) {
    pendingItems.push({
      icon: TriangleAlertIcon,
      tone: "urgent",
      text: `${urgencyCount} sinalizaç${urgencyCount > 1 ? "ões" : "ão"} do bot aguardando revisão`,
      href: "/urgencias",
    });
  }
  if (overdueFollowUps > 0) {
    pendingItems.push({
      icon: CalendarClockIcon,
      tone: "warning",
      text: `${overdueFollowUps} retorno${overdueFollowUps > 1 ? "s" : ""} atrasado${overdueFollowUps > 1 ? "s" : ""}`,
      href: "/retornos?filter=atrasados",
    });
  }
  // urgente primeiro — ordena por prioridade real, não por ordem de cálculo.
  pendingItems.sort((a, b) => (a.tone === b.tone ? 0 : a.tone === "urgent" ? -1 : 1));

  const warnings = [...agenda.warnings, ...nextSlots.warnings];

  return (
    <div className="grid gap-6 animate-in fade-in duration-200">
      <PageHeader
        eyebrow="Visão geral"
        title={greeting}
        description={dateLabel}
        actions={
          <Link
            href="/urgencias"
            className="relative flex size-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:text-foreground"
            aria-label={
              urgencyCount > 0
                ? `${urgencyCount} sinalizaç${urgencyCount > 1 ? "ões" : "ão"} do bot aguardando revisão — abrir Sinalizações do bot`
                : "Nenhuma sinalização do bot pendente — abrir Sinalizações do bot"
            }
          >
            <BellIcon className="size-4" aria-hidden="true" />
            {urgencyCount > 0 && (
              <span
                className="absolute top-1.5 right-1.5 size-2 rounded-full bg-status-urgent"
                aria-hidden="true"
              />
            )}
          </Link>
        }
      />

      <SourceWarnings warnings={warnings} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={CalendarIcon}
          label="Consultas hoje"
          value={totalToday}
          caption={
            agenda.byUnit.length > 0
              ? `${agenda.byUnit.length} unidade${agenda.byUnit.length > 1 ? "s" : ""}`
              : undefined
          }
          href="/agenda?view=dia"
        />
        <MetricCard
          icon={ClockIcon}
          label="Próximo horário livre"
          value={soonestSlot ? formatTime(soonestSlot.next!.start.toISOString()) : "—"}
          caption={soonestSlot ? soonestSlot.label : "sem grade cadastrada"}
          href="/agenda"
        />
        <MetricCard
          icon={TriangleAlertIcon}
          label="Sinalizações abertas"
          value={urgencyCount}
          caption={urgencyCount > 0 ? "Requer atenção" : "Nenhuma pendente"}
          tone={urgencyCount > 0 ? "urgent" : "default"}
          href="/urgencias"
        />
        <MetricCard
          icon={PuzzleIcon}
          label="Encaixes abertos"
          value={radar.openSlots.length}
          caption={`${radar.waiting.length} na fila de espera`}
          href="/encaixes"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Agenda de hoje</CardTitle>
            <CardDescription>
              <Link href="/agenda" className="text-primary hover:underline">
                Ver agenda completa →
              </Link>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {totalToday === 0 ? (
              <EmptyState icon={CalendarX2Icon}>
                Nenhuma consulta na agenda de hoje.
              </EmptyState>
            ) : (
              <ol className="relative grid gap-4 border-l border-border pl-4">
                {allEntries.map(({ event, lead }) => {
                  const color = event.unit ? UNIT_COLOR[event.unit] : NO_UNIT_COLOR;
                  return (
                    <li key={event.id} className="relative">
                      <span
                        className={`absolute top-1 -left-[21px] size-2.5 rounded-full ${color.dot}`}
                        aria-hidden="true"
                      />
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="text-sm font-semibold tabular-nums">
                          {formatTime(event.start)}
                        </p>
                        {lead?.urgencia && (
                          <StatusBadge semantic="urgent">sinalização</StatusBadge>
                        )}
                      </div>
                      <p className="text-sm font-medium text-foreground">
                        {event.patientLabel || "(sem título)"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {event.unit ? UNIT_SHORT_LABELS[event.unit] : "Sem unidade"}
                      </p>
                    </li>
                  );
                })}
              </ol>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Próximos horários livres</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              {nextSlots.units.map(({ unit, label, next }) => (
                <div
                  key={unit}
                  className="flex items-center gap-3 rounded-lg border border-border px-3 py-2"
                >
                  <span
                    className="flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-primary"
                    aria-hidden="true"
                  >
                    <Building2Icon className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground">
                      {next ? formatTime(next.start.toISOString()) : "sem horário calculado"}
                    </p>
                  </div>
                </div>
              ))}
              <Link
                href="/agenda"
                className="mt-1 text-xs font-medium text-primary hover:underline"
              >
                Abrir agenda →
              </Link>
            </CardContent>
          </Card>

          <Card
            className={
              pendingItems.length > 0
                ? "border-status-warning/40 bg-status-warning/5"
                : undefined
            }
          >
            <CardHeader>
              <CardTitle>Central de pendências</CardTitle>
              {pendingItems.length > 0 && (
                <CardDescription>
                  O que já foi identificado e ainda precisa de revisão.
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="grid gap-1">
              {pendingItems.length === 0 ? (
                <p className="flex items-center gap-2 text-sm text-status-ok-foreground">
                  <CheckIcon className="size-4 shrink-0" aria-hidden="true" />
                  Tudo em dia — nenhuma pendência agora.
                </p>
              ) : (
                pendingItems.map((item) => {
                  const ItemIcon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-1 py-1.5 text-sm font-medium transition-colors hover:bg-card/60",
                        item.tone === "urgent"
                          ? "text-status-urgent-foreground"
                          : "text-status-warning-foreground"
                      )}
                    >
                      <ItemIcon className="size-4 shrink-0" aria-hidden="true" />
                      <span className="flex-1">{item.text}</span>
                      <span aria-hidden="true">→</span>
                    </Link>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
