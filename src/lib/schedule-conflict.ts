// Validação de conflito de horário na grade de atendimento (func. 5 —
// Configurações). Duas entradas da MESMA unidade e do MESMO dia da semana
// conflitam quando seus intervalos [início, fim) se sobrepõem — é o próprio
// intervalo (não a duração da consulta) que define o bloco ocupado; a
// duração só decide quantos encaixes cabem dentro dele.

export interface ScheduleCandidate {
  unit: string;
  weekday: number;
  start_time: string;
  end_time: string;
}

export interface ScheduleRowLike extends ScheduleCandidate {
  id: string;
}

/** "HH:MM" ou "HH:MM:SS" → minutos desde 00:00, para comparar intervalos. */
function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m ?? 0);
}

export function isValidTimeRange(start: string, end: string): boolean {
  return toMinutes(start) < toMinutes(end);
}

/**
 * Devolve a primeira entrada existente que conflita com o candidato, ou
 * null se não houver conflito. Ignora a própria entrada quando `excludeId`
 * é passado (edição/cópia que reaproveita o mesmo id).
 */
export function findScheduleConflict<T extends ScheduleRowLike>(
  candidate: ScheduleCandidate,
  existing: T[],
  excludeId?: string
): T | null {
  const candidateStart = toMinutes(candidate.start_time);
  const candidateEnd = toMinutes(candidate.end_time);

  for (const row of existing) {
    if (excludeId && row.id === excludeId) continue;
    if (row.unit !== candidate.unit || row.weekday !== candidate.weekday) continue;
    const rowStart = toMinutes(row.start_time);
    const rowEnd = toMinutes(row.end_time);
    // sobreposição clássica de intervalos [a,b) x [c,d)
    if (candidateStart < rowEnd && rowStart < candidateEnd) {
      return row;
    }
  }
  return null;
}
