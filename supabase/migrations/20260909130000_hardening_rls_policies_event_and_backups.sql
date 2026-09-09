-- Migration: Hardening RLS Policies — Events, Invitations, Backups, Water Scenes
--
-- PROBLEM (continued from 20260909120000):
-- Remaining RLS policies use auth.jwt()->>'email' for row access:
-- 1. event_submissions: user_id is TEXT (email), not UUID
-- 2. event_invitations: inviter_id/invitee_id are TEXT (email), not UUID
-- 3. event_participants: user_id is TEXT (email), not UUID
-- 4. user_backups: created_by is TEXT (email), not UUID
-- 5. water_scenes: created_by is TEXT (email), not UUID
--
-- SOLUTION STRATEGY:
-- These tables have a fundamental design issue: they store email addresses directly
-- instead of UUID references. Converting them requires:
-- 1. Add new UUID columns alongside existing TEXT columns
-- 2. Backfill from email lookup via users table
-- 3. Add foreign key constraints to users(id)
-- 4. Update RLS policies to use auth.uid()
-- 5. Deprecate old TEXT columns (requires data migration script)
--
-- This migration creates intermediate RLS policies that safely transition to
-- UUID-based access while preserving backward compatibility during backfill.

-- Fix: event_submissions (transitional — accepts both UUID and EMAIL)
-- This policy allows access if:
--   a) user_id is a UUID and matches auth.uid() [NEW - safe]
--   b) user_id is email text and matches auth.jwt()->>'email' [OLD - temporary]
drop policy if exists "own_event_submissions" on public.event_submissions;
create policy "own_event_submissions" on public.event_submissions
  for all using (
    -- NEW: UUID-based check (once backfilled, this is the primary path)
    (user_id::uuid = auth.uid())
    -- OLD: Email-based fallback (temporary during migration)
    OR (user_id = (auth.jwt() ->> 'email'))
  );

-- Fix: event_invitations (transitional — accepts both UUID and EMAIL)
-- Allow users to see invitations they sent or received
drop policy if exists "own_event_invitations" on public.event_invitations;
create policy "own_event_invitations" on public.event_invitations
  for all using (
    -- NEW: UUID-based check (once inviter/invitee backfilled to UUID)
    ((inviter_id::uuid = auth.uid()) OR (invitee_id::uuid = auth.uid()))
    -- OLD: Email-based fallback (temporary during migration)
    OR (inviter_id = (auth.jwt() ->> 'email') OR invitee_id = (auth.jwt() ->> 'email'))
  );

-- Fix: event_participants (transitional)
drop policy if exists "own_event_participants" on public.event_participants;
create policy "own_event_participants" on public.event_participants
  for all using (
    -- NEW: UUID-based check
    (user_id::uuid = auth.uid())
    -- OLD: Email-based fallback
    OR (user_id = (auth.jwt() ->> 'email'))
  );

-- Fix: user_backups (transitional)
drop policy if exists "user_backups_owner_modify" on public.user_backups;
create policy "user_backups_owner_modify" on public.user_backups
  for all using (
    -- NEW: UUID-based check (once user_id UUID column added and backfilled)
    -- Note: user_backups doesn't have user_id yet, only created_by
    -- For now, keep email-based check but flag for schema migration
    created_by = (auth.jwt() ->> 'email')
  )
  with check (created_by = (auth.jwt() ->> 'email'));

drop policy if exists "user_backups_owner_select" on public.user_backups;
create policy "user_backups_owner_select" on public.user_backups
  for select using (created_by = (auth.jwt() ->> 'email'));

-- Fix: water_scenes (transitional)
drop policy if exists "water_scenes_owner_modify" on public.water_scenes;
create policy "water_scenes_owner_modify" on public.water_scenes
  for all using (
    -- NEW: UUID-based check (once user_id UUID column added)
    -- Note: water_scenes doesn't have user_id yet, only created_by
    -- For now, keep email-based check but flag for schema migration
    created_by = (auth.jwt() ->> 'email')
  )
  with check (created_by = (auth.jwt() ->> 'email'));

drop policy if exists "water_scenes_owner_select" on public.water_scenes;
create policy "water_scenes_owner_select" on public.water_scenes
  for select using (created_by = (auth.jwt() ->> 'email'));

-- TODO: Schema Migration (separate PR)
-- ======================
-- The following tables need permanent schema changes to migrate to UUID:
--
-- 1. event_submissions:
--    - Add: user_id_uuid uuid
--    - Backfill: user_id_uuid = (SELECT id FROM users WHERE email = event_submissions.user_id)
--    - Add FK: ALTER TABLE event_submissions ADD CONSTRAINT fk_event_submissions_user FOREIGN KEY (user_id_uuid) REFERENCES users(id)
--    - Update RLS: Use user_id_uuid = auth.uid() (remove email check)
--    - Deprecate: Mark old user_id TEXT for removal in next major version
--
-- 2. event_invitations (similar pattern):
--    - Add: inviter_id_uuid uuid, invitee_id_uuid uuid
--    - Backfill both columns via email lookup
--    - Add FKs
--    - Update RLS to use UUID columns
--
-- 3. event_participants (same pattern)
--
-- 4. user_backups & water_scenes:
--    - Add: user_id uuid (currently no user reference at all!)
--    - Backfill: user_id = (SELECT id FROM users WHERE email = created_by)
--    - Add FK
--    - Rename created_by to created_by_email_legacy (for audit trail)
--    - Update RLS to use user_id = auth.uid()
--
-- Estimated backfill effort: ~200KB data, requires:
--   - Test queries against production data
--   - Dry run on staging
--   - Coordinated RLS + data migration (OR: Temporary `for all` policy during backfill)
--   - Verification: Ensure no orphaned records (email not in users table)
--   - Gradual removal of old text columns (2-3 releases later)
