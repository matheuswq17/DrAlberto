import { createClient } from "@/lib/supabase/server";
import { getUrgencies, type UrgencyStatus } from "@/lib/urgencies";
import { setUrgencyStatus } from "./actions";
import { ReadOkStamp, SourceWarnings } from "@/components/source-status";
import { StatusBadge, type StatusSemantic } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<
  UrgencyStatus,
  { label: string; semantic: StatusSemantic }
> = {
  aberta: { label: "Aberta", semantic: "urgent" },
  vista: { label: "Vista", semantic: "warning" },
  resolvida: { label: "Resolvida", semantic: "ok" },
};

export default async function UrgenciasPage() {
  const supabase = await createClient();
  const { items, warnings, readAt, sheetsOk } = await getUrgencies(supabase);
  const abertas = items.filter((i) => i.status === "aberta").length;

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-xl font-semibold">Urgências</h1>
        <p className="text-sm text-muted-foreground">
          Triagens que o bot marcou como urgentes. Este painel é consultado
          quando você quiser — nada aqui dispara notificação para o médico.
        </p>
      </div>

      <SourceWarnings warnings={warnings} />

      {abertas > 0 && (
        <p className="text-sm font-medium">
          {abertas} urgência{abertas > 1 ? "s" : ""} sem revisão.
        </p>
      )}

      {items.length === 0 ? (
        sheetsOk ? (
          <Card>
            <CardContent className="grid gap-2 py-8 text-center">
              <p className="text-sm text-muted-foreground">
                Nenhuma urgência registrada pelo bot.
              </p>
              <ReadOkStamp readAt={readAt} label="Leitura da planilha OK" />
            </CardContent>
          </Card>
        ) : (
          <p className="text-sm text-muted-foreground">
            Sem dados para mostrar — resolva o aviso acima.
          </p>
        )
      ) : (
        <>
          <div className="grid gap-3">
            {items.map((item) => {
              const badge = STATUS_BADGE[item.status];
              return (
                <Card key={item.key}>
                  <CardContent className="flex flex-wrap items-start justify-between gap-4 py-4">
                    <div className="grid gap-1">
                      <p className="text-sm font-medium">
                        {item.lead.name || "(sem nome)"}
                        <StatusBadge semantic={badge.semantic} className="ml-2">
                          {badge.label}
                        </StatusBadge>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.lead.createdAt && (
                          <>Registrado: {item.lead.createdAt} · </>
                        )}
                        Telefone: {item.lead.phone || "—"}
                      </p>
                      {(item.lead.sintomas || item.lead.motivo) && (
                        <p className="text-xs">
                          {item.lead.sintomas || item.lead.motivo}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {item.status === "aberta" && (
                        <form action={setUrgencyStatus}>
                          <input type="hidden" name="key" value={item.key} />
                          <input type="hidden" name="status" value="vista" />
                          <Button variant="outline" size="sm" type="submit">
                            Marcar como vista
                          </Button>
                        </form>
                      )}
                      {item.status !== "resolvida" && (
                        <form action={setUrgencyStatus}>
                          <input type="hidden" name="key" value={item.key} />
                          <input type="hidden" name="status" value="resolvida" />
                          <Button size="sm" type="submit">
                            Resolvida
                          </Button>
                        </form>
                      )}
                      {item.status === "resolvida" && (
                        <form action={setUrgencyStatus}>
                          <input type="hidden" name="key" value={item.key} />
                          <input type="hidden" name="status" value="aberta" />
                          <Button variant="ghost" size="sm" type="submit">
                            Reabrir
                          </Button>
                        </form>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          {sheetsOk && (
            <ReadOkStamp readAt={readAt} label="Leitura da planilha OK" />
          )}
        </>
      )}
    </div>
  );
}
