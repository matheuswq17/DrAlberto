import { describe, expect, it } from "vitest";
import { findSuspectRows, normalizeHeader, rowsToLeads } from "./sheets";

const FIXTURE: string[][] = [
  [
    "Timestamp",
    "Nome",
    "Telefone",
    "Motivo da consulta",
    "Exame pendente",
    "Sintomas",
    "urgencia_dr",
    "Tipo",
    "Pergunta FAQ",
    "Agendado",
    "Unidade",
  ],
  [
    "2026-07-01 09:12",
    "Maria Souza",
    "(62) 99999-1111",
    "Dor abdominal",
    "Tomografia",
    "dor há 3 dias",
    "FALSE",
    "agendamento",
    "",
    "sim",
    "CRD",
  ],
  [
    "2026-07-01 10:30",
    "João Pereira",
    "62988882222",
    "",
    "",
    "sangramento",
    "TRUE",
    "faq",
    "Quanto custa uma biópsia?",
    "",
    "",
  ],
];

describe("normalizeHeader", () => {
  it("remove acentos, espaços e caixa", () => {
    expect(normalizeHeader(" Motivo da Consulta ")).toBe("motivo da consulta");
    expect(normalizeHeader("URGÊNCIA")).toBe("urgencia");
  });
});

describe("rowsToLeads com os headers REAIS da planilha (confirmados 2026-07-04)", () => {
  const REAL: string[][] = [
    ["Data", "Nome", "Telefone", "Cidade", "Procedimento", "Convenio", "Tem Pedido", "Exames", "Previos", "Tipo Handoff", "Urgencia", "Status"],
    ["2026-07-04 10:00", "Ana Lima", "(62) 98888-7777", "Goiânia", "Biópsia de tireoide", "Unimed", "sim", "US de tireoide", "não", "agendamento", "FALSE", "agendado"],
    ["2026-07-04 11:00", "Bruno Reis", "62977776666", "Anápolis", "", "", "", "", "", "faq", "TRUE", ""],
  ];

  it("mapeia procedimento→motivo, exames→examePendente, tipo handoff→tipo", () => {
    const [ana, bruno] = rowsToLeads(REAL);
    expect(ana.motivo).toBe("Biópsia de tireoide");
    expect(ana.examePendente).toBe("US de tireoide");
    expect(ana.tipo).toBe("agendamento");
    expect(ana.agendado).toBe(true);
    expect(ana.urgencia).toBe(false);
    expect(bruno.tipo).toBe("faq");
    expect(bruno.urgencia).toBe(true);
    expect(bruno.agendado).toBe(false);
  });

  it("colunas extras ficam acessíveis em raw", () => {
    const [ana] = rowsToLeads(REAL);
    expect(ana.raw["convenio"]).toBe("Unimed");
    expect(ana.raw["tem pedido"]).toBe("sim");
    expect(ana.raw["cidade"]).toBe("Goiânia");
  });
});

describe("findSuspectRows (linha colada à mão pulando coluna)", () => {
  const HEADER = ["Data", "Nome", "Telefone", "Cidade", "Procedimento", "Convenio", "Tem Pedido", "Exames", "Previos", "Tipo Handoff", "Urgencia", "Status"];
  // caso real de 2026-07-05: linha com 10 células, "faq" caiu em Previos e
  // "FALSE" em Tipo Handoff (deslocada 1 coluna à esquerda)
  const MISALIGNED = ["2026-07-05 09:40", "João Pereira (EXEMPLO)", "62988882222", "Anápolis", "", "", "", "", "faq", "FALSE"];
  const ALIGNED_SHORT = ["2026-07-05 09:40", "João Pereira", "62988882222", "Anápolis", "", "", "", "", "", "faq", "FALSE"];
  const ALIGNED_FULL = ["2026-07-05 10:20", "Ana Lima", "62977773333", "Goiânia", "Biópsia", "", "sim", "US", "", "faq", "FALSE", "agendado"];

  it("detecta a assinatura do deslocamento (menos células + booleano em Tipo Handoff)", () => {
    const suspects = findSuspectRows([HEADER, MISALIGNED]);
    expect(suspects).toEqual([
      { sheetRow: 2, name: "João Pereira (EXEMPLO)" },
    ]);
  });

  it("não acusa linha curta porém alinhada, nem linha completa", () => {
    expect(findSuspectRows([HEADER, ALIGNED_SHORT, ALIGNED_FULL])).toEqual([]);
  });

  it("numera pela posição real na planilha", () => {
    const suspects = findSuspectRows([HEADER, ALIGNED_FULL, MISALIGNED]);
    expect(suspects[0].sheetRow).toBe(3);
  });

  it("planilha vazia ou só cabeçalho não acusa nada", () => {
    expect(findSuspectRows([])).toEqual([]);
    expect(findSuspectRows([HEADER])).toEqual([]);
  });
});

describe("rowsToLeads", () => {
  it("mapeia colunas por apelido de header", () => {
    const leads = rowsToLeads(FIXTURE);
    expect(leads).toHaveLength(2);

    expect(leads[0].name).toBe("Maria Souza");
    expect(leads[0].phone).toBe("62999991111");
    expect(leads[0].motivo).toBe("Dor abdominal");
    expect(leads[0].examePendente).toBe("Tomografia");
    expect(leads[0].urgencia).toBe(false);
    expect(leads[0].agendado).toBe(true);
    expect(leads[0].tipo).toBe("agendamento");

    expect(leads[1].urgencia).toBe(true);
    expect(leads[1].agendado).toBe(false);
    expect(leads[1].perguntaFaq).toBe("Quanto custa uma biópsia?");
    expect(leads[1].tipo).toBe("faq");
  });

  it("expõe a linha crua para agregações", () => {
    const leads = rowsToLeads(FIXTURE);
    expect(leads[0].raw["unidade"]).toBe("CRD");
  });

  it("retorna vazio sem linhas de dados", () => {
    expect(rowsToLeads([])).toEqual([]);
    expect(rowsToLeads([FIXTURE[0]])).toEqual([]);
  });
});
