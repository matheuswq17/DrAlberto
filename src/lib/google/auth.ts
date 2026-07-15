import { google } from "googleapis";

// Escopos SOMENTE LEITURA — o site nunca escreve no Calendar nem no Sheets,
// EXCETO o escopo de escrita abaixo (getGoogleWriteAuth), usado só pelo
// fluxo de "Marcar procedimento" (agendamento manual do médico pelo painel
// — decisão consciente de flexibilizar a regra de somente-leitura, só para
// essa ação pontual). Ver src/lib/google/procedure-events.ts.
const SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/spreadsheets.readonly",
];

const WRITE_SCOPES = ["https://www.googleapis.com/auth/calendar.events"];

function jwtFromCredentials(scopes: string[]) {
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
    scopes,
  });
}

export function getGoogleAuth() {
  return jwtFromCredentials(SCOPES);
}

/**
 * Auth com escopo de ESCRITA em eventos — usar SOMENTE no fluxo de
 * agendamento de procedimento pelo médico. A service account também precisa
 * ter permissão de edição compartilhada no Calendar (não só leitura) para
 * isso funcionar de verdade — passo manual, fora do código.
 */
export function getGoogleWriteAuth() {
  return jwtFromCredentials(WRITE_SCOPES);
}
