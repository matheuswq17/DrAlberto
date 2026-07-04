import { listEvents, type CalendarEvent } from "@/lib/google/calendar";
import { fetchLeads, type Lead } from "@/lib/google/sheets";
import { ALL_UNITS, UNIT_LABELS, type UnitId } from "@/lib/units";

// Painel "Hoje" (func. 1): agenda do dia consolidada + ficha estruturada por
// paciente, cruzando o evento do Calendar com a linha do lead no Sheets.
// Ficha 100% estruturada — nenhum LLM envolvido (decisão do MVP).

export interface PatientCard {
  event: CalendarEvent;
  lead: Lead | null;
}

export interface TodayAgenda {
  date: string; // ISO (dia local)
  byUnit: Array<{
    unit: UnitId | null;
    label: string;
    entries: PatientCard[];
  }>;
  warnings: string[];
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
  const warnings: string[] = [];

  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  let events: CalendarEvent[] = [];
  try {
    events = await listEvents(dayStart, dayEnd);
  } catch (err) {
    warnings.push(`Google Calendar indisponível: ${(err as Error).message}`);
  }

  let leads: Lead[] = [];
  try {
    leads = await fetchLeads();
  } catch (err) {
    warnings.push(
      `Google Sheets indisponível (fichas sem dados do bot): ${(err as Error).message}`
    );
  }

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
  };
}
