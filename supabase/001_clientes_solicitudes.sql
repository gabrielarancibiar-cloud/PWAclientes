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
  tipo_vehiculo text,
  patente text,
  estado text not null default 'Pendiente',
  origen text not null default 'PWA QR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists clientes_solicitudes_created_at_idx
  on public.clientes_solicitudes (created_at desc);

create index if not exists clientes_solicitudes_estado_idx
  on public.clientes_solicitudes (estado);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_clientes_solicitudes_updated_at on public.clientes_solicitudes;

create trigger set_clientes_solicitudes_updated_at
before update on public.clientes_solicitudes
for each row
execute function public.set_updated_at();

alter table public.clientes_solicitudes enable row level security;

-- No se crea política pública.
-- La PWA envía datos a /api/crear-cliente y esa API usa SUPABASE_SERVICE_ROLE_KEY.
-- Así evitamos exposición directa de la tabla al navegador.
