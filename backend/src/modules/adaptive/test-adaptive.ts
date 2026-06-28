import { prisma } from '../../config/database.js';
import { adaptiveLearningEngineService } from './adaptive-learning-engine.service.js';
import { learningProfileRepository } from './repositories/learning-profile.repository.js';
import { modalityPerformanceRepository } from './repositories/modality-performance.repository.js';
import { adaptationEventRepository } from './repositories/adaptation-event.repository.js';
import { ActivityType, MasteryState } from '../../shared/enums.js';

async function runTests() {
  console.log('--- STARTING ADAPTIVE LEARNING ENGINE INTEGRATION TESTS ---');

  // 1. Fetch Aarav
  const child = await prisma.child.findFirst({ where: { name: 'Aarav' } });
  if (!child) {
    throw new Error('Test child "Aarav" not found. Run seed first.');
  }
  console.log(`Child: ${child.name} (${child.id})`);

  // Clear existing adaptive state to ensure clean test run
  await prisma.adaptationEvent.deleteMany({ where: { childId: child.id } });
  await prisma.learningEvent.deleteMany({ where: { childId: child.id } });
  await prisma.modalityPerformance.deleteMany({ where: { childId: child.id } });
  await prisma.learningProfile.deleteMany({ where: { childId: child.id } });
  await prisma.skillHealth.deleteMany({ where: { childId: child.id } });
  await prisma.skillHistory.deleteMany({ where: { childId: child.id } });

  const skill = await prisma.skill.findFirst({ where: { name: 'Standing Line' } });
  if (!skill) throw new Error('Standing Line skill not found');

  // Seed baseline health
  const now = new Date();
  const initialHealth = await prisma.skillHealth.create({
    data: {
      childId: child.id,
      skillId: skill.id,
      masteryState: MasteryState.LEARNING,
      knowledgeScore: 40.0,
      confidenceScore: 70.0,
      retentionScore: 40.0,
      engagementScore: 40.0,
      consistencyScore: 40.0,
      masteryScore: 40.0,
      lastPracticed: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      nextReviewDate: now,
      reviewCount: 1,
      attemptCount: 1,
      retryCount: 0,
      decayFactor: 0.995,
      frequencyDays: 2,
    },
  });

  // Test 1: Ingest low performance (should trigger weaknesses and confidence drops)
  console.log('\n--- TEST 1: INGESTING MOCK PERFORMANCE (Low Engagement, Low Accuracy) ---');
  const performance1 = {
    accuracy: 30.0,
    responseTime: 20.0,
    attempts: 3,
    retries: 4,
    engagementScore: 35.0,
    helpRequests: 3,
    sessionDuration: 20.0, // 20 mins
    activityType: ActivityType.GAME,
    skillId: skill.id,
  };

  // Mock updated health state
  const mockHealth1 = {
    masteryScore: 35.0,
    confidenceScore: 30.0,
    masteryState: MasteryState.WEAK,
  };

  const result1 = await adaptiveLearningEngineService.processChildPerformance(
    child.id,
    performance1,
    mockHealth1,
    initialHealth
  );

  console.log('Resulting optimalSessionDuration (expected 15):', result1.optimalDuration);
  if (result1.optimalDuration !== 10) { // Default optimal starts at 15. Drop of engagement < 50 triggers shorten: 15 -> 10.
    throw new Error(`Expected optimal duration to shorten to 10, got ${result1.optimalDuration}`);
  }

  // Verify adaptation events
  const events1 = await adaptationEventRepository.findByChild(child.id);
  console.log(`Generated Adaptation Events count: ${events1.length}`);
  events1.forEach((e) => console.log(`  - Event: ${e.eventType}. Reason: "${e.reason}"`));

  const eventTypes1 = events1.map((e) => e.eventType);
  if (!eventTypes1.includes('WEAKNESS_DETECTED')) throw new Error('Expected WEAKNESS_DETECTED event');
  if (!eventTypes1.includes('CONFIDENCE_DROP')) throw new Error('Expected CONFIDENCE_DROP event');
  if (!eventTypes1.includes('SESSION_SHORTENED')) throw new Error('Expected SESSION_SHORTENED event');

  // Test 2: Ingest high performance in a different modality (triggers strength, optimal duration extension, modality shift)
  console.log('\n--- TEST 2: INGESTING HIGH PERFORMANCE (Video modality) ---');
  const performance2 = {
    accuracy: 95.0,
    responseTime: 5.0,
    attempts: 1,
    retries: 0,
    engagementScore: 90.0,
    helpRequests: 0,
    sessionDuration: 10.0, // 10 mins (current optimal)
    activityType: ActivityType.VIDEO,
    skillId: skill.id,
  };

  const mockHealth2 = {
    masteryScore: 90.0,
    confidenceScore: 95.0,
    masteryState: MasteryState.MASTERED,
  };

  const result2 = await adaptiveLearningEngineService.processChildPerformance(
    child.id,
    performance2,
    mockHealth2,
    mockHealth1
  );

  console.log('Resulting optimalSessionDuration (expected extend 10 -> 15):', result2.optimalDuration);
  if (result2.optimalDuration !== 15) {
    throw new Error(`Expected optimal duration to extend to 15, got ${result2.optimalDuration}`);
  }

  // Verify modality preferences
  const profile = await learningProfileRepository.findByChildId(child.id);
  console.log('\n--- VERIFYING LEARNING PROFILE SUMMARY ---');
  console.log('Preferred Modality (expected VIDEO):', profile?.preferredModality);
  console.log('Average Accuracy:', profile?.averageAccuracy.toFixed(1));
  console.log('Optimal Session Length:', profile?.optimalSessionDuration);

  if (profile?.preferredModality !== ActivityType.VIDEO) {
    throw new Error('Preferred modality should shift to VIDEO due to high performance');
  }

  // Test 3: Recommendation endpoints
  console.log('\n--- TEST 3: RECOMMENDATIONS ---');
  const recommendedModality = await adaptiveLearningEngineService.recommendModality(child.id);
  const recommendedDuration = await adaptiveLearningEngineService.recommendSessionDuration(child.id);
  console.log('Recommended Modality:', recommendedModality);
  console.log('Recommended Duration:', recommendedDuration);

  if (recommendedModality !== ActivityType.VIDEO) throw new Error('Expected recommended modality to be VIDEO');
  if (recommendedDuration !== 15) throw new Error('Expected recommended duration to be 15');

  console.log('\n--- ALL ADAPTIVE LEARNING ENGINE INTEGRATION TESTS PASSED ---');
}

runTests()
  .catch((err) => {
    console.error('Test run failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
