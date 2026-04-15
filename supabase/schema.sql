-- Esquema Definitivo Fase 4/5: Súper-App Barrio Cerrado

create extension if not exists "uuid-ossp";

-- 1. Tabla de Perfiles (Propietarios, Inquilinos, Guardias)
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text not null,
  full_name text not null,
  dni text not null,
  role text check (role in ('owner', 'guard', 'admin')) default 'owner',
  lote text,
  status text check (status in ('pending', 'active', 'rejected')) default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.profiles enable row level security;

-- Políticas de Profiles
create policy "Usuarios ven su propio perfil" on public.profiles
  for select using (auth.uid() = id);

create policy "Usuarios se registran a sí mismos" on public.profiles
  for insert with check (auth.uid() = id);

create policy "La Guardia ve a todos (para autorizar)" on public.profiles
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'guard')
  );

create policy "La Guardia autoriza perfiles" on public.profiles
  for update using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'guard')
  );


-- 2. Tabla de Invitaciones
create table public.invitations (
  id uuid default uuid_generate_v4() primary key,
  owner_id uuid references public.profiles(id) on delete cascade not null,
  visitor_name text not null,
  expected_date date not null,
  active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.invitations enable row level security;

-- Políticas de Invitaciones
create policy "Propietarios ven sus invitaciones" on public.invitations
  for select using (auth.uid() = owner_id);

create policy "Propietarios crean invitaciones" on public.invitations
  for insert with check (auth.uid() = owner_id);

create policy "La Guardia ve todas las invitaciones" on public.invitations
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'guard')
  );

create policy "Visitantes (anónimos) ven sus invitaciones vía URL" on public.invitations
  for select using (true);

create policy "Propietarios borran sus invitaciones" on public.invitations
  for delete using (auth.uid() = owner_id);


-- 3. Tabla de Registro Biométrico del Visitante
create table public.visitor_records (
  id uuid default uuid_generate_v4() primary key,
  invitation_id uuid references public.invitations(id) on delete cascade not null unique,
  full_name text not null,
  dni text not null,
  dni_front_url text not null, -- Guardaremos el Base64 puro o URL del Storage
  selfie_url text not null,
  status text check (status in ('pending', 'approved', 'denied')) default 'pending',
  similarity_score numeric,
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  entry_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.visitor_records enable row level security;

-- Políticas Biométricas
create policy "Visitantes suben sus fotos faciales" on public.visitor_records
  for insert with check (true);

create policy "La Guardia lee el registro de todos" on public.visitor_records
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'guard')
  );
  
create policy "La Guardia actualiza status tras escaneo" on public.visitor_records
  for update using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'guard')
  );

create policy "Propietarios borran sus propios visitor_records" on public.visitor_records
  for delete using (
    exists (
      select 1 from public.invitations i
      where i.id = public.visitor_records.invitation_id
      and i.owner_id = auth.uid()
    )
  );

