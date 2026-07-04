// Sanity check de leitura contra os sistemas REAIS (somente leitura).
// Requer .env preenchido. Uso: npm run sanity
// Não escreve nada em lugar nenhum — só lê e imprime.

import "dotenv/config";
import { listEvents } from "../src/lib/google/calendar";
import { fetchLeadRows, normalizeHeader, rowsToLeads } from "../src/lib/google/sheets";

async function main() {
  const now = new Date();
  const in7days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  console.log("== Google Calendar (próximos 7 dias) ==");
  try {
    const events = await listEvents(now, in7days);
    console.log(`${events.length} eventos`);
    for (const e of events.slice(0, 10)) {
      console.log(`  ${e.start}  [${e.unit ?? "sem unidade"}]  ${e.patientLabel}`);
    }
  } catch (err) {
    console.error("Falhou:", (err as Error).message);
  }

  console.log("\n== Google Sheets (leads) ==");
  try {
    const rows = await fetchLeadRows();
    if (rows.length === 0) {
      console.log("Planilha vazia (nem cabeçalho ainda).");
      return;
    }
    console.log(
      "Cabeçalho cru:",
      rows[0].map((h) => JSON.stringify(h)).join(", ")
    );
    console.log(
      "Cabeçalho normalizado:",
      rows[0].map(normalizeHeader).join(" | ")
    );

    const leads = rowsToLeads(rows);
    console.log(`${leads.length} linhas de dados`);
    for (const l of leads.slice(-5)) {
      console.log(
        `  ${l.createdAt} | ${l.name} | ${l.phone} | tipo=${l.tipo} | urgencia=${l.urgencia} | agendado=${l.agendado}`
      );
    }
  } catch (err) {
    console.error("Falhou:", (err as Error).message);
  }
}

main();
