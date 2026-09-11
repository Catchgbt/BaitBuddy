# Windows-Variante von finalize.sh (gleiche Wirkung, ohne Git-Bash).
#
# Setzt nach dem ersten "docker compose up" die beiden Dinge nach, die an
# Tabellen haengen, welche erst die Dienste selbst anlegen:
#   - Trigger trg_set_trial_premium auf auth.users  (GoTrue-Migrationen)
#   - Bucket "catches" in storage.buckets           (storage-api-Migrationen)
# Mehrfaches Ausfuehren ist unschaedlich.
#
#   powershell -File docker/scripts/finalize.ps1

$ErrorActionPreference = 'Stop'
$container = if ($env:CONTAINER) { $env:CONTAINER } else { 'baitbuddy-db' }

function Invoke-Psql([string]$sql) {
  docker exec $container psql -U postgres -d postgres -tAc $sql
}

Write-Host "Warte auf auth.users und storage.buckets ..."
$ready = 'f'
for ($i = 0; $i -lt 60; $i++) {
  $ready = (Invoke-Psql "select (to_regclass('auth.users') is not null and to_regclass('storage.buckets') is not null)::text").Trim()
  if ($ready -eq 't') { break }
  Start-Sleep -Seconds 2
}
if ($ready -ne 't') {
  Write-Error "auth.users / storage.buckets nach 2 Minuten nicht da. Laufen 'auth' und 'storage'? -> docker compose ps"
  exit 1
}

Write-Host "Trigger trg_set_trial_premium setzen und Bucket 'catches' anlegen"
docker exec $container psql -U postgres -d postgres -v ON_ERROR_STOP=1 --quiet -c @'
drop trigger if exists trg_set_trial_premium on auth.users;
create trigger trg_set_trial_premium
  before insert on auth.users
  for each row execute function public.set_trial_premium();
insert into storage.buckets (id, name, public)
values ('catches', 'catches', true)
on conflict (id) do update set public = excluded.public;
'@

Write-Host ""
Write-Host "Kontrolle:"
Write-Host ("  Trigger: " + (Invoke-Psql "select count(*) from pg_trigger where tgname='trg_set_trial_premium'").Trim())
Write-Host ("  Buckets: " + (Invoke-Psql "select string_agg(id||' (public='||public||')', ', ') from storage.buckets").Trim())
Write-Host "Fertig."
