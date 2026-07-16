// Aritmética de data/hora de São Paulo — funções puras, sem dependência de
// Google/Supabase. Extraído de agenda.ts para poder ser importado por
// componentes client (ex.: agenda-entry-dialog.tsx) sem puxar googleapis
// (server-only) pro bundle do navegador.

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
