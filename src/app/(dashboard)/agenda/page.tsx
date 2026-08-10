import Link from "next/link";
import {
  addDays,
  getRangeAgenda,
  hourRangeOf,
  monthGridOf,
  spDayKey,
  spMidnight,
  weekDaysOf,
} from "@/lib/agenda";
import { createClient } from "@/lib/supabase/server";
import {
  getActiveProcedureBookingsByEventId,
  getActiveProcedures,
  getPendingPaymentEventIds,
} from "@/lib/procedures";
import { getTodayAgenda } from "@/lib/today";
import { cn } from "@/lib/utils";
import { bookProcedure, cancelProcedure, rescheduleProcedure } from "./actions";
import { AgendaLegend } from "@/components/agenda-legend";
import { AgendaMonth } from "@/components/agenda-month";
import { AgendaWeek, type WeekDayCol } from "@/components/agenda-week";
import { EmptyState } from "@/components/empty-state";
import { NextSlotsCard } from "@/components/next-slots-card";
import { PageHeader } from "@/components/page-header";
import { LeadFacts } from "@/components/patient-info";
import { ReadOkStamp, SourceWarnings } from "@/components/source-status";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CalendarX2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react";

export const dynamic = "force-dynamic";

type View = "dia" | "semana" | "mes";

const TZ = "America/Sao_Paulo";

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  }).format(new Date(iso));
}

function fmtDay(key: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("pt-BR", { ...options, timeZone: TZ }).format(
    spMidnight(key)
  );
}

function ViewSwitch({ view, anchor }: { view: View; anchor: string }) {
  const options: Array<{ value: View; label: string; href: string }> = [
    { value: "dia", label: "Dia", href: "/agenda" },
    { value: "semana", label: "Semana", href: `/agenda?view=semana&d=${anchor}` },
    { value: "mes", label: "Mês", href: `/agenda?view=mes&d=${anchor}` },
  ];
  return (
    <div className="inline-flex w-fit items-center rounded-lg bg-muted p-[3px]">
      {options.map((opt) => (
        <Link
          key={opt.value}
          href={opt.href}
          aria-current={view === opt.value ? "page" : undefined}
          className={cn(
            "rounded-md px-3 py-1 text-sm transition-colors",
            view === opt.value
              ? "bg-card font-medium text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {opt.label}
        </Link>
      ))}
    </div>
  );
}

function PeriodNav({
  label,
  prevHref,
  nextHref,
}: {
  label: string;
  prevHref: string;
  nextHref: string;
}) {
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon-sm"
        nativeButton={false}
        render={<Link href={prevHref} />}
      >
        <ChevronLeftIcon />
        <span className="sr-only">Período anterior</span>
      </Button>
      <p className="min-w-40 text-center text-sm font-medium">{label}</p>
      <Button
        variant="ghost"
        size="icon-sm"
        nativeButton={false}
        render={<Link href={nextHref} />}
      >
        <ChevronRightIcon />
        <span className="sr-only">Próximo período</span>
      </Button>
    </div>
  );
}

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; d?: string }>;
}) {
  const params = await searchParams;
  // Estado inicial fixo: sem parâmetro de view, abre em Semana (centrada na
  // semana atual) — pedido explícito, não é preferência lembrada da sessão.
  const view: View =
    params.view === "dia" ? "dia" : params.view === "mes" ? "mes" : "semana";
  const todayKey = spDayKey(new Date());
  const anchor = /^\d{4}-\d{2}-\d{2}$/.test(params.d ?? "")
    ? (params.d as string)
    : todayKey;

  return (
    <div className="grid gap-6 animate-in fade-in duration-200">
      <PageHeader
        eyebrow="Agenda"
        title="Agenda"
        description="Consultas do consultório por dia, semana ou mês."
        actions={<ViewSwitch view={view} anchor={anchor} />}
      />

      <div key={view} className="grid gap-6 animate-in fade-in duration-200">
        {view === "dia" && <DayView />}
        {view === "semana" && <WeekView anchor={anchor} todayKey={todayKey} />}
        {view === "mes" && <MonthView anchor={anchor} todayKey={todayKey} />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Visão Dia — o mesmo conteúdo da antiga tela "Hoje", sem alteração.

async function DayView() {
  const agenda = await getTodayAgenda();
  const supabase = await createClient();
  const pendingEventIds = await getPendingPaymentEventIds(supabase);
  // Intl retorna tudo em minúsculas; maiusculizar só a 1ª letra (pt-BR usa
  // minúscula em "de julho" etc. — text-transform: capitalize erraria isso).
  const rawLabel = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    timeZone: TZ,
  }).format(new Date(agenda.date));
  const todayLabel = rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1);

  const readOkLabel =
    agenda.calendarOk && agenda.sheetsOk
      ? "Leitura do calendário e da planilha OK"
      : agenda.calendarOk
        ? "Leitura do calendário OK"
        : agenda.sheetsOk
          ? "Leitura da planilha OK"
          : null;

  return (
    <>
      <p className="-mt-4 text-sm text-muted-foreground">{todayLabel}</p>

      <SourceWarnings warnings={agenda.warnings} />

      <NextSlotsCard />

      {agenda.byUnit.length === 0 ? (
        agenda.calendarOk ? (
          <Card>
            <CardContent className="grid gap-2 py-8 text-center">
              <EmptyState icon={CalendarX2Icon} className="justify-center">
                Nenhuma consulta na agenda de hoje.
              </EmptyState>
              <ReadOkStamp
                readAt={agenda.readAt}
                label={readOkLabel ?? "Leitura OK"}
              />
            </CardContent>
          </Card>
        ) : (
          <p className="text-sm text-muted-foreground">
            Sem dados da agenda para mostrar — resolva o aviso acima.
          </p>
        )
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            {agenda.byUnit.map((group) => (
              <Card key={group.label}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {group.label}
                    <Badge variant="secondary">{group.entries.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3">
                  {group.entries.map(({ event, lead }) => (
                    <div
                      key={event.id}
                      className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[90px_1fr]"
                    >
                      <div className="text-sm font-semibold">
                        {formatTime(event.start)}
                        <span className="block text-xs font-normal text-muted-foreground">
                          até {formatTime(event.end)}
                        </span>
                      </div>
                      <div className="grid gap-1">
                        <p className="text-sm font-medium">
                          {event.patientLabel || "(sem título)"}
                          {lead?.urgencia && (
                            <StatusBadge semantic="urgent" className="ml-2">
                              sinalização
                            </StatusBadge>
                          )}
                          {pendingEventIds.has(event.id) && (
                            <StatusBadge semantic="warning" className="ml-2">
                              pagamento pendente
                            </StatusBadge>
                          )}
                        </p>
                        <LeadFacts lead={lead} />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
          {readOkLabel && (
            <ReadOkStamp readAt={agenda.readAt} label={readOkLabel} />
          )}
        </>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Visão Semana

async function WeekView({
  anchor,
  todayKey,
}: {
  anchor: string;
  todayKey: string;
}) {
  const dayKeys = weekDaysOf(anchor);
  const { entries, warnings, readAt, calendarOk } = await getRangeAgenda(
    dayKeys[0],
    dayKeys[6]
  );
  const supabase = await createClient();
  const [pendingEventIds, procedures, procedureBookings] = await Promise.all([
    getPendingPaymentEventIds(supabase),
    getActiveProcedures(supabase),
    getActiveProcedureBookingsByEventId(supabase),
  ]);
  const { startHour, endHour } = hourRangeOf(entries);

  const days: WeekDayCol[] = dayKeys.map((key) => ({
    key,
    weekdayLabel: fmtDay(key, { weekday: "short" }),
    dayLabel: fmtDay(key, { day: "2-digit", month: "2-digit" }),
    isToday: key === todayKey,
  }));

  const label = `${fmtDay(dayKeys[0], { day: "2-digit", month: "2-digit" })} – ${fmtDay(
    dayKeys[6],
    { day: "2-digit", month: "2-digit" }
  )}`;

  return (
    <>
      <div className="-mt-2 flex flex-wrap items-center justify-between gap-2">
        <PeriodNav
          label={label}
          prevHref={`/agenda?view=semana&d=${addDays(dayKeys[0], -7)}`}
          nextHref={`/agenda?view=semana&d=${addDays(dayKeys[0], 7)}`}
        />
      </div>

      <SourceWarnings warnings={warnings} />

      {calendarOk && (
        <>
          <AgendaLegend showNoUnit={entries.some((e) => e.unit === null)} />
          {entries.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhuma consulta marcada nesta semana.
            </p>
          )}
          <AgendaWeek
            days={days}
            entries={entries}
            startHour={startHour}
            endHour={endHour}
            pendingEventIds={pendingEventIds}
            procedures={procedures}
            bookAction={bookProcedure}
            procedureBookings={procedureBookings}
            cancelAction={cancelProcedure}
            rescheduleAction={rescheduleProcedure}
          />
          <ReadOkStamp readAt={readAt} label="Leitura do calendário OK" />
        </>
      )}
      {!calendarOk && (
        <p className="text-sm text-muted-foreground">
          Sem dados da agenda para mostrar — resolva o aviso acima.
        </p>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Visão Mês

async function MonthView({
  anchor,
  todayKey,
}: {
  anchor: string;
  todayKey: string;
}) {
  const cells = monthGridOf(anchor);
  const { entries, warnings, readAt, calendarOk } = await getRangeAgenda(
    cells[0].key,
    cells[cells.length - 1].key
  );
  const supabase = await createClient();
  const [pendingEventIds, procedureBookings] = await Promise.all([
    getPendingPaymentEventIds(supabase),
    getActiveProcedureBookingsByEventId(supabase),
  ]);

  const [y, m] = anchor.split("-").map(Number);
  const prevMonth = `${new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 10)}`;
  const nextMonth = `${new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10)}`;
  const raw = fmtDay(`${anchor.slice(0, 7)}-01`, {
    month: "long",
    year: "numeric",
  });
  const label = raw.charAt(0).toUpperCase() + raw.slice(1);

  return (
    <>
      <div className="-mt-2 flex flex-wrap items-center justify-between gap-2">
        <PeriodNav
          label={label}
          prevHref={`/agenda?view=mes&d=${prevMonth}`}
          nextHref={`/agenda?view=mes&d=${nextMonth}`}
        />
      </div>

      <SourceWarnings warnings={warnings} />

      {calendarOk ? (
        <>
          <AgendaLegend showNoUnit={entries.some((e) => e.unit === null)} />
          <AgendaMonth
            cells={cells}
            entries={entries}
            todayKey={todayKey}
            pendingEventIds={pendingEventIds}
            procedureBookings={procedureBookings}
            cancelAction={cancelProcedure}
            rescheduleAction={rescheduleProcedure}
          />
          <ReadOkStamp readAt={readAt} label="Leitura do calendário OK" />
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Sem dados da agenda para mostrar — resolva o aviso acima.
        </p>
      )}
    </>
  );
}
