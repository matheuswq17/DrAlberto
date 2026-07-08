import { describe, expect, it } from "vitest";
import { buildDailyBriefing } from "./daily-briefing";

describe("buildDailyBriefing", () => {
  it("lista consultas com hora, nome e unidade", () => {
    const msg = buildDailyBriefing({
      dateLabel: "quarta-feira, 08/07",
      consultas: [
        { time: "09:00", name: "Maria Souza", unitShort: "CRD" },
        { time: "10:30", name: "João Pereira", unitShort: null },
      ],
      urgenciasAbertas: 1,
      encaixesAbertos: 2,
    });
    expect(msg).toContain("2 consulta(s)");
    expect(msg).toContain("09:00 Maria Souza — CRD");
    expect(msg).toContain("10:30 João Pereira");
    expect(msg).toContain("1 urgência(s) sem revisão");
    expect(msg).toContain("2 encaixe(s) em aberto");
  });

  it("dia vazio e sem pendências fica curto e claro", () => {
    const msg = buildDailyBriefing({
      dateLabel: "domingo, 12/07",
      consultas: [],
      urgenciasAbertas: 0,
      encaixesAbertos: 0,
    });
    expect(msg).toContain("Nenhuma consulta na agenda de hoje.");
    expect(msg).toContain("Sem urgências pendentes.");
    expect(msg).not.toContain("encaixe");
  });

  it("trunca listas longas e avisa fontes indisponíveis", () => {
    const many = Array.from({ length: 15 }, (_, i) => ({
      time: `0${(i % 9) + 1}:00`,
      name: `Paciente ${i + 1}`,
      unitShort: "CRD",
    }));
    const msg = buildDailyBriefing({
      dateLabel: "quarta-feira, 08/07",
      consultas: many,
      urgenciasAbertas: null,
      encaixesAbertos: 0,
    });
    expect(msg).toContain("… e mais 3.");
    expect(msg).toContain("Google Sheets indisponível");

    const noCal = buildDailyBriefing({
      dateLabel: "quarta-feira, 08/07",
      consultas: null,
      urgenciasAbertas: 0,
      encaixesAbertos: 0,
    });
    expect(noCal).toContain("Google Calendar indisponível");
  });
});
