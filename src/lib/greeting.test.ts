import { describe, expect, it } from "vitest";
import { buildGreeting, formatGreetingName, greetingForHour } from "./greeting";

describe("formatGreetingName", () => {
  it("aplica 'Dr.' quando o nome não tem título e o papel é médico", () => {
    expect(formatGreetingName("Alberto", "medico")).toBe("Dr. Alberto");
  });

  it("não duplica título já presente no nome ('Dr. Alberto')", () => {
    expect(formatGreetingName("Dr. Alberto", "medico")).toBe("Dr. Alberto");
  });

  it("usa só o primeiro nome, descartando sobrenome", () => {
    expect(formatGreetingName("Dr. Alberto Rassi", "medico")).toBe("Dr. Alberto");
  });

  it("preserva título feminino já presente ('Dra. Maria')", () => {
    expect(formatGreetingName("Dra. Maria", "medico")).toBe("Dra. Maria");
  });

  it("não adiciona título para quem não é médico", () => {
    expect(formatGreetingName("Ana", "secretaria")).toBe("Ana");
  });

  it("reconhece 'Doutor'/'Doutora' por extenso", () => {
    expect(formatGreetingName("Doutora Fernanda Lima", "medico")).toBe(
      "Dra. Fernanda"
    );
    expect(formatGreetingName("Doutor Carlos", "medico")).toBe("Dr. Carlos");
  });

  it("devolve string vazia quando o nome está ausente", () => {
    expect(formatGreetingName(null, "medico")).toBe("");
    expect(formatGreetingName(undefined, "medico")).toBe("");
    expect(formatGreetingName("   ", "medico")).toBe("");
  });

  it("é insensível a maiúsculas/minúsculas e a ponto no título", () => {
    expect(formatGreetingName("dr alberto", "medico")).toBe("Dr. Alberto");
    expect(formatGreetingName("DRA MARIA", "medico")).toBe("Dra. Maria");
  });
});

describe("greetingForHour", () => {
  it("bom dia antes do meio-dia", () => {
    expect(greetingForHour(0)).toBe("Bom dia");
    expect(greetingForHour(11)).toBe("Bom dia");
  });

  it("boa tarde entre meio-dia e 18h", () => {
    expect(greetingForHour(12)).toBe("Boa tarde");
    expect(greetingForHour(17)).toBe("Boa tarde");
  });

  it("boa noite a partir das 18h", () => {
    expect(greetingForHour(18)).toBe("Boa noite");
    expect(greetingForHour(23)).toBe("Boa noite");
  });
});

describe("buildGreeting", () => {
  it("combina saudação e nome sem duplicar título", () => {
    expect(buildGreeting(14, "Dr. Alberto Rassi", "medico")).toBe(
      "Boa tarde, Dr. Alberto"
    );
  });

  it("nunca produz 'Dr. Dr.'", () => {
    const result = buildGreeting(14, "Dr. Alberto", "medico");
    expect(result).not.toMatch(/Dr\.\s+Dr\./i);
    expect(result).toBe("Boa tarde, Dr. Alberto");
  });

  it("omite a vírgula e o nome quando não há nome", () => {
    expect(buildGreeting(9, null, "medico")).toBe("Bom dia");
  });
});
