import { createClient } from "@/lib/supabase/server";
import { getUrgencies, type UrgencyStatus } from "@/lib/urgencies";
import { setUrgencyStatus } from "./actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<
  UrgencyStatus,
  { label: string; variant: "destructive" | "secondary" | "outline" }
> = {
  aberta: { label: "Aberta", variant: "destructive" },
  vista: { label: "Vista", variant: "secondary" },
  resolvida: { label: "Resolvida", variant: "outline" },
};

export default async function UrgenciasPage() {
  const supabase = await createClient();
  const { items, warnings } = await getUrgencies(supabase);
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

      {warnings.map((w) => (
        <p
          key={w}
          className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800"
        >
          {w}
        </p>
      ))}

      {abertas > 0 && (
        <p className="text-sm font-medium">
          {abertas} urgência{abertas > 1 ? "s" : ""} sem revisão.
        </p>
      )}

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Nenhuma urgência registrada pelo bot.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {items.map((item) => {
            const badge = STATUS_BADGE[item.status];
            return (
              <Card key={item.key}>
                <CardContent className="flex flex-wrap items-start justify-between gap-4 py-4">
                  <div className="grid gap-1">
                    <p className="text-sm font-medium">
                      {item.lead.name || "(sem nome)"}
                      <Badge className="ml-2" variant={badge.variant}>
                        {badge.label}
                      </Badge>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.lead.createdAt && <>Registrado: {item.lead.createdAt} · </>}
                      Telefone: {item.lead.phone || "—"}
                    </p>
                    {(item.lead.sintomas || item.lead.motivo) && (
                      <p className="text-xs">
                        {item.lead.sintomas || item.lead.motivo}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {item.status !== "vista" && item.status !== "resolvida" && (
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
      )}
    </div>
  );
}
