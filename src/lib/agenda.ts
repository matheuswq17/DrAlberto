import { listEvents } from "@/lib/google/calendar";
import { fetchLeads, type Lead } from "@/lib/google/sheets";
import { isGoogleConfigured, matchLead, type SourceWarning } from "@/lib/today";
import type { UnitId } from "@/lib/units";
import { addDays, spDayKey, spMidnight, spWallMinutes } from "@/lib/sp-time";

// Visões Semana e Mês da Agenda (somente leitura). A visão Dia continua sendo
// getTodayAgenda — este módulo só cobre intervalos maiores. Todo cálculo de
// "que dia/que hora" usa o relógio de parede de America/Sao_Paulo, porque o
// servidor pode rodar em UTC.

const TZ = "America/Sao_Paulo";

// Aritmética de data/hora pura (sem dependência de Google/Supabase) mora em
// sp-time.ts — reexportada aqui para não quebrar quem já importa daqui
// (page.tsx, daily-briefing.ts, agenda.test.ts). Componentes client devem
// importar direto de "@/lib/sp-time" para não puxar googleapis pro bundle.
export { addDays, mondayOf, monthGridOf, spDayKey, spMidnight, spWallMinutes, weekDaysOf } from "@/lib/sp-time";
export type { MonthCell } from "@/lib/sp-time";

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
