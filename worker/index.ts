// Worker de jobs agendados — roda como segundo serviço no Easypanel
// (mesma imagem Docker do site). Usa a service role do Supabase.
//
// Jobs:
//   - Lembretes de retorno (func. 4): diário às 08:00
//   - Relatório periódico (func. 7): segunda 07:00 (semanal) ou dia 1 (mensal)
//   - Resumo do dia: diário 07:00, só se daily_summary_enabled=true em /config
//   - Radar de vagas liberadas (func. 3): a cada 15 minutos
//
// Execução manual (verificação): tsx worker/index.ts --run <followups|report|radar|briefing>

import "dotenv/config";
import cron from "node-cron";
import { createAdminClient } from "../src/lib/supabase/admin";
import { runDailyBriefing } from "../src/lib/jobs/daily-briefing";
import { runFollowUpReminders } from "../src/lib/jobs/followup-reminders";
import { runPeriodicReport } from "../src/lib/jobs/periodic-report";
import { runRadar } from "../src/lib/jobs/radar";

const TZ = "America/Sao_Paulo";

async function followups() {
  const supabase = createAdminClient();
  const result = await runFollowUpReminders(supabase);
  console.log(
    `[followups] ${new Date().toISOString()} enviados=${result.sent} falhas=${result.failed}`
  );
}

async function report() {
  const supabase = createAdminClient();
  const result = await runPeriodicReport(supabase);
  console.log(
    `[report] ${new Date().toISOString()} enviado=${result.sent}${result.reason ? ` (${result.reason})` : ""}`
  );
}

/** Roda o relatório apenas se a periodicidade configurada bater com o cron. */
async function reportIfPeriod(period: "semanal" | "mensal") {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "report_period")
    .maybeSingle();
  const configured = data?.value === "mensal" ? "mensal" : "semanal";
  if (configured !== period) return;
  await report();
}

async function briefing() {
  const supabase = createAdminClient();
  const result = await runDailyBriefing(supabase);
  console.log(
    `[briefing] ${new Date().toISOString()} enviado=${result.sent}${result.reason ? ` (${result.reason})` : ""}`
  );
}

async function radar() {
  const supabase = createAdminClient();
  const result = await runRadar(supabase);
  console.log(
    `[radar] ${new Date().toISOString()} vagas_novas=${result.freedDetected} eventos_no_snapshot=${result.snapshotSize}`
  );
}

const MANUAL_JOBS: Record<string, () => Promise<void>> = {
  followups,
  report,
  radar,
  briefing,
};

async function main() {
  const runArg = process.argv.indexOf("--run");
  if (runArg !== -1) {
    const name = process.argv[runArg + 1];
    const job = MANUAL_JOBS[name];
    if (!job) {
      console.error(
        `Job desconhecido: ${name}. Disponíveis: ${Object.keys(MANUAL_JOBS).join(", ")}`
      );
      process.exit(1);
    }
    await job();
    process.exit(0);
  }

  console.log("Worker iniciado. Jobs agendados:");
  console.log("  - lembretes de retorno: diário 08:00", TZ);
  console.log("  - relatório semanal: segunda 07:00 (se report_period=semanal)");
  console.log("  - relatório mensal: dia 1, 07:00 (se report_period=mensal)");

  cron.schedule("0 8 * * *", () => followups().catch(console.error), {
    timezone: TZ,
  });
  cron.schedule("0 7 * * 1", () => reportIfPeriod("semanal").catch(console.error), {
    timezone: TZ,
  });
  cron.schedule("0 7 1 * *", () => reportIfPeriod("mensal").catch(console.error), {
    timezone: TZ,
  });
  console.log(
    "  - resumo do dia: diário 07:00 (se daily_summary_enabled=true)"
  );
  cron.schedule("0 7 * * *", () => briefing().catch(console.error), {
    timezone: TZ,
  });
  console.log("  - radar de vagas: a cada 15 minutos");
  cron.schedule("*/15 * * * *", () => radar().catch(console.error), {
    timezone: TZ,
  });
}

main();
