-- Agendamento de procedimento feito pelo médico direto no painel (não pelo
-- bot) + catálogo de procedimentos. Ver especificacao_procedimentos_e_atendimento_hibrido.md.

create table procedures (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  default_unit text check (default_unit in ('CRD','SFA','EINSTEIN')),
  reference_price text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table procedure_bookings (
  id uuid primary key default gen_random_uuid(),
  patient_name text not null,
  patient_phone text not null,
  procedure_id uuid not null references procedures(id),
  unit text not null check (unit in ('CRD','SFA','EINSTEIN')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  price numeric(10,2) not null,
  payment_status text not null default 'pendente' check (payment_status in ('pendente','confirmado')),
  calendar_event_id text not null,
  booked_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on procedure_bookings (calendar_event_id);

alter table procedures enable row level security;
alter table procedure_bookings enable row level security;

create policy "team read" on procedures for select to authenticated using (true);
create policy "team all" on procedure_bookings for all to authenticated using (true) with check (true);

-- Catálogo real do Dr. Alberto (preço de referência fica para preencher depois,
-- manualmente, na tela de Configurações — não faz parte desta migração)
insert into procedures (name) values
  ('PAAF'),
  ('Biópsia hepática'),
  ('Biópsia de pulmão'),
  ('Biópsia retroperitônio'),
  ('Biópsia de próstata (transperineal)'),
  ('Drenagem'),
  ('Biópsia óssea'),
  ('Ablação'),
  ('Embolização'),
  ('Biópsia guiada por tomografia'),
  ('Biópsia guiada por ultrassom');
