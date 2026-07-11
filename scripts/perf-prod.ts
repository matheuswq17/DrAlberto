// Mede navegação em produção local (build + start já rodando) e falha se
// achar erro de console/hidratação. Sem PII: só rota, tempo e contagem.
// Uso:
//   npm run build && npm run start -- -p 3100
//   PLAYWRIGHT_BASE_URL=http://localhost:3100 npm run perf:prod
//
// Compara automaticamente com a última execução salva em
// scripts/.perf-results/last.json (git-ignorado) para mostrar antes/depois
// em vez de um limiar fixo.

import { chromium } from "playwright";
import { mkdirSync, existsSync, readFileSync, writeFileSync } from "fs";
import path from "path";

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const ROUTES = ["/", "/agenda", "/urgencias", "/encaixes", "/retornos", "/funil", "/config"];
const RESULTS_DIR = path.join(__dirname, ".perf-results");
const RESULTS_FILE = path.join(RESULTS_DIR, "last.json");

interface RouteResult {
  route: string;
  coldMs: number;
  warmMs: number[];
  warmMedianMs: number;
  consoleErrors: string[];
}

async function main() {
  const browser = await chromium.launch();
  const results: RouteResult[] = [];
  let hadErrors = false;

  for (const route of ROUTES) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text().slice(0, 300));
    });
    page.on("pageerror", (err) => consoleErrors.push(`pageerror: ${err.message}`.slice(0, 300)));

    const t0 = Date.now();
    await page.goto(BASE + route, { waitUntil: "load" });
    const coldMs = Date.now() - t0;

    const warmMs: number[] = [];
    for (let i = 0; i < 3; i++) {
      const tw = Date.now();
      await page.goto(BASE + route, { waitUntil: "load" });
      warmMs.push(Date.now() - tw);
    }

    await page.close();
    const sorted = [...warmMs].sort((a, b) => a - b);
    const warmMedianMs = sorted[Math.floor(sorted.length / 2)];

    if (consoleErrors.length > 0) hadErrors = true;
    results.push({ route, coldMs, warmMs, warmMedianMs, consoleErrors });
  }

  await browser.close();

  const previous: RouteResult[] | null = existsSync(RESULTS_FILE)
    ? JSON.parse(readFileSync(RESULTS_FILE, "utf-8"))
    : null;

  console.log(`\nRota          Cold(ms)  Warm-med(ms)  ${previous ? "Δwarm-med" : ""}  Erros`);
  for (const r of results) {
    const prev = previous?.find((p) => p.route === r.route);
    const delta = prev ? r.warmMedianMs - prev.warmMedianMs : null;
    const deltaLabel = delta === null ? "" : `${delta > 0 ? "+" : ""}${delta}ms`;
    console.log(
      `${r.route.padEnd(14)} ${String(r.coldMs).padStart(7)}  ${String(r.warmMedianMs).padStart(11)}  ${deltaLabel.padStart(9)}  ${r.consoleErrors.length}`
    );
    for (const e of r.consoleErrors) console.log(`   ERRO: ${e}`);
  }

  mkdirSync(RESULTS_DIR, { recursive: true });
  writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));

  if (hadErrors) {
    console.error("\nFALHOU: erro(s) de console/hidratação detectado(s).");
    process.exit(1);
  }
  console.log("\nOK: nenhum erro de console/hidratação.");
}

main();
