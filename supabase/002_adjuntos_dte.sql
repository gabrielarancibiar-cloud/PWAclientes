alter table public.clientes_solicitudes
  add column if not exists tipo_solicitud text not null default 'Creación de cliente',
  add column if not exists folio_dte text,
  add column if not exists observacion text,
  add column if not exists adjunto_foto_bucket text,
  add column if not exists adjunto_foto_path text,
  add column if not exists adjunto_foto_nombre text,
  add column if not exists adjunto_foto_tipo text,
  add column if not exists adjunto_foto_size integer;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'clientes-respaldos',
  'clientes-respaldos',
  false,
  3145728,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create index if not exists clientes_solicitudes_tipo_solicitud_idx
  on public.clientes_solicitudes (tipo_solicitud);
