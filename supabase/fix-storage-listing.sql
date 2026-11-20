-- Corrige el aviso "Clients can list all files in this bucket".
-- Ejecutar una vez en Supabase → SQL Editor.
drop policy if exists "public read photos bucket" on storage.objects;
drop policy if exists "admin read photos bucket" on storage.objects;
create policy "admin read photos bucket" on storage.objects
  for select to authenticated using (bucket_id = 'photos');
