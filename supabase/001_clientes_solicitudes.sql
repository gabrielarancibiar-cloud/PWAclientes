-- =========================================================
-- VALEPAC - PWA Formulario Creación de Clientes
-- Tabla de solicitudes recibidas desde QR/PWA
-- Ejecutar en Supabase > SQL Editor
-- =========================================================

create extension if not exists pgcrypto;

create table if not exists public.clientes_solicitudes (
  id uuid primary key default gen_random_uuid(),
  rut_empresa text not null,
  razon_social text not null,
  giro text not null,
  telefono text not null,
  direccion text not null,
  comuna text not null,
  mail text not null,
  nombre_contacto text not null,
  estado text not null default 'Pendiente',
  origen text not null default 'PWA QR',
  observaciones text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint clientes_solicitudes_estado_check
  check (estado in ('Pendiente', 'En revisión', 'Aprobado', 'Rechazado', 'Observado'))
);

create index if not exists idx_clientes_solicitudes_created_at
on public.clientes_solicitudes (created_at desc);

create index if not exists idx_clientes_solicitudes_estado
on public.clientes_solicitudes (estado);

create index if not exists idx_clientes_solicitudes_rut_empresa
on public.clientes_solicitudes (rut_empresa);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_clientes_solicitudes_updated_at on public.clientes_solicitudes;

create trigger trg_clientes_solicitudes_updated_at
before update on public.clientes_solicitudes
for each row
execute function public.set_updated_at();

-- Seguridad:
-- La PWA NO escribe directo con anon key.
-- Escribe mediante /api/crear-cliente usando SUPABASE_SERVICE_ROLE_KEY en Vercel.
-- Por eso dejamos RLS activo y sin políticas públicas.

alter table public.clientes_solicitudes enable row level security;

-- No crear política pública de INSERT.
-- El service role de Supabase puede insertar igual, saltándose RLS.
