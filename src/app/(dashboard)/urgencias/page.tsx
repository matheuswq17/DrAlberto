import { createClient } from "@/lib/supabase/server";
import { getUrgencies, type UrgencyStatus } from "@/lib/urgencies";
import { setUrgencyStatus } from "./actions";
import { ReadOkStamp, SourceWarnings } from "@/components/source-status";
import { StatusBadge, type StatusSemantic } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { matchUnitFreeText, UNIT_COLOR, UNIT_SHORT_LABELS } from "@/lib/units";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import {
  CheckCircle2Icon,
  CircleAlertIcon,
  EyeIcon,
  type LucideIcon,
} from "lucide-react";

export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<
  UrgencyStatus,
  { label: string; semantic: StatusSemantic; icon: LucideIcon }
> = {
  aberta: { label: "Aguardando revisão", semantic: "urgent", icon: CircleAlertIcon },
  vista: { label: "Vista", semantic: "warning", icon: EyeIcon },
  resolvida: { label: "Resolvida", semantic: "ok", icon: CheckCircle2Icon },
};

export default async function UrgenciasPage() {
  const supabase = await createClient();
  const { items, warnings, readAt, sheetsOk } = await getUrgencies(supabase);
  const abertas = items.filter((i) => i.status === "aberta").length;

  return (
    <div className="grid gap-6 animate-in fade-in duration-200">
      <PageHeader
        eyebrow="Sinalizações do bot"
        title="Sinalizações do bot"
        description="Casos identificados pelo chatbot que exigem revisão humana. Este painel não envia alertas automáticos ao médico."
      />

      <SourceWarnings warnings={warnings} />

      {abertas > 0 && (
        <p className="text-sm font-medium text-status-urgent-foreground">
          {abertas} sinalizaç{abertas > 1 ? "ões" : "ão"} aguardando revisão.
        </p>
      )}

      {items.length === 0 ? (
        sheetsOk ? (
          <Card>
            <CardContent className="grid gap-2 py-8 text-center">
              <EmptyState icon={CheckCircle2Icon} className="justify-center">
                Nenhuma sinalização do bot registrada.
              </EmptyState>
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
              const BadgeIcon = badge.icon;
              const unit = matchUnitFreeText(item.lead.unidade);
              return (
                <Card
                  key={item.key}
                  className={
                    item.status === "aberta"
                      ? "border-status-urgent/30"
                      : undefined
                  }
                >
                  <CardContent className="flex flex-wrap items-start justify-between gap-4 py-4">
                    <div className="grid gap-1">
                      <p className="flex items-center gap-2 text-sm font-medium">
                        {unit && (
                          <span
                            className={`size-2.5 shrink-0 rounded-full ${UNIT_COLOR[unit].dot}`}
                            title={UNIT_SHORT_LABELS[unit]}
                            aria-label={UNIT_SHORT_LABELS[unit]}
                            role="img"
                          />
                        )}
                        {item.lead.name || "(sem nome)"}
                        <StatusBadge semantic={badge.semantic} className="ml-2">
                          <BadgeIcon aria-hidden="true" />
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
                            Marcar como resolvida
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
