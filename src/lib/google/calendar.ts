import { google } from "googleapis";
import { getGoogleAuth } from "./auth";
import { parseUnitFromTitle, stripUnitPrefix, type UnitId } from "@/lib/units";

// LEITURA APENAS. Nenhuma função deste módulo escreve no Google Calendar —
// regra inviolável até existir o mecanismo de trava de concorrência com o bot.

export interface CalendarEvent {
  id: string;
  title: string;
  /** Título sem o prefixo de unidade — normalmente o nome do paciente. */
  patientLabel: string;
  unit: UnitId | null;
  start: string; // ISO
  end: string; // ISO
  allDay: boolean;
}

export async function listEvents(
  timeMin: Date,
  timeMax: Date
): Promise<CalendarEvent[]> {
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  if (!calendarId) {
    throw new Error("GOOGLE_CALENDAR_ID não configurado — ver .env.example");
  }

  const calendar = google.calendar({ version: "v3", auth: getGoogleAuth() });
  const events: CalendarEvent[] = [];
  let pageToken: string | undefined;

  do {
    const res = await calendar.events.list({
      calendarId,
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 2500,
      pageToken,
    });
    for (const item of res.data.items ?? []) {
      if (item.status === "cancelled") continue;
      const start = item.start?.dateTime ?? item.start?.date;
      const end = item.end?.dateTime ?? item.end?.date;
      if (!item.id || !start || !end) continue;
      events.push({
        id: item.id,
        title: item.summary ?? "",
        patientLabel: stripUnitPrefix(item.summary),
        unit: parseUnitFromTitle(item.summary),
        start,
        end,
        allDay: !item.start?.dateTime,
      });
    }
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);

  return events;
}
