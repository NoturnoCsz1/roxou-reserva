
-- Enum de papéis
create type public.app_role as enum ('admin', 'passenger');

-- Enum de status do motorista
create type public.driver_state as enum ('online', 'busy', 'offline');

-- Enum de status da reserva
create type public.ride_status as enum (
  'pending', 'approved', 'rejected', 'paid', 'confirmed',
  'in_progress', 'completed', 'cancelled'
);

-- Enum tipo de viagem
create type public.trip_type as enum ('one_way', 'round_trip');

-- profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create policy "profiles self select" on public.profiles
  for select to authenticated using (auth.uid() = id);
create policy "profiles self update" on public.profiles
  for update to authenticated using (auth.uid() = id);
create policy "profiles self insert" on public.profiles
  for insert to authenticated with check (auth.uid() = id);

-- user_roles
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  unique (user_id, role)
);

grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create policy "user_roles read own" on public.user_roles
  for select to authenticated using (user_id = auth.uid());

-- has_role
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- Admin can see all profiles
create policy "profiles admin read all" on public.profiles
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- driver_status (singleton row)
create table public.driver_status (
  id int primary key default 1,
  status driver_state not null default 'offline',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  constraint driver_status_singleton check (id = 1)
);

insert into public.driver_status (id, status) values (1, 'offline');

grant select on public.driver_status to anon, authenticated;
grant update on public.driver_status to authenticated;
grant all on public.driver_status to service_role;
alter table public.driver_status enable row level security;

create policy "driver_status read all" on public.driver_status
  for select to anon, authenticated using (true);
create policy "driver_status admin update" on public.driver_status
  for update to authenticated using (public.has_role(auth.uid(), 'admin'));

-- ride_settings (config)
create table public.ride_settings (
  id int primary key default 1,
  price_per_km numeric not null default 2.50,
  reservation_fee numeric not null default 20.00,
  min_price numeric not null default 30.00,
  max_passengers int not null default 4,
  updated_at timestamptz not null default now(),
  constraint ride_settings_singleton check (id = 1)
);

insert into public.ride_settings (id) values (1);

grant select on public.ride_settings to anon, authenticated;
grant update on public.ride_settings to authenticated;
grant all on public.ride_settings to service_role;
alter table public.ride_settings enable row level security;

create policy "ride_settings read all" on public.ride_settings
  for select to anon, authenticated using (true);
create policy "ride_settings admin update" on public.ride_settings
  for update to authenticated using (public.has_role(auth.uid(), 'admin'));

-- ride_requests
create table public.ride_requests (
  id uuid primary key default gen_random_uuid(),
  passenger_id uuid not null references auth.users(id) on delete cascade,
  origin text not null,
  destination text not null,
  ride_date date not null,
  ride_time time not null,
  distance_km numeric not null,
  trip_type trip_type not null default 'one_way',
  passenger_count int not null default 1,
  notes text,
  estimated_price numeric not null,
  final_price numeric,
  status ride_status not null default 'pending',
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.ride_requests to authenticated;
grant all on public.ride_requests to service_role;
alter table public.ride_requests enable row level security;

create policy "rides passenger select own" on public.ride_requests
  for select to authenticated using (passenger_id = auth.uid());
create policy "rides passenger insert own" on public.ride_requests
  for insert to authenticated with check (passenger_id = auth.uid());
create policy "rides passenger update own pending" on public.ride_requests
  for update to authenticated using (passenger_id = auth.uid());
create policy "rides admin select all" on public.ride_requests
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "rides admin update all" on public.ride_requests
  for update to authenticated using (public.has_role(auth.uid(), 'admin'));

-- ride_messages
create table public.ride_messages (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid not null references public.ride_requests(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

grant select, insert on public.ride_messages to authenticated;
grant all on public.ride_messages to service_role;
alter table public.ride_messages enable row level security;

create policy "msgs passenger read own ride" on public.ride_messages
  for select to authenticated using (
    exists (select 1 from public.ride_requests r where r.id = ride_id and r.passenger_id = auth.uid())
  );
create policy "msgs admin read all" on public.ride_messages
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "msgs passenger insert own ride" on public.ride_messages
  for insert to authenticated with check (
    sender_id = auth.uid()
    and exists (select 1 from public.ride_requests r where r.id = ride_id and r.passenger_id = auth.uid())
  );
create policy "msgs admin insert any" on public.ride_messages
  for insert to authenticated with check (
    sender_id = auth.uid() and public.has_role(auth.uid(), 'admin')
  );

-- Trigger: criar profile + role ao criar usuário
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', new.email),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;

  if new.email = 'contato.fh3@gmail.com' then
    insert into public.user_roles (user_id, role) values (new.id, 'admin')
    on conflict do nothing;
  else
    insert into public.user_roles (user_id, role) values (new.id, 'passenger')
    on conflict do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at trigger
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger touch_ride_requests
  before update on public.ride_requests
  for each row execute function public.touch_updated_at();

-- Realtime
alter publication supabase_realtime add table public.ride_messages;
alter publication supabase_realtime add table public.ride_requests;
alter publication supabase_realtime add table public.driver_status;
