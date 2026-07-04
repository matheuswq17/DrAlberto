-- Migração inicial — Site de Gestão Dr. Alberto Rassi
-- Todas as tabelas com RLS habilitado. Política única: authenticated pode
-- select/insert/update (equipe de 2 pessoas; o role só muda a UI).
-- O worker usa a service role key (bypassa RLS).

-- Perfis (espelho de auth.users; criados manualmente — sem tela de signup)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  role text not null check (role in ('medico', 'secretaria'))
);

-- Fila de espera para remanejamento (func. 3)
create table waiting_list (
  id uuid primary key default gen_random_uuid(),
  patient_name text not null,
  phone text not null,
  preferred_unit text check (preferred_unit in ('CRD','SFA','EINSTEIN')),
  notes text,
  status text not null default 'aguardando' check (status in ('aguardando','contactado','agendado','removido')),
  created_at timestamptz not null default now(),
  created_by uuid references profiles(id)
);

-- Fila de retorno/follow-up (func. 4)
create table follow_ups (
  id uuid primary key default gen_random_uuid(),
  patient_name text not null,
  phone text not null,
  procedure text not null,           -- ex: biópsia, drenagem
  procedure_date date not null,
  due_date date not null,            -- data prevista do retorno
  status text not null default 'pendente' check (status in ('pendente','lembrete_enviado','agendado','concluido','cancelado')),
  reminder_sent_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid references profiles(id)
);

-- Vagas liberadas detectadas (func. 3)
create table freed_slots (
  id uuid primary key default gen_random_uuid(),
  calendar_event_id text not null,
  unit text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text not null check (reason in ('cancelamento','no_show','desconhecido')),
  status text not null default 'aberta' check (status in ('aberta','sugerida','preenchida','ignorada')),
  detected_at timestamptz not null default now(),
  unique (calendar_event_id, starts_at)
);

-- Sugestões de remanejamento com aprovação humana (func. 3)
create table reschedule_suggestions (
  id uuid primary key default gen_random_uuid(),
  freed_slot_id uuid not null references freed_slots(id),
  waiting_list_id uuid not null references waiting_list(id),
  status text not null default 'pendente' check (status in ('pendente','aprovada_enviada','rejeitada')),
  decided_by uuid references profiles(id),
  decided_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

-- Estado de revisão das urgências (func. 2 — o dado vem do Sheets; aqui só "vista/resolvida")
create table urgency_reviews (
  id uuid primary key default gen_random_uuid(),
  sheet_row_key text not null unique,  -- telefone + timestamp da linha no Sheets
  status text not null default 'aberta' check (status in ('aberta','vista','resolvida')),
  reviewed_by uuid references profiles(id),
  reviewed_at timestamptz
);

-- Snapshot da agenda para detecção de vagas liberadas (func. 3)
create table calendar_snapshots (
  id uuid primary key default gen_random_uuid(),
  taken_at timestamptz not null default now(),
  events jsonb not null                -- [{eventId, start, end, summary, unit}]
);

-- Horários de atendimento por unidade (func. 5 — editável na tela de config)
create table unit_schedules (
  id uuid primary key default gen_random_uuid(),
  unit text not null check (unit in ('CRD','SFA','EINSTEIN')),
  weekday int not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  slot_minutes int not null default 30,
  unique (unit, weekday, start_time)
);

-- Auditoria de todo WhatsApp enviado PELO SITE (regra inviolável 4)
create table message_log (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  kind text not null check (kind in ('lembrete_retorno','oferta_remanejamento','relatorio_periodico')),
  body text not null,
  safe_mode boolean not null,
  related_id uuid,                     -- fk lógica para follow_ups/reschedule_suggestions
  sent_by uuid references profiles(id),-- null quando enviado pelo worker
  sent_at timestamptz not null default now()
);

-- Configurações simples chave/valor (destinatário/periodicidade do relatório,
-- antecedência do lembrete de retorno) — editadas na tela /config
create table app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles(id)
);

-- Fase 2 (criada agora, SEM pipeline de ingestão — decisão confirmada)
create table whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  direction text not null check (direction in ('inbound','outbound')),
  content text not null,
  message_ts timestamptz not null,
  raw jsonb
);
create index on whatsapp_messages (phone, message_ts);

-- ============ RLS ============
alter table profiles enable row level security;
alter table waiting_list enable row level security;
alter table follow_ups enable row level security;
alter table freed_slots enable row level security;
alter table reschedule_suggestions enable row level security;
alter table urgency_reviews enable row level security;
alter table calendar_snapshots enable row level security;
alter table unit_schedules enable row level security;
alter table message_log enable row level security;
alter table app_settings enable row level security;
alter table whatsapp_messages enable row level security;

create policy "team read" on profiles for select to authenticated using (true);

create policy "team all" on waiting_list for all to authenticated using (true) with check (true);
create policy "team all" on follow_ups for all to authenticated using (true) with check (true);
create policy "team all" on freed_slots for all to authenticated using (true) with check (true);
create policy "team all" on reschedule_suggestions for all to authenticated using (true) with check (true);
create policy "team all" on urgency_reviews for all to authenticated using (true) with check (true);
create policy "team all" on unit_schedules for all to authenticated using (true) with check (true);
create policy "team all" on app_settings for all to authenticated using (true) with check (true);

-- snapshots e logs: equipe lê; escrita é do worker/rotas server-side (service role)
create policy "team read" on calendar_snapshots for select to authenticated using (true);
create policy "team read" on message_log for select to authenticated using (true);
create policy "team insert" on message_log for insert to authenticated with check (true);

-- transcrição fase 2: equipe só lê (ingestão futura será via service role)
create policy "team read" on whatsapp_messages for select to authenticated using (true);
