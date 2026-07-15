import { describe, expect, it } from "vitest";
import { parseUnitFromTitle, stripUnitPrefix, buildEventTitle } from "./units";

describe("parseUnitFromTitle", () => {
  it("mapeia [CRD] para CRD", () => {
    expect(parseUnitFromTitle("[CRD] Maria Souza")).toBe("CRD");
  });

  it("mapeia [SF] (convenção real) para o id interno SFA", () => {
    expect(parseUnitFromTitle("[SF] João Pereira")).toBe("SFA");
  });

  it("aceita [SFA] defensivamente", () => {
    expect(parseUnitFromTitle("[SFA] João Pereira")).toBe("SFA");
  });

  it("mapeia [EINSTEIN] para EINSTEIN", () => {
    expect(parseUnitFromTitle("[EINSTEIN] Ana Lima")).toBe("EINSTEIN");
  });

  it("é case-insensitive e tolera espaços à esquerda", () => {
    expect(parseUnitFromTitle("  [crd] Paciente")).toBe("CRD");
    expect(parseUnitFromTitle("[einstein] Paciente")).toBe("EINSTEIN");
  });

  it("retorna null sem prefixo reconhecido", () => {
    expect(parseUnitFromTitle("Consulta Maria")).toBeNull();
    expect(parseUnitFromTitle("")).toBeNull();
    expect(parseUnitFromTitle(null)).toBeNull();
  });
});

describe("extractPatientLabel", () => {
  it("remove unidade e o prefixo 'Consulta -' (formato real do bot)", async () => {
    const { extractPatientLabel } = await import("./units");
    expect(extractPatientLabel("[CRD] Consulta - Maria Souza")).toBe("Maria Souza");
    expect(extractPatientLabel("Consulta - Maria Souza")).toBe("Maria Souza");
    expect(extractPatientLabel("consulta: João")).toBe("João");
    expect(extractPatientLabel("[SF] Maria Souza")).toBe("Maria Souza");
    expect(extractPatientLabel("Reunião interna")).toBe("Reunião interna");
  });
});

describe("stripUnitPrefix", () => {
  it("remove o prefixo e espaços", () => {
    expect(stripUnitPrefix("[SF] João Pereira")).toBe("João Pereira");
    expect(stripUnitPrefix("[CRD]Maria")).toBe("Maria");
  });

  it("mantém título sem prefixo", () => {
    expect(stripUnitPrefix("Reunião interna")).toBe("Reunião interna");
  });
});

describe("buildEventTitle", () => {
  it("monta o título com o prefixo correto por unidade", () => {
    expect(buildEventTitle("CRD", "Maria Souza", "PAAF")).toBe(
      "[CRD] Maria Souza - PAAF"
    );
    expect(buildEventTitle("SFA", "João Pereira", "Drenagem")).toBe(
      "[SF] João Pereira - Drenagem"
    );
    expect(buildEventTitle("EINSTEIN", "Ana Lima", "Biópsia óssea")).toBe(
      "[EINSTEIN] Ana Lima - Biópsia óssea"
    );
  });
});
