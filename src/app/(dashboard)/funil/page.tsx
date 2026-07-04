import { fetchLeads } from "@/lib/google/sheets";
import { computeFunnel, type FunnelMetrics } from "@/lib/metrics";
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
  let warning: string | null = null;
  try {
    metrics = computeFunnel(await fetchLeads());
  } catch (err) {
    warning = `Google Sheets indisponível: ${(err as Error).message}`;
  }

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-xl font-semibold">Funil FAQ → agendamento</h1>
        <p className="text-sm text-muted-foreground">
          Quantas conversas de dúvida viraram consulta, e o que as pessoas mais
          perguntam sem marcar.
        </p>
      </div>

      {warning && (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {warning}
        </p>
      )}

      {metrics && (
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
