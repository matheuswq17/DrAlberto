import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Paleta semântica RESTRITA — só para estado de coisas do consultório:
//   urgent  (vermelho) = urgência clínica real
//   warning (âmbar)    = atenção / aguardando alguém
//   ok      (verde)    = confirmado / concluído
//   info    (azul)     = estado informativo, sem ação pendente
//   routine (cinza)    = rotina, sem carga
// Não usar para mensagens genéricas do sistema ("salvo com sucesso" etc.).

export type StatusSemantic = "urgent" | "warning" | "ok" | "info" | "routine";

const CLASSES: Record<StatusSemantic, string> = {
  urgent:
    "border-status-urgent/40 bg-status-urgent/10 text-status-urgent-foreground",
  warning:
    "border-status-warning/40 bg-status-warning/10 text-status-warning-foreground",
  ok: "border-status-ok/40 bg-status-ok/10 text-status-ok-foreground",
  info: "border-status-info/40 bg-status-info/10 text-status-info-foreground",
  routine:
    "border-status-routine/40 bg-status-routine/10 text-status-routine-foreground",
};

export function StatusBadge({
  semantic,
  className,
  children,
}: {
  semantic: StatusSemantic;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Badge variant="outline" className={cn(CLASSES[semantic], className)}>
      {children}
    </Badge>
  );
}
