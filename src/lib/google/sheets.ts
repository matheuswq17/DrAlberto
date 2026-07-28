import { google } from "googleapis";
import { getGoogleAuth } from "./auth";

// LEITURA APENAS da planilha de leads que o bot alimenta (Google Sheets).
// Headers reais confirmados em 2026-07-04 (aba "Leads"):
//   Data | Nome | Telefone | Cidade | Procedimento | Convenio | Tem Pedido |
//   Exames | Previos | Tipo Handoff | Urgencia | Status
// O mapeamento é por apelidos de cabeçalho normalizados; colunas extras ficam
// acessíveis em `raw`. Não existe coluna de pergunta de FAQ hoje — esse campo
// fica vazio até o bot passar a registrá-lo.
// Atualizado em 2026-07-28: o bot passou a preencher "Exames" com o flag
// tem_exame (Sim/Não) e "Previos" com a queixa/motivo da consulta relatada
// pelo paciente — por isso "previos" foi adicionado como apelido de `sintomas`
// abaixo (reaproveita a coluna existente, sem precisar mudar o cabeçalho real
// da planilha).

export interface Lead {
  name: string;
  phone: string;
  motivo: string;
  examePendente: string;
  sintomas: string;
  urgencia: boolean;
  /** tipo de conversa registrado pelo bot (ex.: faq, agendamento, saudacao) */
  tipo: string;
  /** pergunta de FAQ registrada, quando houver */
  perguntaFaq: string;
  /** true quando a conversa virou agendamento */
  agendado: boolean;
  unidade: string;
  createdAt: string;
  /** linha crua indexada pelo header normalizado, para agregações do funil */
  raw: Record<string, string>;
}

const HEADER_ALIASES: Record<keyof Omit<Lead, "raw">, string[]> = {
  name: ["nome", "paciente", "nome do paciente", "nome_paciente"],
  phone: ["telefone", "fone", "whatsapp", "numero", "celular", "phone"],
  motivo: ["motivo", "procedimento", "motivo da consulta", "motivo_consulta", "queixa"],
  examePendente: ["exame pendente", "exame_pendente", "exames pendentes", "exames", "exame"],
  sintomas: ["sintomas", "sintomas-chave", "sintomas chave", "sintomas_chave", "previos"],
  urgencia: ["urgencia_dr", "urgencia", "urgente"],
  tipo: ["tipo", "tipo handoff", "tipo de conversa", "tipo_conversa", "categoria", "intencao"],
  perguntaFaq: ["pergunta", "pergunta_faq", "faq", "pergunta faq"],
  agendado: ["agendado", "agendou", "virou_agendamento", "status_agendamento", "status agendamento", "status"],
  unidade: ["unidade", "local", "unidade_preferida"],
  createdAt: ["data", "timestamp", "criado em", "criado_em", "data/hora", "data_hora"],
};

export function normalizeHeader(header: string): string {
  return header
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

function truthy(value: string): boolean {
  const v = normalizeHeader(value);
  return ["true", "sim", "1", "yes", "x", "verdadeiro"].includes(v) ||
    v.includes("agendad") || v.includes("confirmad");
}

export function rowsToLeads(values: string[][]): Lead[] {
  if (values.length < 2) return [];
  const headers = values[0].map(normalizeHeader);

  const indexOf = (field: keyof Omit<Lead, "raw">): number => {
    for (const alias of HEADER_ALIASES[field]) {
      const i = headers.indexOf(alias);
      if (i !== -1) return i;
    }
    return -1;
  };

  const idx = Object.fromEntries(
    (Object.keys(HEADER_ALIASES) as Array<keyof Omit<Lead, "raw">>).map((f) => [
      f,
      indexOf(f),
    ])
  ) as Record<keyof Omit<Lead, "raw">, number>;

  const cell = (row: string[], i: number) => (i >= 0 ? (row[i] ?? "").trim() : "");

  return values.slice(1).map((row) => {
    const raw: Record<string, string> = {};
    headers.forEach((h, i) => {
      raw[h] = (row[i] ?? "").trim();
    });
    return {
      name: cell(row, idx.name),
      phone: cell(row, idx.phone).replace(/\D/g, ""),
      motivo: cell(row, idx.motivo),
      examePendente: cell(row, idx.examePendente),
      sintomas: cell(row, idx.sintomas),
      urgencia: truthy(cell(row, idx.urgencia)),
      tipo: normalizeHeader(cell(row, idx.tipo)),
      perguntaFaq: cell(row, idx.perguntaFaq),
      agendado: truthy(cell(row, idx.agendado)),
      unidade: cell(row, idx.unidade),
      createdAt: cell(row, idx.createdAt),
      raw,
    };
  });
}

export interface SuspectRow {
  /** número da linha na planilha (1-based, contando o cabeçalho) */
  sheetRow: number;
  name: string;
}

/**
 * Detecta linhas provavelmente desalinhadas (coladas à mão pulando coluna):
 * a linha tem menos células que o cabeçalho E um valor booleano (true/false)
 * caiu na coluna de Tipo Handoff — assinatura do deslocamento à esquerda.
 */
export function findSuspectRows(values: string[][]): SuspectRow[] {
  if (values.length < 2) return [];
  const headers = values[0].map(normalizeHeader);
  const tipoIdx = HEADER_ALIASES.tipo
    .map((a) => headers.indexOf(a))
    .find((i) => i !== -1);
  const nameIdx = HEADER_ALIASES.name
    .map((a) => headers.indexOf(a))
    .find((i) => i !== -1);
  if (tipoIdx === undefined) return [];

  const suspects: SuspectRow[] = [];
  values.slice(1).forEach((row, i) => {
    if (row.length >= headers.length) return;
    const tipo = normalizeHeader(row[tipoIdx] ?? "");
    if (tipo === "true" || tipo === "false") {
      suspects.push({
        sheetRow: i + 2,
        name: nameIdx !== undefined ? (row[nameIdx] ?? "").trim() : "",
      });
    }
  });
  return suspects;
}

export async function fetchLeadsWithQuality(): Promise<{
  leads: Lead[];
  suspects: SuspectRow[];
}> {
  const rows = await fetchLeadRows();
  return { leads: rowsToLeads(rows), suspects: findSuspectRows(rows) };
}

export async function fetchLeadRows(): Promise<string[][]> {
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
  const tab = process.env.GOOGLE_SHEETS_LEADS_TAB ?? "Leads";
  if (!spreadsheetId) {
    throw new Error("GOOGLE_SHEETS_ID não configurado — ver .env.example");
  }
  const sheets = google.sheets({ version: "v4", auth: getGoogleAuth() });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: tab,
  });
  return (res.data.values ?? []) as string[][];
}

export async function fetchLeads(): Promise<Lead[]> {
  return rowsToLeads(await fetchLeadRows());
}
