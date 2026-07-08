// Ficha estruturada do paciente (dados do bot) — exatamente o conteúdo que a
// tela Hoje sempre mostrou, extraído para ser reutilizado pelo modal de
// detalhe da Agenda (Semana/Mês). Componente puro: funciona em server e client.

export interface LeadFactsData {
  motivo: string;
  examePendente: string;
  sintomas: string;
  phone: string;
}

export function LeadFacts({ lead }: { lead: LeadFactsData | null }) {
  if (!lead) {
    return (
      <p className="text-xs text-muted-foreground">
        Sem ficha do bot para este paciente.
      </p>
    );
  }
  return (
    <dl className="grid gap-x-6 gap-y-1 text-xs text-muted-foreground sm:grid-cols-2">
      {lead.motivo && (
        <div>
          <dt className="inline font-medium">Motivo: </dt>
          <dd className="inline">{lead.motivo}</dd>
        </div>
      )}
      {lead.examePendente && (
        <div>
          <dt className="inline font-medium">Exame pendente: </dt>
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
  );
}
