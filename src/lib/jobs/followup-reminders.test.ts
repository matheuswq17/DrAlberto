import { describe, expect, it } from "vitest";
import {
  reminderMessage,
  selectDueFollowUps,
  type FollowUpRow,
} from "./followup-reminders";

function row(partial: Partial<FollowUpRow>): FollowUpRow {
  return {
    id: "x",
    patient_name: "Maria",
    phone: "62999990000",
    procedure: "biópsia",
    procedure_date: "2026-06-20",
    due_date: "2026-07-10",
    status: "pendente",
    ...partial,
  };
}

const TODAY = new Date(2026, 6, 5); // 2026-07-05

describe("selectDueFollowUps", () => {
  it("inclui retornos dentro da janela de antecedência", () => {
    const rows = [
      row({ id: "a", due_date: "2026-07-07" }), // a 2 dias
      row({ id: "b", due_date: "2026-07-08" }), // exatamente no limite (3)
      row({ id: "c", due_date: "2026-07-20" }), // longe
    ];
    const due = selectDueFollowUps(rows, TODAY, 3);
    expect(due.map((r) => r.id)).toEqual(["a", "b"]);
  });

  it("inclui retornos vencidos", () => {
    const due = selectDueFollowUps([row({ due_date: "2026-07-01" })], TODAY, 3);
    expect(due).toHaveLength(1);
  });

  it("ignora status diferente de pendente", () => {
    const rows = [
      row({ status: "lembrete_enviado", due_date: "2026-07-06" }),
      row({ status: "concluido", due_date: "2026-07-06" }),
    ];
    expect(selectDueFollowUps(rows, TODAY, 3)).toHaveLength(0);
  });
});

describe("reminderMessage", () => {
  it("inclui nome, procedimento e data formatada", () => {
    const msg = reminderMessage(row({}));
    expect(msg).toContain("Maria");
    expect(msg).toContain("biópsia");
    expect(msg).toContain("10/07/2026");
  });
});
