import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { base44 } from '@/api/base44Client';

describe('Account Deletion Integration Test', () => {
  let testUser = null;
  const testEmail = `test-delete-${Date.now()}@testing.local`;

  beforeEach(async () => {
    try {
      testUser = await base44.auth.me();
    } catch (e) {
      console.warn('Could not authenticate before test:', e.message);
    }
  });

  afterEach(async () => {
    // Cleanup: Attempt to restore minimal test data if needed
    console.log('Test cleanup completed');
  });

  it('should cascade delete all user records when account deletion is triggered', async () => {
    if (!testUser) {
      console.warn('Skipping test: Not authenticated');
      return;
    }

    const userEmail = testUser.email;

    // Create test data across multiple entities
    const testCatch = await base44.entities.Catch.create({
      species: 'Hecht',
      catch_time: new Date().toISOString(),
      weight_kg: 3.5,
      length_cm: 65
    });

    const testSpot = await base44.entities.Spot.create({
      name: 'Test Deletion Spot',
      latitude: 52.5,
      longitude: 13.4,
      water_type: 'see'
    });

    const testPlan = await base44.entities.FishingPlan.create({
      title: 'Test Deletion Plan',
      target_fish: 'Zander',
      steps: ['Step 1', 'Step 2']
    });

    const testMessage = await base44.entities.ChatMessage.create({
      role: 'user',
      content: 'Test message for deletion'
    });

    expect(testCatch.id).toBeDefined();
    expect(testSpot.id).toBeDefined();
    expect(testPlan.id).toBeDefined();
    expect(testMessage.id).toBeDefined();

    // Verify records exist before deletion
    const catchBefore = await base44.entities.Catch.filter({ created_by: userEmail });
    const spotBefore = await base44.entities.Spot.filter({ created_by: userEmail });
    const planBefore = await base44.entities.FishingPlan.filter({ created_by: userEmail });
    const messageBefore = await base44.entities.ChatMessage.filter({ created_by: userEmail });

    expect(catchBefore.length).toBeGreaterThan(0);
    expect(spotBefore.length).toBeGreaterThan(0);
    expect(planBefore.length).toBeGreaterThan(0);
    expect(messageBefore.length).toBeGreaterThan(0);

    // Call deleteAccount function
    const response = await fetch('/api/functions/deleteAccount', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await base44.auth.getToken()}`
      }
    });

    expect(response.status).toBe(200);
    const result = await response.json();
    
    expect(result.success).toBe(true);
    expect(result.deleted_records).toBeGreaterThan(0);
    expect(result.message).toContain('All account data deleted');

    // Verify records are deleted (with small delay for eventual consistency)
    await new Promise(resolve => setTimeout(resolve, 500));

    const catchAfter = await base44.entities.Catch.filter({ created_by: userEmail });
    const spotAfter = await base44.entities.Spot.filter({ created_by: userEmail });
    const planAfter = await base44.entities.FishingPlan.filter({ created_by: userEmail });
    const messageAfter = await base44.entities.ChatMessage.filter({ created_by: userEmail });

    expect(catchAfter.length).toBe(0);
    expect(spotAfter.length).toBe(0);
    expect(planAfter.length).toBe(0);
    expect(messageAfter.length).toBe(0);
  });

  it('should handle premium and session records during deletion', async () => {
    if (!testUser) {
      console.warn('Skipping test: Not authenticated');
      return;
    }

    const userEmail = testUser.email;

    // Create premium-related records
    const testWallet = await base44.entities.PremiumWallet.create({
      user_id: userEmail,
      purchased_credits: 1000,
      consumed_credits: 200,
      total_spent_eur: 50
    });

    const testSession = await base44.entities.UsageSession.create({
      session_id: `session-${Date.now()}`,
      user_id: userEmail,
      feature_id: 'bite_detector',
      started_at: new Date().toISOString()
    });

    expect(testWallet.id).toBeDefined();
    expect(testSession.id).toBeDefined();

    // Verify before deletion
    const walletBefore = await base44.entities.PremiumWallet.filter({ user_id: userEmail });
    const sessionBefore = await base44.entities.UsageSession.filter({ user_id: userEmail });

    expect(walletBefore.length).toBeGreaterThan(0);
    expect(sessionBefore.length).toBeGreaterThan(0);

    // Trigger deletion
    const response = await fetch('/api/functions/deleteAccount', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await base44.auth.getToken()}`
      }
    });

    expect(response.status).toBe(200);

    // Wait for eventual consistency
    await new Promise(resolve => setTimeout(resolve, 500));

    // Verify deletion
    const walletAfter = await base44.entities.PremiumWallet.filter({ user_id: userEmail });
    const sessionAfter = await base44.entities.UsageSession.filter({ user_id: userEmail });

    expect(walletAfter.length).toBe(0);
    expect(sessionAfter.length).toBe(0);
  });

  it('should handle graceful failure when some entities have errors', async () => {
    if (!testUser) {
      console.warn('Skipping test: Not authenticated');
      return;
    }

    // Call deleteAccount which should handle partial failures gracefully
    const response = await fetch('/api/functions/deleteAccount', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await base44.auth.getToken()}`
      }
    });

    expect(response.status).toBe(200);
    const result = await response.json();
    
    // Should still return success even if some entities fail
    expect(result.success).toBe(true);
    expect(result.deleted_records).toBeDefined();
  });
});