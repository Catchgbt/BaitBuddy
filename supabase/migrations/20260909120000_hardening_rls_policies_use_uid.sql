-- Migration: Hardening RLS Policies - Use auth.uid() instead of email
--
-- PROBLEM: Many RLS policies currently use auth.jwt()->>'email' to determine row
-- access. This is vulnerable because:
-- 1. Email addresses can be changed by users or admins
-- 2. Email is not guaranteed to be unique across time
-- 3. Future email reuse could grant access to wrong users
--
-- SOLUTION: Use auth.uid() which returns the stable, immutable UUID from Supabase Auth.
--
-- SCOPE: This migration addresses tables that use user_id columns. Tables with
-- created_by (text) columns require separate schema migration and are documented
-- in the RLS_HARDENING_TRACKING spreadsheet.
--
-- AFFECTED TABLES (using user_id columns - safe to update):
-- - user_referral_codes (✅ use auth.uid())
-- - referrals (✅ use auth.uid())
-- - reward_activations (partially)
-- - dashboard_account_notes (✅ use auth.uid())
-- - clan_members (✅ use auth.uid())
--
-- TABLES REQUIRING SCHEMA CHANGE (not in this migration):
-- - catches (uses created_by text - needs schema migration)
-- - spots (uses created_by text - needs schema migration)
-- - events (uses created_by text - needs schema migration)
-- - event_submissions (uses user_id text - needs verification)
-- - community_comments (uses author_id - needs verification)
-- - water_scenes (uses created_by text - needs schema migration)

-- Fix: reward_activations
-- Currently: using auth.jwt()->>'email'
-- Should: use auth.uid() since user_id is uuid
drop policy if exists "own_rewards" on reward_activations;
create policy "own_rewards" on reward_activations
  for select using (user_id = auth.uid());

-- Fix: clan_members
-- Currently: using auth.jwt()->>'email' (vulnerable)
-- Should: use auth.uid() since user_id is uuid
drop policy if exists "own_clan_membership" on clan_members;
create policy "own_clan_membership" on clan_members
  for select using (user_id = auth.uid());

-- Ensure referrals table is using UUID-based policies
-- (should already be correct, but enforce here for consistency)
drop policy if exists "own_referrals_read" on referrals;
create policy "own_referrals_read" on referrals
  for select using (auth.uid() = referrer_user_id or auth.uid() = referred_user_id);

-- Ensure user_referral_codes is using UUID-based policy
drop policy if exists "own_referral_code_read" on user_referral_codes;
create policy "own_referral_code_read" on user_referral_codes
  for select using (auth.uid() = user_id);

-- TODO: Create follow-up migration for tables using text columns:
-- 1. Alter catches, spots, events, event_submissions, community_comments, water_scenes
--    to use user_id uuid instead of created_by/author_id text
-- 2. Backfill user_id from a users table lookup (requires data migration script)
-- 3. Update RLS policies to use auth.uid()
-- 4. Drop old created_by/author_id columns
--
-- Estimated scope: ~200KB data affected, requires careful backfill and testing
