-- =============================================
-- VestibulaRe - Setup do Banco de Dados
-- Execute este SQL no Supabase SQL Editor
-- =============================================

-- Tabela de perfis (extensão do Supabase Auth)
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  full_name text,
  phone text,
  plan_type text check (plan_type in ('free', 'basic', 'premium')) default 'free',
  plan_expires_at timestamp with time zone,
  is_admin boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Tabela de vestibulares
create table if not exists vestibulares (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text,
  official_url text,
  logo_url text,
  active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Tabela de datas importantes
create table if not exists important_dates (
  id uuid primary key default gen_random_uuid(),
  vestibular_id uuid references vestibulares(id) on delete cascade,
  event_type text not null check (event_type in ('inscricao', 'prova', 'resultado', 'segunda_chamada', 'recurso', 'matricula', 'outro')),
  event_name text not null,
  event_date date not null,
  event_end_date date, -- Para períodos (ex: inscrição de X a Y)
  official_url text, -- Link oficial do evento
  notes text, -- Texto adicional / observações
  alert_days_before integer[] default '{1, 3, 7}',
  source text default 'manual' check (source in ('manual', 'scraped')),
  scraped_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Tabela de alertas do usuário
create table if not exists user_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  vestibular_id uuid references vestibulares(id) on delete cascade,
  channels text[] default '{"email"}',
  event_types text[] default null, -- NULL = todos os tipos; array = tipos selecionados
  active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(user_id, vestibular_id)
);

-- Tabela de logs de alertas
create table if not exists alert_logs (
  id uuid primary key default gen_random_uuid(),
  user_alert_id uuid references user_alerts(id) on delete cascade,
  important_date_id uuid references important_dates(id) on delete cascade,
  channel text not null check (channel in ('email', 'sms', 'whatsapp')),
  status text check (status in ('sent', 'failed', 'pending')) default 'pending',
  sent_at timestamp with time zone default now(),
  error_message text
);

-- Tabela de assinaturas
create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  mercadopago_payment_id text unique,
  mercadopago_preference_id text,
  plan_type text not null check (plan_type in ('basic', 'premium')),
  amount decimal(10,2),
  status text check (status in ('pending', 'approved', 'rejected', 'refunded')) default 'pending',
  expires_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

-- Colunas de verificação de canais (execute se já tiver a tabela profiles)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_verified boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_verified boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS whatsapp_verified boolean DEFAULT false;

-- Tabela de códigos de verificação
CREATE TABLE IF NOT EXISTS verification_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('email', 'sms', 'whatsapp')),
  code text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  used boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_verification_codes_user ON verification_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_codes_lookup ON verification_codes(user_id, channel, code);

-- =============================================
-- Índices para performance
-- =============================================
create index if not exists idx_important_dates_vestibular on important_dates(vestibular_id);
create index if not exists idx_important_dates_date on important_dates(event_date);
create index if not exists idx_user_alerts_user on user_alerts(user_id);
create index if not exists idx_user_alerts_vestibular on user_alerts(vestibular_id);
create index if not exists idx_alert_logs_user_alert on alert_logs(user_alert_id);
create index if not exists idx_subscriptions_user on subscriptions(user_id);
create index if not exists idx_profiles_plan on profiles(plan_type);

-- =============================================
-- Row Level Security (RLS)
-- =============================================

-- Habilitar RLS
alter table profiles enable row level security;
alter table vestibulares enable row level security;
alter table important_dates enable row level security;
alter table user_alerts enable row level security;
alter table alert_logs enable row level security;
alter table subscriptions enable row level security;

-- Policies para profiles
create policy "Users can view own profile" on profiles
  for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id);

-- Policies para vestibulares (leitura pública)
create policy "Anyone can view active vestibulares" on vestibulares
  for select using (active = true);
create policy "Admins can manage vestibulares" on vestibulares
  for all using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

-- Policies para important_dates (leitura pública)
create policy "Anyone can view important dates" on important_dates
  for select using (true);
create policy "Admins can manage important dates" on important_dates
  for all using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

-- Policies para user_alerts
create policy "Users can view own alerts" on user_alerts
  for select using (auth.uid() = user_id);
create policy "Users can create own alerts" on user_alerts
  for insert with check (auth.uid() = user_id);
create policy "Users can update own alerts" on user_alerts
  for update using (auth.uid() = user_id);
create policy "Users can delete own alerts" on user_alerts
  for delete using (auth.uid() = user_id);

-- Policies para alert_logs
create policy "Users can view own alert logs" on alert_logs
  for select using (
    exists (select 1 from user_alerts where id = alert_logs.user_alert_id and user_id = auth.uid())
  );

-- Policies para subscriptions
create policy "Users can view own subscriptions" on subscriptions
  for select using (auth.uid() = user_id);

-- =============================================
-- Functions e Triggers
-- =============================================

-- Trigger para criar profile automaticamente no signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, plan_type)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    'free'
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Function para atualizar updated_at
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_profiles_updated_at before update on profiles
  for each row execute function update_updated_at_column();
create trigger update_vestibulares_updated_at before update on vestibulares
  for each row execute function update_updated_at_column();
create trigger update_important_dates_updated_at before update on important_dates
  for each row execute function update_updated_at_column();
create trigger update_user_alerts_updated_at before update on user_alerts
  for each row execute function update_updated_at_column();

-- =============================================
-- Dados iniciais - Vestibulares
-- =============================================
insert into vestibulares (name, slug, description, official_url) values
  ('ENEM', 'enem', 'Exame Nacional do Ensino Médio', 'https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/enem'),
  ('Provão Paulista', 'provao-paulista', 'Provão Paulista Seriado', 'https://www.educacao.sp.gov.br/provao-paulista'),
  ('ProUni', 'prouni', 'Programa Universidade para Todos', 'https://prouniportal.mec.gov.br'),
  ('FIES', 'fies', 'Fundo de Financiamento Estudantil', 'https://fies.mec.gov.br'),
  ('FUVEST', 'fuvest', 'Fundação Universitária para o Vestibular', 'https://www.fuvest.br'),
  ('UNICAMP', 'unicamp', 'Vestibular Unicamp', 'https://www.comvest.unicamp.br'),
  ('UNESP', 'unesp', 'Vestibular Vunesp/Unesp', 'https://www.vunesp.com.br'),
  ('ITA', 'ita', 'Instituto Tecnológico de Aeronáutica', 'http://www.ita.br'),
  ('IME', 'ime', 'Instituto Militar de Engenharia', 'http://www.ime.eb.mil.br'),
  ('UERJ', 'uerj', 'Universidade do Estado do Rio de Janeiro', 'https://www.vestibular.uerj.br'),
  ('UFMG', 'ufmg', 'Universidade Federal de Minas Gerais', 'https://www.ufmg.br/copeve'),
  ('UFRGS', 'ufrgs', 'Universidade Federal do Rio Grande do Sul', 'https://www.ufrgs.br/coperse'),
  ('SiSU', 'sisu', 'Sistema de Seleção Unificada', 'https://sisu.mec.gov.br'),
  ('ENCCEJA', 'encceja', 'Exame Nacional para Certificação de Competências', 'https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/encceja')
on conflict (slug) do nothing;
