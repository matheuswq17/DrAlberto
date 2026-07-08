// Gráfico de funil (barras horizontais decrescentes, centralizadas).
// Os estágios são ANINHADOS por construção (FAQ ⊆ conversas registradas,
// agendaram ⊆ FAQ) — por isso funil, e não barras categóricas.
// Rampa ordinal de um matiz (azul), validada para os dois modos:
// passo mais claro ≥ 2:1 sobre fundo claro, mais escuro ≥ 2:1 sobre o escuro.
// Rótulos e valores ficam na tinta de texto, nunca na cor da série.

export interface FunnelStage {
  label: string;
  value: number;
}

const STAGE_COLORS = ["#86b6ef", "#2a78d6", "#184f95"];

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
                className="h-full rounded-md"
                style={{
                  width: `${stage.value > 0 ? Math.max(pct, 4) : 0}%`,
                  backgroundColor: STAGE_COLORS[i % STAGE_COLORS.length],
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
