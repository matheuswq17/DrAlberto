import { google } from "googleapis";
import { getGoogleWriteAuth } from "./auth";
import { listEvents } from "./calendar";

// Único ponto de ESCRITA no Google Calendar de todo o projeto — usado
// exclusivamente pelos fluxos de procedimento marcado pelo médico no painel
// (criar, desmarcar, reagendar). Todo o resto do app (google/calendar.ts e o
// worker) permanece somente-leitura.

/**
 * Relê o Calendar para o intervalo exato e diz se já existe algo lá —
 * checagem simples de conflito (não é uma trava distribuída completa),
 * suficiente porque só o médico usa este fluxo, de forma manual e pontual.
 * `excludeEventId` ignora o próprio evento sendo reagendado (senão ele
 * sempre "conflitaria" consigo mesmo).
 */
export async function hasCalendarConflict(
  startsAt: Date,
  endsAt: Date,
  excludeEventId?: string
): Promise<boolean> {
  const events = await listEvents(startsAt, endsAt);
  return events.some(
    (e) =>
      e.id !== excludeEventId &&
      !e.allDay &&
      new Date(e.start) < endsAt &&
      startsAt < new Date(e.end)
  );
}

export async function createProcedureEvent(params: {
  title: string;
  startsAt: Date;
  endsAt: Date;
}): Promise<string> {
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  if (!calendarId) {
    throw new Error("GOOGLE_CALENDAR_ID não configurado — ver .env.example");
  }
  const calendar = google.calendar({ version: "v3", auth: getGoogleWriteAuth() });
  const res = await calendar.events.insert({
    calendarId,
    requestBody: {
      summary: params.title,
      start: { dateTime: params.startsAt.toISOString() },
      end: { dateTime: params.endsAt.toISOString() },
    },
  });
  if (!res.data.id) {
    throw new Error("Google Calendar não retornou id do evento criado");
  }
  return res.data.id;
}

/** Move um evento existente para um novo horário (reagendamento). */
export async function updateProcedureEvent(
  eventId: string,
  startsAt: Date,
  endsAt: Date
): Promise<void> {
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  if (!calendarId) {
    throw new Error("GOOGLE_CALENDAR_ID não configurado — ver .env.example");
  }
  const calendar = google.calendar({ version: "v3", auth: getGoogleWriteAuth() });
  await calendar.events.patch({
    calendarId,
    eventId,
    requestBody: {
      start: { dateTime: startsAt.toISOString() },
      end: { dateTime: endsAt.toISOString() },
    },
  });
}

/**
 * Apaga o evento (desmarcar procedimento). Trata 404/410 como sucesso —
 * se o evento já não existe no Calendar (ex.: apagado manualmente antes),
 * o resultado prático desejado (evento fora da agenda) já está satisfeito.
 */
export async function deleteProcedureEvent(eventId: string): Promise<void> {
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  if (!calendarId) {
    throw new Error("GOOGLE_CALENDAR_ID não configurado — ver .env.example");
  }
  const calendar = google.calendar({ version: "v3", auth: getGoogleWriteAuth() });
  try {
    await calendar.events.delete({ calendarId, eventId });
  } catch (err) {
    const code = (err as { code?: number }).code;
    if (code === 404 || code === 410) return;
    throw err;
  }
}
