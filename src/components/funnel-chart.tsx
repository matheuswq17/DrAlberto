// Gráfico de funil (barras horizontais decrescentes, centralizadas).
// Os estágios são ANINHADOS por construção (FAQ ⊆ conversas registradas,
// agendaram ⊆ FAQ) — por isso funil, e não barras categóricas.
// Rampa ordinal de um matiz (teal, a cor de marca), usando os tokens
// --chart-1..3 — se adapta ao modo claro/escuro automaticamente.
// Rótulos e valores ficam na tinta de texto, nunca na cor da série.

export interface FunnelStage {
  label: string;
  value: number;
}

const STAGE_COLOR_CLASSES = ["bg-chart-1", "bg-chart-2", "bg-chart-3"];

export function FunnelChart({ stages }: { stages: FunnelStage[] }) {
  const max = Math.max(...stages.map((s) => s.value), 1);
  return (
    <div className="grid gap-2" role="img" aria-label="Funil de conversão">
      {stages.map((stage, i) => {
        const pct = (stage.value / max) * 100;
        const prev = i > 0 ? stages[i - 1].value : null;
        const stepRate =
          prev !== null && prev > 0
            ? Math.round((stage.value / prev) * 100)
            : null;
        return (
          <div key={stage.label} className="grid gap-1">
            <div className="flex items-baseline justify-between gap-2 text-xs">
              <span className="text-muted-foreground">{stage.label}</span>
              <span className="font-medium tabular-nums">
                {stage.value}
                {stepRate !== null && (
                  <span className="ml-1.5 font-normal text-muted-foreground">
                    ({stepRate}% da etapa anterior)
                  </span>
                )}
              </span>
            </div>
            <div className="flex h-9 justify-center">
              <div
                className={`h-full rounded-md ${STAGE_COLOR_CLASSES[i % STAGE_COLOR_CLASSES.length]}`}
                style={{
                  width: `${stage.value > 0 ? Math.max(pct, 4) : 0}%`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
