import { listEvents, type CalendarEvent } from "@/lib/google/calendar";
import { fetchLeads, type Lead } from "@/lib/google/sheets";
import { ALL_UNITS, UNIT_LABELS, type UnitId } from "@/lib/units";
import { perfTime } from "@/lib/perf";

// Painel "Hoje" (func. 1): agenda do dia consolidada + ficha estruturada por
// paciente, cruzando o evento do Calendar com a linha do lead no Sheets.
// Ficha 100% estruturada — nenhum LLM envolvido (decisão do MVP).

export interface PatientCard {
  event: CalendarEvent;
  lead: Lead | null;
}

export interface SourceWarning {
  /** 'config' = falta configurar; 'erro' = leitura falhou; 'dados' = dado suspeito na fonte */
  kind: "config" | "erro" | "dados";
  text: string;
  /** link opcional para onde se configura (ex.: /config) */
  href?: string;
}

/** Aviso padrão para linhas desalinhadas da planilha, ou null se não houver. */
export function suspectRowsWarning(
  suspects: Array<{ sheetRow: number; name: string }>
): SourceWarning | null {
  if (suspects.length === 0) return null;
  const detalhe = suspects
    .map((s) => `linha ${s.sheetRow}${s.name ? ` (${s.name})` : ""}`)
    .join(", ");
  return {
    kind: "dados",
    text: `${detalhe} da planilha parece desalinhada — menos colunas que o cabeçalho e valor true/false na coluna Tipo Handoff. Essas conversas podem estar sendo contadas errado; confira a aba Leads.`,
  };
}

export interface TodayAgenda {
  date: string; // ISO (dia local)
  byUnit: Array<{
    unit: UnitId | null;
    label: string;
    entries: PatientCard[];
  }>;
  warnings: SourceWarning[];
  /** hora (ISO) em que esta leitura foi feita — para o estado "leitura OK" */
  readAt: string;
  calendarOk: boolean;
  sheetsOk: boolean;
}

export function isGoogleConfigured(): {
  calendar: boolean;
  sheets: boolean;
} {
  const sa = !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64;
  return {
    calendar: sa && !!process.env.GOOGLE_CALENDAR_ID,
    sheets: sa && !!process.env.GOOGLE_SHEETS_ID,
  };
}

export function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Cruza o rótulo do evento (nome do paciente no título) com os leads do
 * Sheets. Prioridade: nome exato normalizado → nome contido/contendo.
 * Quando houver mais de um lead com o mesmo nome, usa o mais recente
 * (última linha da planilha).
 */
export function matchLead(patientLabel: string, leads: Lead[]): Lead | null {
  const target = normalizeName(patientLabel);
  if (!target) return null;

  let candidate: Lead | null = null;
  for (const lead of leads) {
    const name = normalizeName(lead.name);
    if (!name) continue;
    if (name === target) candidate = lead; // última ocorrência vence
  }
  if (candidate) return candidate;

  for (const lead of leads) {
    const name = normalizeName(lead.name);
    if (!name) continue;
    if (target.includes(name) || name.includes(target)) candidate = lead;
  }
  return candidate;
}

export async function getTodayAgenda(now = new Date()): Promise<TodayAgenda> {
  const warnings: SourceWarning[] = [];
  const configured = isGoogleConfigured();
  let calendarOk = false;
  let sheetsOk = false;

  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  // Calendar e Sheets são fontes independentes — buscadas em paralelo, cada
  // uma com seu próprio tratamento de erro (uma falhar não afeta a outra).
  const [calendarResult, sheetsResult] = await Promise.all([
    (async (): Promise<{ events: CalendarEvent[]; warning?: SourceWarning }> => {
      if (!configured.calendar) {
        return {
          events: [],
          warning: {
            kind: "config",
            text: "Google Calendar não configurado — preencha GOOGLE_SERVICE_ACCOUNT_JSON_BASE64 e GOOGLE_CALENDAR_ID no .env.",
          },
        };
      }
      try {
        return { events: await perfTime("google-calendar (today)", listEvents(dayStart, dayEnd)) };
      } catch (err) {
        return {
          events: [],
          warning: {
            kind: "erro",
            text: `Leitura do Google Calendar falhou: ${(err as Error).message}`,
          },
        };
      }
    })(),
    (async (): Promise<{ leads: Lead[]; warning?: SourceWarning }> => {
      if (!configured.sheets) {
        return {
          leads: [],
          warning: {
            kind: "config",
            text: "Google Sheets não configurado (fichas sem dados do bot) — preencha GOOGLE_SHEETS_ID no .env.",
          },
        };
      }
      try {
        return { leads: await perfTime("google-sheets", fetchLeads()) };
      } catch (err) {
        return {
          leads: [],
          warning: {
            kind: "erro",
            text: `Leitura do Google Sheets falhou (fichas sem dados do bot): ${(err as Error).message}`,
          },
        };
      }
    })(),
  ]);

  const events = calendarResult.events;
  calendarOk = !calendarResult.warning;
  if (calendarResult.warning) warnings.push(calendarResult.warning);

  const leads = sheetsResult.leads;
  sheetsOk = !sheetsResult.warning;
  if (sheetsResult.warning) warnings.push(sheetsResult.warning);

  const entries: PatientCard[] = events
    .filter((e) => !e.allDay)
    .sort((a, b) => a.start.localeCompare(b.start))
    .map((event) => ({
      event,
      lead: matchLead(event.patientLabel, leads),
    }));

  const byUnit: TodayAgenda["byUnit"] = ALL_UNITS.map((unit) => ({
    unit: unit as UnitId | null,
    label: UNIT_LABELS[unit],
    entries: entries.filter((e) => e.event.unit === unit),
  })).filter((g) => g.entries.length > 0);

  const noUnit = entries.filter((e) => e.event.unit === null);
  if (noUnit.length > 0) {
    byUnit.push({ unit: null, label: "Sem unidade no título", entries: noUnit });
  }

  return {
    date: dayStart.toISOString(),
    byUnit,
    warnings,
    readAt: new Date().toISOString(),
    calendarOk,
    sheetsOk,
  };
}
