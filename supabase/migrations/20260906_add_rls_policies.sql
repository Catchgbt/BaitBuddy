-- Add comprehensive RLS policies for all tables with RLS enabled.
-- Uses auth.jwt() ->> 'email' for user identification.
-- Note: Tables have inconsistent column naming (created_by, user_id, user_email).
--       Using appropriate column for each table based on actual schema.

-- ============================================================================
-- OWNER-ONLY TABLES (created_by = email)
-- ============================================================================

create policy "catches_select_own" on public.catches
  for select using (created_by = auth.jwt() ->> 'email');
create policy "catches_insert_own" on public.catches
  for insert with check (created_by = auth.jwt() ->> 'email');
create policy "catches_update_own" on public.catches
  for update using (created_by = auth.jwt() ->> 'email');
create policy "catches_delete_own" on public.catches
  for delete using (created_by = auth.jwt() ->> 'email');

create policy "spots_select_own" on public.spots
  for select using (created_by = auth.jwt() ->> 'email');
create policy "spots_insert_own" on public.spots
  for insert with check (created_by = auth.jwt() ->> 'email');
create policy "spots_update_own" on public.spots
  for update using (created_by = auth.jwt() ->> 'email');
create policy "spots_delete_own" on public.spots
  for delete using (created_by = auth.jwt() ->> 'email');

create policy "spot_groups_select_own" on public.spot_groups
  for select using (user_id = (select id from auth.users where email = auth.jwt() ->> 'email'));
create policy "spot_groups_insert_own" on public.spot_groups
  for insert with check (user_id = (select id from auth.users where email = auth.jwt() ->> 'email'));
create policy "spot_groups_update_own" on public.spot_groups
  for update using (user_id = (select id from auth.users where email = auth.jwt() ->> 'email'));
create policy "spot_groups_delete_own" on public.spot_groups
  for delete using (user_id = (select id from auth.users where email = auth.jwt() ->> 'email'));

create policy "chat_sessions_select_own" on public.chat_sessions
  for select using (created_by = auth.jwt() ->> 'email');
create policy "chat_sessions_insert_own" on public.chat_sessions
  for insert with check (created_by = auth.jwt() ->> 'email');
create policy "chat_sessions_update_own" on public.chat_sessions
  for update using (created_by = auth.jwt() ->> 'email');
create policy "chat_sessions_delete_own" on public.chat_sessions
  for delete using (created_by = auth.jwt() ->> 'email');

create policy "chat_messages_select_own" on public.chat_messages
  for select using (created_by = auth.jwt() ->> 'email');
create policy "chat_messages_insert_own" on public.chat_messages
  for insert with check (created_by = auth.jwt() ->> 'email');
create policy "chat_messages_delete_own" on public.chat_messages
  for delete using (created_by = auth.jwt() ->> 'email');

create policy "fishing_plans_select_own" on public.fishing_plans
  for select using (created_by = auth.jwt() ->> 'email');
create policy "fishing_plans_insert_own" on public.fishing_plans
  for insert with check (created_by = auth.jwt() ->> 'email');
create policy "fishing_plans_update_own" on public.fishing_plans
  for update using (created_by = auth.jwt() ->> 'email');
create policy "fishing_plans_delete_own" on public.fishing_plans
  for delete using (created_by = auth.jwt() ->> 'email');

create policy "user_backups_select_own" on public.user_backups
  for select using (created_by = auth.jwt() ->> 'email');
create policy "user_backups_insert_own" on public.user_backups
  for insert with check (created_by = auth.jwt() ->> 'email');

create policy "gear_items_select_own" on public.gear_items
  for select using (created_by = auth.jwt() ->> 'email');
create policy "gear_items_insert_own" on public.gear_items
  for insert with check (created_by = auth.jwt() ->> 'email');
create policy "gear_items_update_own" on public.gear_items
  for update using (created_by = auth.jwt() ->> 'email');
create policy "gear_items_delete_own" on public.gear_items
  for delete using (created_by = auth.jwt() ->> 'email');

create policy "loadouts_select_own" on public.loadouts
  for select using (created_by = auth.jwt() ->> 'email');
create policy "loadouts_insert_own" on public.loadouts
  for insert with check (created_by = auth.jwt() ->> 'email');
create policy "loadouts_update_own" on public.loadouts
  for update using (created_by = auth.jwt() ->> 'email');
create policy "loadouts_delete_own" on public.loadouts
  for delete using (created_by = auth.jwt() ->> 'email');

create policy "bait_recipes_select_own" on public.bait_recipes
  for select using (user_email = auth.jwt() ->> 'email');
create policy "bait_recipes_insert_own" on public.bait_recipes
  for insert with check (user_email = auth.jwt() ->> 'email');
create policy "bait_recipes_update_own" on public.bait_recipes
  for update using (user_email = auth.jwt() ->> 'email');
create policy "bait_recipes_delete_own" on public.bait_recipes
  for delete using (user_email = auth.jwt() ->> 'email');

create policy "water_analysis_history_select_own" on public.water_analysis_history
  for select using (user_email = auth.jwt() ->> 'email');
create policy "water_analysis_history_insert_own" on public.water_analysis_history
  for insert with check (user_email = auth.jwt() ->> 'email');

create policy "pack_sessions_select_own" on public.pack_sessions
  for select using (created_by = auth.jwt() ->> 'email');
create policy "pack_sessions_insert_own" on public.pack_sessions
  for insert with check (created_by = auth.jwt() ->> 'email');
create policy "pack_sessions_update_own" on public.pack_sessions
  for update using (created_by = auth.jwt() ->> 'email');
create policy "pack_sessions_delete_own" on public.pack_sessions
  for delete using (created_by = auth.jwt() ->> 'email');

create policy "usage_sessions_select_own" on public.usage_sessions
  for select using (user_email = auth.jwt() ->> 'email');
create policy "usage_sessions_insert_own" on public.usage_sessions
  for insert with check (user_email = auth.jwt() ->> 'email');

-- ============================================================================
-- PUBLIC READ, OWNER WRITE TABLES
-- ============================================================================

create policy "community_posts_select_all" on public.community_posts
  for select using (true);
create policy "community_posts_insert_own" on public.community_posts
  for insert with check (created_by = auth.jwt() ->> 'email');
create policy "community_posts_update_own" on public.community_posts
  for update using (created_by = auth.jwt() ->> 'email');
create policy "community_posts_delete_own" on public.community_posts
  for delete using (created_by = auth.jwt() ->> 'email');

create policy "community_comments_select_all" on public.community_comments
  for select using (true);
create policy "community_comments_insert_own" on public.community_comments
  for insert with check (created_by = auth.jwt() ->> 'email');
create policy "community_comments_update_own" on public.community_comments
  for update using (created_by = auth.jwt() ->> 'email');
create policy "community_comments_delete_own" on public.community_comments
  for delete using (created_by = auth.jwt() ->> 'email');

create policy "posts_select_all" on public.posts
  for select using (true);
create policy "posts_insert_own" on public.posts
  for insert with check (user_id = (select id from auth.users where email = auth.jwt() ->> 'email'));
create policy "posts_update_own" on public.posts
  for update using (user_id = (select id from auth.users where email = auth.jwt() ->> 'email'));
create policy "posts_delete_own" on public.posts
  for delete using (user_id = (select id from auth.users where email = auth.jwt() ->> 'email'));

create policy "comments_select_all" on public.comments
  for select using (true);
create policy "comments_insert_own" on public.comments
  for insert with check (user_id = (select id from auth.users where email = auth.jwt() ->> 'email'));
create policy "comments_update_own" on public.comments
  for update using (user_id = (select id from auth.users where email = auth.jwt() ->> 'email'));
create policy "comments_delete_own" on public.comments
  for delete using (user_id = (select id from auth.users where email = auth.jwt() ->> 'email'));

create policy "water_reviews_select_all" on public.water_reviews
  for select using (true);
create policy "water_reviews_insert_own" on public.water_reviews
  for insert with check (user_email = auth.jwt() ->> 'email');
create policy "water_reviews_update_own" on public.water_reviews
  for update using (user_email = auth.jwt() ->> 'email');
create policy "water_reviews_delete_own" on public.water_reviews
  for delete using (user_email = auth.jwt() ->> 'email');

create policy "voting_submissions_select_all" on public.voting_submissions
  for select using (true);
create policy "voting_submissions_insert_own" on public.voting_submissions
  for insert with check (created_by = auth.jwt() ->> 'email');
create policy "voting_submissions_update_own" on public.voting_submissions
  for update using (created_by = auth.jwt() ->> 'email');
create policy "voting_submissions_delete_own" on public.voting_submissions
  for delete using (created_by = auth.jwt() ->> 'email');

-- ============================================================================
-- LIKE/VOTE TRACKING
-- ============================================================================

create policy "post_likes_select_all" on public.post_likes
  for select using (true);
create policy "post_likes_insert_own" on public.post_likes
  for insert with check (user_id = auth.jwt() ->> 'email');
create policy "post_likes_delete_own" on public.post_likes
  for delete using (user_id = auth.jwt() ->> 'email');

create policy "voting_likes_select_all" on public.voting_likes
  for select using (true);
create policy "voting_likes_insert_own" on public.voting_likes
  for insert with check (user_email = auth.jwt() ->> 'email');
create policy "voting_likes_delete_own" on public.voting_likes
  for delete using (user_email = auth.jwt() ->> 'email');

-- ============================================================================
-- CLAN/GROUP TABLES
-- ============================================================================

create policy "clans_select_all" on public.clans
  for select using (true);
create policy "clans_insert_own" on public.clans
  for insert with check (created_by = auth.jwt() ->> 'email');
create policy "clans_update_own" on public.clans
  for update using (created_by = auth.jwt() ->> 'email');

create policy "clan_members_select_all" on public.clan_members
  for select using (true);
create policy "clan_members_insert_own" on public.clan_members
  for insert with check (
    exists(select 1 from public.clans where id = clan_id and created_by = auth.jwt() ->> 'email')
  );
create policy "clan_members_delete_own" on public.clan_members
  for delete using (
    user_id = auth.jwt() ->> 'email' or
    exists(select 1 from public.clans where id = clan_id and created_by = auth.jwt() ->> 'email')
  );

create policy "clan_catches_select_own" on public.clan_catches
  for select using (
    user_id = (select id from auth.users where email = auth.jwt() ->> 'email') or
    exists(select 1 from public.clan_members where clan_id = clan_id and user_id = auth.jwt() ->> 'email')
  );
create policy "clan_catches_insert_own" on public.clan_catches
  for insert with check (user_id = (select id from auth.users where email = auth.jwt() ->> 'email'));

-- ============================================================================
-- EVENT/COMPETITION TABLES
-- ============================================================================

create policy "events_select_all" on public.events
  for select using (true);
create policy "events_insert_own" on public.events
  for insert with check (created_by = auth.jwt() ->> 'email');
create policy "events_update_own" on public.events
  for update using (created_by = auth.jwt() ->> 'email');
create policy "events_delete_own" on public.events
  for delete using (created_by = auth.jwt() ->> 'email');

create policy "event_entries_select_own" on public.event_entries
  for select using (user_id = (select id from auth.users where email = auth.jwt() ->> 'email'));
create policy "event_entries_insert_own" on public.event_entries
  for insert with check (user_id = (select id from auth.users where email = auth.jwt() ->> 'email'));
create policy "event_entries_delete_own" on public.event_entries
  for delete using (user_id = (select id from auth.users where email = auth.jwt() ->> 'email'));

create policy "event_participants_select_all" on public.event_participants
  for select using (true);
create policy "event_participants_insert_own" on public.event_participants
  for insert with check (user_id = auth.jwt() ->> 'email');
create policy "event_participants_select_own" on public.event_participants
  for select using (user_id = auth.jwt() ->> 'email');

create policy "event_submissions_select_own" on public.event_submissions
  for select using (user_id = auth.jwt() ->> 'email');
create policy "event_submissions_insert_own" on public.event_submissions
  for insert with check (user_id = auth.jwt() ->> 'email');
create policy "event_submissions_update_own" on public.event_submissions
  for update using (user_id = auth.jwt() ->> 'email');

create policy "event_invitations_select_own" on public.event_invitations
  for select using (invitee_id = auth.jwt() ->> 'email');
create policy "event_invitations_insert_own" on public.event_invitations
  for insert with check (inviter_id = auth.jwt() ->> 'email');

create policy "event_templates_select_all" on public.event_templates
  for select using (true);

create policy "competitions_select_all" on public.competitions
  for select using (true);

create policy "event_point_configs_select_all" on public.event_point_configs
  for select using (true);

-- ============================================================================
-- USER/PROFILE TABLES
-- ============================================================================

create policy "users_select_all" on public.users
  for select using (true);
create policy "users_update_own" on public.users
  for update using (email = auth.jwt() ->> 'email');

create policy "premium_wallets_select_own" on public.premium_wallets
  for select using (user_id = (select id from auth.users where email = auth.jwt() ->> 'email'));
create policy "premium_wallets_insert_own" on public.premium_wallets
  for insert with check (user_id = (select id from auth.users where email = auth.jwt() ->> 'email'));
create policy "premium_wallets_update_own" on public.premium_wallets
  for update using (user_id = (select id from auth.users where email = auth.jwt() ->> 'email'));

create policy "licenses_select_own" on public.licenses
  for select using (user_email = auth.jwt() ->> 'email');
create policy "licenses_insert_own" on public.licenses
  for insert with check (user_email = auth.jwt() ->> 'email');
create policy "licenses_update_own" on public.licenses
  for update using (user_email = auth.jwt() ->> 'email');

create policy "fishing_clubs_select_all" on public.fishing_clubs
  for select using (true);

-- ============================================================================
-- SYSTEM/PUBLIC DATA TABLES
-- ============================================================================

create policy "premium_events_select_all" on public.premium_events
  for select using (true);

create policy "gear_categories_select_all" on public.gear_categories
  for select using (true);

create policy "gear_listings_select_all" on public.gear_listings
  for select using (true);

create policy "gear_rules_select_all" on public.gear_rules
  for select using (true);

create policy "rule_entries_select_all" on public.rule_entries
  for select using (true);

create policy "bathymetric_maps_select_all" on public.bathymetric_maps
  for select using (true);

create policy "depth_data_points_select_all" on public.depth_data_points
  for select using (true);

create policy "exam_questions_select_all" on public.exam_questions
  for select using (true);

create policy "support_tickets_select_own" on public.support_tickets
  for select using (user_email = auth.jwt() ->> 'email');
create policy "support_tickets_insert_own" on public.support_tickets
  for insert with check (user_email = auth.jwt() ->> 'email');

create policy "water_scenes_select_all" on public.water_scenes
  for select using (true);

create policy "monthly_leaderboards_select_all" on public.monthly_leaderboards
  for select using (true);

create policy "reward_activations_select_own" on public.reward_activations
  for select using (user_id = auth.jwt() ->> 'email');
create policy "reward_activations_insert_own" on public.reward_activations
  for insert with check (user_id = auth.jwt() ->> 'email');

create policy "function_ratings_select_all" on public.function_ratings
  for select using (true);
create policy "function_ratings_insert_own" on public.function_ratings
  for insert with check (user_email = auth.jwt() ->> 'email');
create policy "function_ratings_update_own" on public.function_ratings
  for update using (user_email = auth.jwt() ->> 'email');
create policy "function_ratings_delete_own" on public.function_ratings
  for delete using (user_email = auth.jwt() ->> 'email');

create policy "live_trips_select_own" on public.live_trips
  for select using (user_email = auth.jwt() ->> 'email');
create policy "live_trips_insert_own" on public.live_trips
  for insert with check (user_email = auth.jwt() ->> 'email');

create policy "social_media_shares_select_own" on public.social_media_shares
  for select using (created_by = auth.jwt() ->> 'email');
create policy "social_media_shares_insert_own" on public.social_media_shares
  for insert with check (created_by = auth.jwt() ->> 'email');
create policy "social_media_shares_delete_own" on public.social_media_shares
  for delete using (created_by = auth.jwt() ->> 'email');

create policy "depth_data_points_select_own" on public.depth_data_points
  for select using (true);
create policy "depth_data_points_insert_own" on public.depth_data_points
  for insert with check (user_email = auth.jwt() ->> 'email');

create policy "premium_events_insert_own" on public.premium_events
  for insert with check (user_id = (select id from auth.users where email = auth.jwt() ->> 'email'));
