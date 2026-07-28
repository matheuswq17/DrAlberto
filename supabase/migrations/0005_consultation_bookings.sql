-- Espelho no Supabase das consultas marcadas pelo BOT (fluxo antigo, via WhatsApp,
-- fonte de verdade real continua sendo a aba "Agendamentos" da planilha Google + o
-- Google Calendar). Criado para o painel poder listar/gerenciar pagamento pendente de
-- consulta em Conversas, do mesmo jeito que já faz com procedure_bookings.
--
-- id = reaproveita o agendamento_id gerado pelo bot (formato "AG-xxxxx"), não é uuid.

create table consultation_bookings (
  id text primary key,
  patient_name text,
  patient_phone text not null,
  local text,
  starts_at timestamptz,
  price numeric(10,2),
  payment_status text not null default 'pendente' check (payment_status in ('pendente','confirmado')),
  calendar_event_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table consultation_bookings enable row level security;
create policy "team all" on consultation_bookings for all to authenticated using (true) with check (true);
