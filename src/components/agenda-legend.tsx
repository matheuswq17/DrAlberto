import {
  ALL_UNITS,
  NO_UNIT_COLOR,
  UNIT_COLOR,
  UNIT_SHORT_LABELS,
} from "@/lib/units";

/**
 * Legenda cor→hospital das visões Semana e Mês. Fica grudada no topo da
 * viewport (sticky) para permanecer visível durante a rolagem da grade.
 */
export function AgendaLegend({ showNoUnit = false }: { showNoUnit?: boolean }) {
  return (
    <div className="sticky top-0 z-30 -my-1 flex flex-wrap items-center gap-x-4 gap-y-1 bg-background/90 py-2 backdrop-blur-sm">
      {ALL_UNITS.map((unit) => (
        <span
          key={unit}
          className="flex items-center gap-1.5 text-xs text-muted-foreground"
        >
          <span className={`size-2.5 rounded-full ${UNIT_COLOR[unit].dot}`} />
          {UNIT_SHORT_LABELS[unit]}
        </span>
      ))}
      {showNoUnit && (
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className={`size-2.5 rounded-full ${NO_UNIT_COLOR.dot}`} />
          Sem unidade
        </span>
      )}
    </div>
  );
}
