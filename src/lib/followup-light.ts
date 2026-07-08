// Semáforo da fila de retorno: quão perto está a data de retorno prevista.
// Ajuda a priorizar quem contatar primeiro, sem precisar ler as datas.

export type FollowUpLight = "vermelho" | "amarelo" | "verde";

const YELLOW_WINDOW_DAYS = 7;

function diffDays(fromKey: string, toKey: string): number {
  const [fy, fm, fd] = fromKey.split("-").map(Number);
  const [ty, tm, td] = toKey.split("-").map(Number);
  return Math.round(
    (Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000
  );
}

/**
 * vermelho = retorno é hoje ou já passou; amarelo = chega em até 7 dias;
 * verde = ainda longe. Datas são chaves YYYY-MM-DD no dia local.
 */
export function followUpLight(
  dueDate: string,
  todayKey: string
): FollowUpLight {
  const days = diffDays(todayKey, dueDate);
  if (days <= 0) return "vermelho";
  if (days <= YELLOW_WINDOW_DAYS) return "amarelo";
  return "verde";
}

export const FOLLOW_UP_LIGHT_META: Record<
  FollowUpLight,
  { dotClass: string; label: string }
> = {
  vermelho: {
    dotClass: "bg-status-urgent",
    label: "Retorno é hoje ou já passou",
  },
  amarelo: {
    dotClass: "bg-status-warning",
    label: "Retorno chega em até 7 dias",
  },
  verde: { dotClass: "bg-status-ok", label: "Retorno ainda longe" },
};
