import { google } from "googleapis";
import { getGoogleWriteAuth } from "./auth";
import { listEvents } from "./calendar";

// Único ponto de ESCRITA no Google Calendar de todo o projeto — usado
// exclusivamente pelo fluxo "Marcar procedimento" (agendamento manual do
// médico pelo painel). Todo o resto do app (google/calendar.ts e o worker)
// permanece somente-leitura.

/**
 * Relê o Calendar para o intervalo exato e diz se já existe algo lá —
 * checagem simples de conflito (não é uma trava distribuída completa),
 * suficiente porque só o médico usa este fluxo, de forma manual e pontual.
 */
export async function hasCalendarConflict(
  startsAt: Date,
  endsAt: Date
): Promise<boolean> {
  const events = await listEvents(startsAt, endsAt);
  return events.some(
    (e) => !e.allDay && new Date(e.start) < endsAt && startsAt < new Date(e.end)
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
