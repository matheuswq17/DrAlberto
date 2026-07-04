import { google } from "googleapis";

// Escopos SOMENTE LEITURA — o site nunca escreve no Calendar nem no Sheets.
const SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/spreadsheets.readonly",
];

export function getGoogleAuth() {
  const b64 = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64;
  if (!b64) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_JSON_BASE64 não configurada — ver .env.example"
    );
  }
  const credentials = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
  return new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: SCOPES,
  });
}
