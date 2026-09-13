-- =========================================================
-- CREDIPRO — Fase 1: Core (organizations, profiles, roles)
-- =========================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------
-- 1. ORGANIZATIONS
-- ---------------------------------------------------------
create table public.organizations (
  id                uuid primary key default gen_random_uuid(),
  commercial_name    text not null,
  legal_name         text,
  tax_id             text,
  phone              text,
  email              text,
  address            text,
  country            text default 'CO',
  city               text,
  currency           text default 'COP',
  timezone           text default 'America/Bogota',
  logo_url           text,
  default_interest_rate     numeric(6,3),
  default_interest_modality text, -- 'saldo_pendiente' | 'capital_inicial' | 'fijo'
  default_grace_days        int default 0,
  status             text not null default 'active', -- active | suspended
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

comment on table public.organizations is 'Cada empresa/prestamista que usa CrediPro (tenant).';

-- ---------------------------------------------------------
-- 2. PROFILES (extiende auth.users)
-- ---------------------------------------------------------
create table public.profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  organization_id    uuid references public.organizations(id) on delete set null,
  full_name          text,
  email              text,
  phone              text,
  is_platform_admin  boolean not null default false,
  status             text not null default 'active', -- active | invited | disabled
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

comment on table public.profiles is 'Datos de cada usuario. is_platform_admin = administrador general de CrediPro (no de una organización).';

-- Crear profile automáticamente cuando se registra un usuario en auth.users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------
-- 3. ROLES / PERMISSIONS (RBAC)
-- ---------------------------------------------------------
create table public.roles (
  id            serial primary key,
  key           text not null unique, -- admin | gerente | cobrador | contador
  name          text not null,
  description   text
);

create table public.permissions (
  id            serial primary key,
  key           text not null unique, -- clients.write | loans.approve | reports.read ...
  description   text
);

create table public.role_permissions (
  role_id        int not null references public.roles(id) on delete cascade,
  permission_id  int not null references public.permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

-- Rol de un usuario dentro de una organización específica
-- (un usuario podría en el futuro pertenecer a más de una organización)
create table public.user_roles (
  id                uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  organization_id    uuid not null references public.organizations(id) on delete cascade,
  role_id            int not null references public.roles(id) on delete restrict,
  created_at         timestamptz not null default now(),
  unique (user_id, organization_id, role_id)
);

-- Seed de roles base
insert into public.roles (key, name, description) values
  ('admin',    'Administrador',  'Acceso total a la organización'),
  ('gerente',  'Gerente',        'Clientes, préstamos, reportes, dashboard'),
  ('cobrador', 'Cobrador',       'Clientes asignados, registrar pagos, cobranza'),
  ('contador', 'Contador',       'Pagos, reportes, movimientos (solo lectura)');

-- Seed de permisos base (se irán ampliando en fases siguientes)
insert into public.permissions (key, description) values
  ('clients.read',   'Ver clientes'),
  ('clients.write',  'Crear/editar clientes'),
  ('loans.read',     'Ver préstamos'),
  ('loans.write',    'Crear/editar préstamos'),
  ('loans.approve',  'Aprobar préstamos'),
  ('payments.write', 'Registrar pagos'),
  ('reports.read',   'Ver reportes'),
  ('settings.write', 'Editar configuración de la organización'),
  ('users.manage',   'Gestionar usuarios y roles de la organización');

-- Admin: todos los permisos
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r cross join public.permissions p where r.key = 'admin';

-- Gerente: todo menos gestión de usuarios y configuración
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r cross join public.permissions p
where r.key = 'gerente' and p.key not in ('users.manage', 'settings.write');

-- Cobrador: clientes (lectura), pagos, cobranza
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r cross join public.permissions p
where r.key = 'cobrador' and p.key in ('clients.read', 'loans.read', 'payments.write');

-- Contador: solo lectura
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r cross join public.permissions p
where r.key = 'contador' and p.key in ('loans.read', 'payments.write', 'reports.read');

-- ---------------------------------------------------------
-- 4. FUNCIONES HELPER (usadas por las políticas RLS)
-- ---------------------------------------------------------

-- Organización del usuario autenticado
create or replace function public.current_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id from public.profiles where id = auth.uid();
$$;

-- ¿Es administrador general de la plataforma?
create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_platform_admin from public.profiles where id = auth.uid()), false);
$$;

-- ¿El usuario tiene este permiso en su organización actual?
create or replace function public.has_permission(permission_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.role_permissions rp on rp.role_id = ur.role_id
    join public.permissions p on p.id = rp.permission_id
    where ur.user_id = auth.uid()
      and ur.organization_id = public.current_organization_id()
      and p.key = permission_key
  );
$$;

-- ---------------------------------------------------------
-- 5. RPC: crear organización + asignar owner (onboarding)
-- ---------------------------------------------------------
create or replace function public.create_organization(
  p_commercial_name text,
  p_legal_name text default null,
  p_tax_id text default null,
  p_phone text default null,
  p_email text default null,
  p_country text default 'CO',
  p_city text default null,
  p_currency text default 'COP'
)
returns public.organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org public.organizations;
  v_admin_role_id int;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  if (select organization_id from public.profiles where id = auth.uid()) is not null then
    raise exception 'El usuario ya pertenece a una organización';
  end if;

  insert into public.organizations (commercial_name, legal_name, tax_id, phone, email, country, city, currency)
  values (p_commercial_name, p_legal_name, p_tax_id, p_phone, p_email, p_country, p_city, p_currency)
  returning * into v_org;

  update public.profiles
     set organization_id = v_org.id, updated_at = now()
   where id = auth.uid();

  select id into v_admin_role_id from public.roles where key = 'admin';

  insert into public.user_roles (user_id, organization_id, role_id)
  values (auth.uid(), v_org.id, v_admin_role_id);

  return v_org;
end;
$$;

-- ---------------------------------------------------------
-- 6. RLS
-- ---------------------------------------------------------
alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_roles enable row level security;

-- organizations: solo ve/edita la propia; platform admin ve todas
create policy "organizations_select_own_or_platform_admin"
  on public.organizations for select
  using (id = public.current_organization_id() or public.is_platform_admin());

create policy "organizations_update_own_admin_or_platform"
  on public.organizations for update
  using (
    (id = public.current_organization_id() and public.has_permission('settings.write'))
    or public.is_platform_admin()
  );

-- Nota: no se crea policy de INSERT directo — la creación de organización
-- pasa siempre por la función create_organization() (security definer).

-- profiles: cada quien ve su propio perfil + los de su misma organización; platform admin ve todos
create policy "profiles_select_own_org_or_platform_admin"
  on public.profiles for select
  using (
    id = auth.uid()
    or organization_id = public.current_organization_id()
    or public.is_platform_admin()
  );

create policy "profiles_update_own"
  on public.profiles for update
  using (id = auth.uid());

-- roles / permissions / role_permissions: catálogo global de solo lectura para cualquier autenticado
create policy "roles_read_all_authenticated"
  on public.roles for select
  using (auth.role() = 'authenticated');

create policy "permissions_read_all_authenticated"
  on public.permissions for select
  using (auth.role() = 'authenticated');

create policy "role_permissions_read_all_authenticated"
  on public.role_permissions for select
  using (auth.role() = 'authenticated');

-- user_roles: solo se ven los de la propia organización; platform admin ve todos
create policy "user_roles_select_own_org_or_platform_admin"
  on public.user_roles for select
  using (organization_id = public.current_organization_id() or public.is_platform_admin());

create policy "user_roles_manage_own_org_admin"
  on public.user_roles for all
  using (
    (organization_id = public.current_organization_id() and public.has_permission('users.manage'))
    or public.is_platform_admin()
  );
