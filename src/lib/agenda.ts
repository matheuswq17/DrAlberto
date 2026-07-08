import { listEvents } from "@/lib/google/calendar";
import { fetchLeads, type Lead } from "@/lib/google/sheets";
import { isGoogleConfigured, matchLead, type SourceWarning } from "@/lib/today";
import type { UnitId } from "@/lib/units";

// Visões Semana e Mês da Agenda (somente leitura). A visão Dia continua sendo
// getTodayAgenda — este módulo só cobre intervalos maiores. Todo cálculo de
// "que dia/que hora" usa o relógio de parede de America/Sao_Paulo, porque o
// servidor pode rodar em UTC.

const TZ = "America/Sao_Paulo";

/** Dia local de São Paulo (YYYY-MM-DD) de um instante ISO. */
export function spDayKey(iso: string | Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(typeof iso === "string" ? new Date(iso) : iso);
}

/** Minutos desde a meia-noite de São Paulo de um instante ISO. */
export function spWallMinutes(iso: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return get("hour") * 60 + get("minute");
}

/** Instante do início do dia (00:00) de São Paulo para uma chave YYYY-MM-DD. */
export function spMidnight(dayKey: string): Date {
  // America/Sao_Paulo é UTC-3 fixo (sem horário de verão desde 2019)
  return new Date(`${dayKey}T00:00:00-03:00`);
}

/** Soma dias a uma chave YYYY-MM-DD (aritmética de calendário, sem fuso). */
export function addDays(dayKey: string, days: number): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}

/** Segunda-feira da semana que contém o dia dado. */
export function mondayOf(dayKey: string): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=domingo
  return addDays(dayKey, dow === 0 ? -6 : 1 - dow);
}

/** As 7 chaves (segunda→domingo) da semana que contém o dia dado. */
export function weekDaysOf(dayKey: string): string[] {
  const monday = mondayOf(dayKey);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

export interface MonthCell {
  key: string;
  dayNum: number;
  inMonth: boolean;
}

/**
 * Grade do mês que contém o dia dado: linhas de segunda a domingo, cobrindo
 * do primeiro ao último dia do mês (com sobras dos meses vizinhos).
 */
export function monthGridOf(dayKey: string): MonthCell[] {
  const [y, m] = dayKey.split("-").map(Number);
  const monthPrefix = dayKey.slice(0, 7);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const lastDay = `${monthPrefix}-${String(daysInMonth).padStart(2, "0")}`;
  const cells: MonthCell[] = [];
  let key = mondayOf(`${monthPrefix}-01`);
  while (key <= lastDay || cells.length % 7 !== 0) {
    cells.push({
      key,
      dayNum: Number(key.slice(8, 10)),
      inMonth: key.slice(0, 7) === monthPrefix,
    });
    key = addDays(key, 1);
  }
  return cells;
}

/** Ficha resumida do lead, serializável para os componentes client. */
export interface AgendaLeadInfo {
  urgencia: boolean;
  motivo: string;
  examePendente: string;
  sintomas: string;
  phone: string;
}

export interface AgendaEntry {
  id: string;
  dayKey: string;
  startMin: number;
  endMin: number;
  startLabel: string;
  endLabel: string;
  patientLabel: string;
  unit: UnitId | null;
  lead: AgendaLeadInfo | null;
}

export interface RangeAgenda {
  entries: AgendaEntry[];
  warnings: SourceWarning[];
  readAt: string;
  calendarOk: boolean;
}

function toLeadInfo(lead: Lead | null): AgendaLeadInfo | null {
  if (!lead) return null;
  return {
    urgencia: lead.urgencia,
    motivo: lead.motivo,
    examePendente: lead.examePendente,
    sintomas: lead.sintomas,
    phone: lead.phone,
  };
}

function fmtTime(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  }).format(new Date(iso));
}

/**
 * Consultas de [firstDay, lastDay] (chaves YYYY-MM-DD, inclusivo) com a ficha
 * do bot cruzada — mesma leitura/cruzamento do painel Dia, num intervalo maior.
 */
export async function getRangeAgenda(
  firstDay: string,
  lastDay: string
): Promise<RangeAgenda> {
  const warnings: SourceWarning[] = [];
  const configured = isGoogleConfigured();
  let calendarOk = false;

  let events: Awaited<ReturnType<typeof listEvents>> = [];
  if (!configured.calendar) {
    warnings.push({
      kind: "config",
      text: "Google Calendar não configurado — preencha GOOGLE_SERVICE_ACCOUNT_JSON_BASE64 e GOOGLE_CALENDAR_ID no .env.",
    });
  } else {
    try {
      events = await listEvents(spMidnight(firstDay), spMidnight(addDays(lastDay, 1)));
      calendarOk = true;
    } catch (err) {
      warnings.push({
        kind: "erro",
        text: `Leitura do Google Calendar falhou: ${(err as Error).message}`,
      });
    }
  }

  let leads: Lead[] = [];
  if (configured.sheets) {
    try {
      leads = await fetchLeads();
    } catch (err) {
      warnings.push({
        kind: "erro",
        text: `Leitura do Google Sheets falhou (fichas sem dados do bot): ${(err as Error).message}`,
      });
    }
  }

  const entries: AgendaEntry[] = events
    .filter((e) => !e.allDay)
    .map((event) => ({
      id: event.id,
      dayKey: spDayKey(event.start),
      startMin: spWallMinutes(event.start),
      endMin: spWallMinutes(event.end),
      startLabel: fmtTime(event.start),
      endLabel: fmtTime(event.end),
      patientLabel: event.patientLabel,
      unit: event.unit,
      lead: toLeadInfo(matchLead(event.patientLabel, leads)),
    }))
    .sort((a, b) => a.dayKey.localeCompare(b.dayKey) || a.startMin - b.startMin);

  return { entries, warnings, readAt: new Date().toISOString(), calendarOk };
}

/**
 * Faixa de horas exibida na grade da semana: 7h–19h por padrão, esticada
 * para caber consultas fora desse intervalo.
 */
export function hourRangeOf(
  entries: AgendaEntry[],
  defaultStart = 7,
  defaultEnd = 19
): { startHour: number; endHour: number } {
  let startHour = defaultStart;
  let endHour = defaultEnd;
  for (const e of entries) {
    startHour = Math.min(startHour, Math.floor(e.startMin / 60));
    endHour = Math.max(endHour, Math.ceil(e.endMin / 60));
  }
  return { startHour, endHour };
}
