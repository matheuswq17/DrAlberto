// Worker de jobs agendados — roda como segundo serviço no Easypanel
// (mesma imagem Docker do site). Usa a service role do Supabase.
//
// Jobs:
//   - Lembretes de retorno (func. 4): diário às 08:00
//   - Relatório periódico (func. 7): segunda 07:00 (semanal) ou dia 1 (mensal)
//   - Radar de vagas liberadas (func. 3): a cada 15 minutos
//
// Execução manual (verificação): tsx worker/index.ts --run <followups|report|radar>

import "dotenv/config";
import cron from "node-cron";
import { createAdminClient } from "../src/lib/supabase/admin";
import { runFollowUpReminders } from "../src/lib/jobs/followup-reminders";

const TZ = "America/Sao_Paulo";

async function followups() {
  const supabase = createAdminClient();
  const result = await runFollowUpReminders(supabase);
  console.log(
    `[followups] ${new Date().toISOString()} enviados=${result.sent} falhas=${result.failed}`
  );
}

const MANUAL_JOBS: Record<string, () => Promise<void>> = {
  followups,
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

  cron.schedule("0 8 * * *", () => followups().catch(console.error), {
    timezone: TZ,
  });
}

main();
