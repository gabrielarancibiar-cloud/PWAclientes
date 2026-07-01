alter table public.clientes_solicitudes
  add column if not exists tipo_vehiculo text,
  add column if not exists patente text;

create index if not exists clientes_solicitudes_patente_idx
  on public.clientes_solicitudes (patente);
