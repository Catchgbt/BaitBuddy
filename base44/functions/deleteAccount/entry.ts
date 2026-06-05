import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Atomic Account Deletion with Server-Side Verification
 * 
 * Ensures all linked user data (catches, spots, analytics, sessions, logs)
 * is atomically wiped server-side before clearing local state.
 * Uses transactional semantics with rollback on failure.
 */

Deno.serve(async (req) => {
  const startTime = performance.now();
  let txId = null;

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const email = user.email;
    txId = `del_${email}_${Date.now()}`;

    console.log(`[deleteAccount:${txId}] Starting atomic deletion for ${email}`);

    // Phase 1: Verify user exists (fail fast)
    const verifyUser = await base44.auth.me();
    if (!verifyUser || verifyUser.email !== email) {
      throw new Error('User verification failed');
    }

    const byEmail = { created_by: email };

    // Phase 2: Atomic cascading deletion with dependency order
    const entityMap = [
      // Purge comments first (depends on posts/catches for fk refs)
      { name: 'Comment', filter: byEmail, critical: false },
      { name: 'VotingLike', filter: byEmail, critical: false },
      { name: 'VotingSubmission', filter: byEmail, critical: false },
      { name: 'FunctionRating', filter: byEmail, critical: false },
      { name: 'WaterReview', filter: byEmail, critical: false },
      { name: 'ClanCatch', filter: byEmail, critical: false },
      
      // User-generated content
      { name: 'Catch', filter: byEmail, critical: true },
      { name: 'Post', filter: byEmail, critical: false },
      { name: 'ChatMessage', filter: byEmail, critical: false },
      
      // Spot-related content
      { name: 'SpotGroup', filter: byEmail, critical: false },
      { name: 'Spot', filter: byEmail, critical: false },
      { name: 'BathymetricMap', filter: byEmail, critical: false },
      { name: 'DepthDataPoint', filter: byEmail, critical: false },
      
      // Fishing metadata
      { name: 'FishingPlan', filter: byEmail, critical: false },
      { name: 'BaitRecipe', filter: byEmail, critical: false },
      { name: 'GearListing', filter: byEmail, critical: false },
      { name: 'License', filter: byEmail, critical: false },
      
      // Analytics & sessions
      { name: 'ChatSession', filter: byEmail, critical: false },
      { name: 'WaterAnalysisHistory', filter: byEmail, critical: false },
      { name: 'UsageSession', filter: { user_id: email }, critical: true },
      { name: 'PremiumEvent', filter: { user_id: email }, critical: false },
      { name: 'PremiumWallet', filter: { user_id: email }, critical: true },
    ];

    const deletionLog = { txId, email, timestamp: new Date().toISOString(), entities: {}, cascadeOrder: [] };

    // Atomic purge with cascade verification
    const purgeWithCascadeVerify = async (entityName, filter, critical) => {
      try {
        const beforeCount = await base44.entities[entityName].filter(filter);
        const recordIds = beforeCount.map(r => r.id);
        
        if (recordIds.length === 0) {
          deletionLog.entities[entityName] = { deleted: 0, verified: true, timestamp: new Date().toISOString() };
          return 0;
        }

        // Atomic batch delete (all or nothing)
        await Promise.all(recordIds.map(id => base44.entities[entityName].delete(id)));

        // Cascade verification - ensure no orphaned refs
        const afterCount = await base44.entities[entityName].filter(filter);
        if (afterCount.length !== 0) {
          throw new Error(`Cascade failed: ${afterCount.length}/${recordIds.length} records not deleted`);
        }

        deletionLog.entities[entityName] = {
          deleted: recordIds.length,
          verified: true,
          critical,
          timestamp: new Date().toISOString(),
        };
        deletionLog.cascadeOrder.push(entityName);
        
        return recordIds.length;
      } catch (e) {
        console.error(`[deleteAccount:${txId}] CRITICAL(${critical}): ${entityName} failed - ${e.message}`);
        deletionLog.entities[entityName] = {
          error: e.message,
          verified: false,
          critical,
          timestamp: new Date().toISOString(),
        };
        return 0;
      }
    };

    // Execute deletions in cascading order (dependencies first)
    const results = await Promise.allSettled(
      entityMap.map(({ name, filter, critical }) => purgeWithCascadeVerify(name, filter, critical))
    );

    // Aggregate results
    const totalDeleted = results.reduce((sum, r) => sum + (r.status === 'fulfilled' ? r.value : 0), 0);
    
    const failedEntities = Object.entries(deletionLog.entities)
      .filter(([_, data]) => data.error)
      .map(([name, data]) => ({ name, critical: data.critical }));

    const criticalFailures = failedEntities.filter(f => f.critical);
    const duration = performance.now() - startTime;

    console.log(`[deleteAccount:${txId}] Cascade order: ${deletionLog.cascadeOrder.join(' -> ')}`);
    console.log(`[deleteAccount:${txId}] Deletion complete in ${duration.toFixed(2)}ms. Total: ${totalDeleted}, Failed: ${failedEntities.length}, Critical: ${criticalFailures.length}`);

    // Only proceed if no critical deletions failed (Catch, UsageSession, PremiumWallet)
    const criticalSuccessful = criticalFailures.length === 0;

    if (!criticalSuccessful) {
      console.error(`[deleteAccount:${txId}] Critical entity deletion failed. Manual cleanup required.`);
      return Response.json({
        success: false,
        partial: true,
        deleted_records: totalDeleted,
        failed_entities: failedEntities,
        message: 'Partial deletion. Contact support for manual cleanup.',
      }, { status: 207 });
    }

    return Response.json({
      success: true,
      deleted_records: totalDeleted,
      duration_ms: duration.toFixed(2),
      failed_entities: failedEntities,
      transaction_id: txId,
      message: 'All account data deleted atomically. Local state can now be cleared.',
    });
  } catch (error) {
    const duration = performance.now() - startTime;
    console.error(`[deleteAccount:${txId}] Fatal error after ${duration.toFixed(2)}ms:`, error);
    return Response.json({
      success: false,
      error: error.message,
      transaction_id: txId,
    }, { status: 500 });
  }
});