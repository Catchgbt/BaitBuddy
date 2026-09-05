#!/usr/bin/env node
// Kopiert alle Dateien aus dem Cloud-Bucket "catches" in den lokalen Storage.
// Nutzt die Storage-API beider Seiten (kein DB-Zugriff noetig).
//
//   CLOUD_SERVICE_ROLE_KEY=... LOCAL_SERVICE_ROLE_KEY=... \
//   node docker/scripts/migrate-storage.mjs
//
// Optional: CLOUD_URL (Default: Cloud-Projekt), LOCAL_URL (Default http://localhost:8000),
// BUCKET (Default catches). Laeuft idempotent (upsert).
import { createClient } from '@supabase/supabase-js';

const CLOUD_URL = process.env.CLOUD_URL || 'https://yejiqenqdzupauddjcyi.supabase.co';
const LOCAL_URL = process.env.LOCAL_URL || 'http://localhost:8000';
const BUCKET = process.env.BUCKET || 'catches';
const cloudKey = process.env.CLOUD_SERVICE_ROLE_KEY;
const localKey = process.env.LOCAL_SERVICE_ROLE_KEY;

if (!cloudKey || !localKey) {
  console.error('CLOUD_SERVICE_ROLE_KEY und LOCAL_SERVICE_ROLE_KEY muessen gesetzt sein');
  process.exit(1);
}

const cloud = createClient(CLOUD_URL, cloudKey, { auth: { persistSession: false } });
const local = createClient(LOCAL_URL, localKey, { auth: { persistSession: false } });

async function listAll(client, prefix = '') {
  const out = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await client.storage.from(BUCKET).list(prefix, { limit: 1000, offset });
    if (error) throw error;
    for (const entry of data) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      // Ordner haben keine id
      if (entry.id) out.push(path);
      else out.push(...(await listAll(client, path)));
    }
    if (data.length < 1000) break;
    offset += 1000;
  }
  return out;
}

const { data: buckets } = await local.storage.listBuckets();
if (!buckets?.some((b) => b.name === BUCKET)) {
  const { error } = await local.storage.createBucket(BUCKET, { public: true });
  if (error) throw error;
  console.log(`Bucket ${BUCKET} lokal angelegt`);
}

const files = await listAll(cloud);
console.log(`${files.length} Dateien im Cloud-Bucket ${BUCKET}`);

let ok = 0;
for (const path of files) {
  const { data, error } = await cloud.storage.from(BUCKET).download(path);
  if (error) {
    console.error(`Download fehlgeschlagen: ${path}: ${error.message}`);
    continue;
  }
  const { error: upErr } = await local.storage
    .from(BUCKET)
    .upload(path, data, { upsert: true, contentType: data.type || 'application/octet-stream' });
  if (upErr) {
    console.error(`Upload fehlgeschlagen: ${path}: ${upErr.message}`);
    continue;
  }
  ok += 1;
  console.log(`${ok}/${files.length} ${path}`);
}
console.log(`Fertig: ${ok} von ${files.length} Dateien kopiert`);
if (ok !== files.length) process.exit(1);
