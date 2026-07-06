import { fetchLeadsWithQuality } from "@/lib/google/sheets";
import { computeFunnel, type FunnelMetrics } from "@/lib/metrics";
import {
  isGoogleConfigured,
  suspectRowsWarning,
  type SourceWarning,
} from "@/lib/today";
import { ReadOkStamp, SourceWarnings } from "@/components/source-status";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function FunilPage() {
  let metrics: FunnelMetrics | null = null;
  const warnings: SourceWarning[] = [];
  if (!isGoogleConfigured().sheets) {
    warnings.push({
      kind: "config",
      text: "Google Sheets não configurado — preencha GOOGLE_SHEETS_ID no .env.",
    });
  } else {
    try {
      const { leads, suspects } = await fetchLeadsWithQuality();
      metrics = computeFunnel(leads);
      const suspect = suspectRowsWarning(suspects);
      if (suspect) warnings.push(suspect);
    } catch (err) {
      warnings.push({
        kind: "erro",
        text: `Leitura do Google Sheets falhou: ${(err as Error).message}`,
      });
    }
  }
  const readAt = new Date().toISOString();

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-xl font-semibold">Funil FAQ → agendamento</h1>
        <p className="text-sm text-muted-foreground">
          Quantas conversas de dúvida viraram consulta, e o que as pessoas mais
          perguntam sem marcar.
        </p>
      </div>

      <SourceWarnings warnings={warnings} />

      {metrics && metrics.totalLeads === 0 && (
        <Card>
          <CardContent className="grid gap-2 py-8 text-center">
            <p className="text-sm text-muted-foreground">
              Nenhuma conversa registrada pelo bot ainda.
            </p>
            <ReadOkStamp readAt={readAt} label="Leitura da planilha OK" />
          </CardContent>
        </Card>
      )}

      {metrics && metrics.totalLeads > 0 && (
        <>
          <div className="grid gap-3 sm:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Conversas registradas</CardDescription>
                <CardTitle className="text-2xl">{metrics.totalLeads}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Conversas de FAQ</CardDescription>
                <CardTitle className="text-2xl">{metrics.totalFaq}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>FAQ que agendaram</CardDescription>
                <CardTitle className="text-2xl">{metrics.faqConverted}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Taxa de conversão</CardDescription>
                <CardTitle className="text-2xl">
                  {(metrics.conversionRate * 100).toFixed(0)}%
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Perguntas mais frequentes</CardTitle>
              </CardHeader>
              <CardContent>
                <QuestionTable rows={metrics.topQuestions} showConverted />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Perguntas que não convertem</CardTitle>
                <CardDescription>
                  Aparecem, mas nunca viraram agendamento.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <QuestionTable rows={metrics.topUnconverted} />
              </CardContent>
            </Card>
          </div>
          <ReadOkStamp readAt={readAt} label="Leitura da planilha OK" />
        </>
      )}
    </div>
  );
}

function QuestionTable({
  rows,
  showConverted = false,
}: {
  rows: FunnelMetrics["topQuestions"];
  showConverted?: boolean;
}) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Nada registrado ainda.</p>
    );
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Pergunta</TableHead>
          <TableHead className="w-16 text-right">Vezes</TableHead>
          {showConverted && (
            <TableHead className="w-24 text-right">Agendaram</TableHead>
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((q) => (
          <TableRow key={q.question}>
            <TableCell className="text-sm">{q.question}</TableCell>
            <TableCell className="text-right">{q.count}</TableCell>
            {showConverted && (
              <TableCell className="text-right">{q.converted}</TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
