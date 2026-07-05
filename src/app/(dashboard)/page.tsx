import { NextSlotsCard } from "@/components/next-slots-card";
import { ReadOkStamp, SourceWarnings } from "@/components/source-status";
import { StatusBadge } from "@/components/status-badge";
import { getTodayAgenda } from "@/lib/today";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso));
}

export default async function TodayPage() {
  const agenda = await getTodayAgenda();
  const todayLabel = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(agenda.date));

  const readOkLabel =
    agenda.calendarOk && agenda.sheetsOk
      ? "Leitura do calendário e da planilha OK"
      : agenda.calendarOk
        ? "Leitura do calendário OK"
        : agenda.sheetsOk
          ? "Leitura da planilha OK"
          : null;

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-xl font-semibold">Hoje</h1>
        <p className="text-sm capitalize text-muted-foreground">{todayLabel}</p>
      </div>

      <SourceWarnings warnings={agenda.warnings} />

      <NextSlotsCard />

      {agenda.byUnit.length === 0 ? (
        agenda.calendarOk ? (
          <Card>
            <CardContent className="grid gap-2 py-8 text-center">
              <p className="text-sm text-muted-foreground">
                Nenhuma consulta na agenda de hoje.
              </p>
              <ReadOkStamp
                readAt={agenda.readAt}
                label={readOkLabel ?? "Leitura OK"}
              />
            </CardContent>
          </Card>
        ) : (
          <p className="text-sm text-muted-foreground">
            Sem dados da agenda para mostrar — resolva o aviso acima.
          </p>
        )
      ) : (
        <>
          {agenda.byUnit.map((group) => (
            <Card key={group.label}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {group.label}
                  <Badge variant="secondary">{group.entries.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                {group.entries.map(({ event, lead }) => (
                  <div
                    key={event.id}
                    className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[90px_1fr]"
                  >
                    <div className="text-sm font-semibold">
                      {formatTime(event.start)}
                      <span className="block text-xs font-normal text-muted-foreground">
                        até {formatTime(event.end)}
                      </span>
                    </div>
                    <div className="grid gap-1">
                      <p className="text-sm font-medium">
                        {event.patientLabel || "(sem título)"}
                        {lead?.urgencia && (
                          <StatusBadge semantic="urgent" className="ml-2">
                            urgência
                          </StatusBadge>
                        )}
                      </p>
                      {lead ? (
                        <dl className="grid gap-x-6 gap-y-1 text-xs text-muted-foreground sm:grid-cols-2">
                          {lead.motivo && (
                            <div>
                              <dt className="inline font-medium">Motivo: </dt>
                              <dd className="inline">{lead.motivo}</dd>
                            </div>
                          )}
                          {lead.examePendente && (
                            <div>
                              <dt className="inline font-medium">
                                Exame pendente:{" "}
                              </dt>
                              <dd className="inline">{lead.examePendente}</dd>
                            </div>
                          )}
                          {lead.sintomas && (
                            <div>
                              <dt className="inline font-medium">Sintomas: </dt>
                              <dd className="inline">{lead.sintomas}</dd>
                            </div>
                          )}
                          {lead.phone && (
                            <div>
                              <dt className="inline font-medium">Telefone: </dt>
                              <dd className="inline">{lead.phone}</dd>
                            </div>
                          )}
                        </dl>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Sem ficha do bot para este paciente.
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
          {readOkLabel && (
            <ReadOkStamp readAt={agenda.readAt} label={readOkLabel} />
          )}
        </>
      )}
    </div>
  );
}
