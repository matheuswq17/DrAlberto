import Link from "next/link";
import { fetchLeadsWithQuality } from "@/lib/google/sheets";
import { filterByPeriod, isPeriod, type Period } from "@/lib/funnel-period";
import { computeFunnel, type FunnelMetrics } from "@/lib/metrics";
import {
  isGoogleConfigured,
  suspectRowsWarning,
  type SourceWarning,
} from "@/lib/today";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/empty-state";
import { FunnelChart } from "@/components/funnel-chart";
import { PageHeader } from "@/components/page-header";
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
import { ListXIcon, MessageSquareIcon } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function FunilPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const params = await searchParams;
  // Parâmetro inválido/ausente cai no fallback seguro: todo o período, o
  // mesmo comportamento de sempre (não muda número nenhum sem escolha explícita).
  const period = isPeriod(params.period) ? params.period : null;

  let metrics: FunnelMetrics | null = null;
  let unrecognizedDate = 0;
  const warnings: SourceWarning[] = [];
  if (!isGoogleConfigured().sheets) {
    warnings.push({
      kind: "config",
      text: "Google Sheets não configurado — preencha GOOGLE_SHEETS_ID no .env.",
    });
  } else {
    try {
      const { leads, suspects } = await fetchLeadsWithQuality();
      const result = filterByPeriod(leads, period);
      unrecognizedDate = result.unrecognizedDate;
      metrics = computeFunnel(result.filtered);
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
    <div className="grid gap-6 animate-in fade-in duration-200">
      <PageHeader
        eyebrow="Funil"
        title="Funil FAQ → agendamento"
        description="Quantas conversas de dúvida viraram consulta, e o que as pessoas mais perguntam sem marcar."
        actions={<PeriodSwitch period={period} />}
      />

      <SourceWarnings warnings={warnings} />

      {period && unrecognizedDate > 0 && (
        <p className="text-xs text-muted-foreground">
          {unrecognizedDate} conversa{unrecognizedDate > 1 ? "s" : ""} sem
          data reconhecida na planilha não {unrecognizedDate > 1 ? "entram" : "entra"} neste
          recorte por período.
        </p>
      )}

      {metrics && metrics.totalLeads === 0 && (
        <Card>
          <CardContent className="grid gap-2 py-8 text-center">
            <EmptyState icon={MessageSquareIcon} className="justify-center">
              Nenhuma conversa registrada pelo bot ainda.
            </EmptyState>
            <ReadOkStamp readAt={readAt} label="Leitura da planilha OK" />
          </CardContent>
        </Card>
      )}

      {metrics && metrics.totalLeads > 0 && (
        <>
          <div className="grid gap-6 lg:grid-cols-[minmax(220px,1fr)_2fr]">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Taxa de conversão</CardDescription>
                <CardTitle className="text-5xl tabular-nums">
                  {(metrics.conversionRate * 100).toFixed(0)}%
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {metrics.faqConverted} de {metrics.totalFaq} conversa
                  {metrics.totalFaq === 1 ? "" : "s"} classificada
                  {metrics.totalFaq === 1 ? "" : "s"} como FAQ{" "}
                  {metrics.faqConverted === 1 ? "resultou" : "resultaram"} em
                  agendamento.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Da conversa ao agendamento</CardTitle>
                <CardDescription>
                  Cada etapa é parte da anterior.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FunnelChart
                  stages={[
                    {
                      label: "Conversas registradas",
                      value: metrics.totalLeads,
                    },
                    { label: "Conversas de FAQ", value: metrics.totalFaq },
                    { label: "FAQ que agendaram", value: metrics.faqConverted },
                  ]}
                />
              </CardContent>
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

function PeriodSwitch({ period }: { period: Period | null }) {
  const options: Array<{ value: Period | null; label: string }> = [
    { value: null, label: "Todo o período" },
    { value: "7", label: "7 dias" },
    { value: "30", label: "30 dias" },
    { value: "90", label: "90 dias" },
  ];
  return (
    <div className="inline-flex w-fit items-center rounded-lg bg-muted p-[3px]">
      {options.map((opt) => {
        const href = opt.value ? `/funil?period=${opt.value}` : "/funil";
        const active = period === opt.value;
        return (
          <Link
            key={opt.label}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-1 text-sm whitespace-nowrap transition-colors",
              active
                ? "bg-card font-medium text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {opt.label}
          </Link>
        );
      })}
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
    return <EmptyState icon={ListXIcon}>Nada registrado ainda.</EmptyState>;
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
