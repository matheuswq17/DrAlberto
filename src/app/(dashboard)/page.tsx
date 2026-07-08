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
import { getTodayAgenda } from "@/lib/today";
import { cn } from "@/lib/utils";
import { AgendaLegend } from "@/components/agenda-legend";
import { AgendaMonth } from "@/components/agenda-month";
import { AgendaWeek, type WeekDayCol } from "@/components/agenda-week";
import { NextSlotsCard } from "@/components/next-slots-card";
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
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

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
    { value: "dia", label: "Dia", href: "/" },
    { value: "semana", label: "Semana", href: `/?view=semana&d=${anchor}` },
    { value: "mes", label: "Mês", href: `/?view=mes&d=${anchor}` },
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
              ? "bg-background font-medium text-foreground shadow-sm"
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
      <Button variant="ghost" size="icon-sm" render={<Link href={prevHref} />}>
        <ChevronLeftIcon />
        <span className="sr-only">Período anterior</span>
      </Button>
      <p className="min-w-40 text-center text-sm font-medium">{label}</p>
      <Button variant="ghost" size="icon-sm" render={<Link href={nextHref} />}>
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
  const view: View =
    params.view === "semana" ? "semana" : params.view === "mes" ? "mes" : "dia";
  const todayKey = spDayKey(new Date());
  const anchor = /^\d{4}-\d{2}-\d{2}$/.test(params.d ?? "")
    ? (params.d as string)
    : todayKey;

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Agenda</h1>
        <ViewSwitch view={view} anchor={anchor} />
      </div>

      {view === "dia" && <DayView />}
      {view === "semana" && <WeekView anchor={anchor} todayKey={todayKey} />}
      {view === "mes" && <MonthView anchor={anchor} todayKey={todayKey} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Visão Dia — o mesmo conteúdo da antiga tela "Hoje", sem alteração.

async function DayView() {
  const agenda = await getTodayAgenda();
  const todayLabel = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    timeZone: TZ,
  }).format(new Date(agenda.date));

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
      <p className="-mt-4 text-sm capitalize text-muted-foreground">
        {todayLabel}
      </p>

      <SourceWarnings warnings={agenda.warnings} />

      <NextSlotsCard />

      {agenda.byUnit.length === 0 ? (
        agenda.calendarOk ? (
          <Card>
            <CardContent className="grid gap-2 py-8 text-center">
              <p className="text-sm text-muted-foreground">
                Nenhuma consulta na agenda de hoje.
              </p>
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
                            urgência
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
          prevHref={`/?view=semana&d=${addDays(dayKeys[0], -7)}`}
          nextHref={`/?view=semana&d=${addDays(dayKeys[0], 7)}`}
        />
      </div>

      <SourceWarnings warnings={warnings} />

      {calendarOk && (
        <>
          <AgendaLegend showNoUnit={entries.some((e) => e.unit === null)} />
          {entries.length === 0 ? (
            <Card>
              <CardContent className="grid gap-2 py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Nenhuma consulta nesta semana.
                </p>
                <ReadOkStamp readAt={readAt} label="Leitura do calendário OK" />
              </CardContent>
            </Card>
          ) : (
            <>
              <AgendaWeek
                days={days}
                entries={entries}
                startHour={startHour}
                endHour={endHour}
              />
              <ReadOkStamp readAt={readAt} label="Leitura do calendário OK" />
            </>
          )}
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
          prevHref={`/?view=mes&d=${prevMonth}`}
          nextHref={`/?view=mes&d=${nextMonth}`}
        />
      </div>

      <SourceWarnings warnings={warnings} />

      {calendarOk ? (
        <>
          <AgendaLegend showNoUnit={entries.some((e) => e.unit === null)} />
          <AgendaMonth cells={cells} entries={entries} todayKey={todayKey} />
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
