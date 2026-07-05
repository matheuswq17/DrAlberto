import { createClient } from "@/lib/supabase/server";
import { getNextSlots } from "@/lib/next-slots";
import { ReadOkStamp, SourceWarnings } from "@/components/source-status";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function formatSlot(start: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(start);
}

export async function NextSlotsCard() {
  const supabase = await createClient();

  let content: React.ReactNode;
  try {
    const result = await getNextSlots(supabase);
    content = (
      <>
        <div className="grid gap-3 sm:grid-cols-3">
          {result.units.map(({ unit, label, next }) => (
            <div key={unit} className="rounded-lg border p-3">
              <p className="text-xs font-medium text-muted-foreground">
                {label}
              </p>
              <p className="mt-1 text-sm font-semibold">
                {next ? formatSlot(next.start) : "—"}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-3 grid gap-2">
          <SourceWarnings warnings={result.warnings} />
          {result.ok && (
            <ReadOkStamp
              readAt={result.readAt}
              label="Calculado com grade e calendário"
            />
          )}
        </div>
      </>
    );
  } catch (err) {
    content = (
      <p className="text-sm text-destructive">
        Erro ao calcular horários: {(err as Error).message}
      </p>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Próximo horário disponível</CardTitle>
        <CardDescription>
          Grade de atendimento menos os eventos do Google Calendar.
        </CardDescription>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}
