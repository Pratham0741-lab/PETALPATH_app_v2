import { prisma } from '../../config/database.js';
import { masteryEngineService } from './mastery.service.js';
import { skillHealthRepository } from './repositories/skill-health.repository.js';
import { reviewScheduleRepository } from './repositories/review-schedule.repository.js';

async function runTests() {
  console.log('--- STARTING MASTERY ENGINE INTEGRATION TESTS ---');

  // Find Aarav child and Standing Line skill
  const child = await prisma.child.findFirst({
    where: { name: 'Aarav' }
  });
  if (!child) {
    throw new Error('Test child "Aarav" not found. Run db:seed first.');
  }
  console.log(`Found child: ${child.name} (${child.id})`);

  const skill = await prisma.skill.findFirst({
    where: { name: 'Standing Line' }
  });
  if (!skill) {
    throw new Error('Standing Line skill not found. Run db:seed first.');
  }
  console.log(`Found skill: ${skill.name} (${skill.id})`);

  // Reset any pre-existing test state for this child/skill
  await prisma.reinforcementQueue.deleteMany({ where: { childId: child.id, skillId: skill.id } });
  await prisma.regressionLog.deleteMany({ where: { childId: child.id, skillId: skill.id } });
  await prisma.skillHistory.deleteMany({ where: { childId: child.id, skillId: skill.id } });
  await prisma.skillHealth.deleteMany({ where: { childId: child.id, skillId: skill.id } });

  const startTimestamp = new Date();
  
  // Test 1: First high performance session
  console.log('\n--- SESSION 1: HIGH PERFORMANCE (Baseline) ---');
  const session1Data = {
    accuracy: 90.0,
    responseTime: 4.5,
    attempts: 1,
    retries: 0,
    engagementScore: 95.0,
    helpRequests: 0,
    sessionDuration: 10.0,
    timestamp: startTimestamp.toISOString(),
  };

  const health1 = await masteryEngineService.processPerformance(child.id, skill.id, session1Data);
  console.log('Knowledge Score (expected ~90):', health1.knowledgeScore);
  console.log('Confidence Score (expected ~100):', health1.confidenceScore);
  console.log('Mastery Score:', health1.masteryScore);
  console.log('Mastery State (expected MASTERED or STRONG):', health1.masteryState);
  console.log('Frequency Days:', health1.frequencyDays);
  console.log('Next Review Date:', health1.nextReviewDate);

  // Verify derived ReviewSchedule
  console.log('\n--- VERIFYING DERIVED REVIEWSCHEDULE ---');
  const schedule1 = await reviewScheduleRepository.findByChildAndSkill(child.id, skill.id);
  if (!schedule1) {
    throw new Error('Derived ReviewSchedule should exist');
  }
  console.log('Derived ReviewSchedule nextReviewDate:', schedule1.nextReviewDate);
  console.log('Derived ReviewSchedule frequencyDays:', schedule1.frequencyDays);
  if (schedule1.frequencyDays !== health1.frequencyDays) {
    throw new Error('Derived ReviewSchedule frequencyDays mismatch');
  }

  // Assertions for Session 1
  if (health1.knowledgeScore !== 90.0) throw new Error('Knowledge score calculation error');
  if (health1.confidenceScore !== 100.0) throw new Error('Confidence score calculation error');
  if (health1.masteryScore < 80) throw new Error('Mastery score should be high');

  // Test 2: Decayed / Low performance session 3 days later (should trigger regression)
  console.log('\n--- SESSION 2: LOW PERFORMANCE (Regression Trigger) ---');
  const session2Timestamp = new Date(startTimestamp.getTime() + 3 * 24 * 60 * 60 * 1000);
  const session2Data = {
    accuracy: 30.0,
    responseTime: 25.0,
    attempts: 3,
    retries: 4,
    engagementScore: 35.0,
    helpRequests: 4,
    sessionDuration: 55.0,
    timestamp: session2Timestamp.toISOString(),
  };

  const health2 = await masteryEngineService.processPerformance(child.id, skill.id, session2Data);
  console.log('Knowledge Score (expected ~30):', health2.knowledgeScore);
  console.log('Confidence Score (expected ~20):', health2.confidenceScore);
  console.log('Mastery Score (expected decayed/low):', health2.masteryScore);
  console.log('Mastery State:', health2.masteryState);
  console.log('Frequency Days:', health2.frequencyDays);
  console.log('Next Review Date:', health2.nextReviewDate);

  // Check Regression logs
  const regressionLogs = await prisma.regressionLog.findMany({
    where: { childId: child.id, skillId: skill.id }
  });
  console.log(`\nRegression Logs found: ${regressionLogs.length}`);
  for (const log of regressionLogs) {
    console.log(`  Drop from ${log.previousScore.toFixed(1)} to ${log.currentScore.toFixed(1)} (State: ${log.previousState} -> ${log.currentState})`);
  }
  if (regressionLogs.length === 0) {
    throw new Error('Regression should have been detected and logged');
  }

  // Check Reinforcement Queue
  const queueItems = await prisma.reinforcementQueue.findMany({
    where: { childId: child.id, skillId: skill.id }
  });
  console.log(`\nReinforcement Queue items found: ${queueItems.length}`);
  for (const item of queueItems) {
    console.log(`  Priority: ${item.priority}, Reason: ${item.reason}`);
  }
  if (queueItems.length === 0) {
    throw new Error('Skill should be in reinforcement queue');
  }

  // Test 3: Weak skills query
  console.log('\n--- TESTING WEAK SKILLS QUERY ---');
  const weakSkills = await skillHealthRepository.findWeakSkills(child.id);
  console.log(`Number of weak skills for Aarav: ${weakSkills.length}`);
  if (weakSkills.length === 0 || !weakSkills.some(ws => ws.skillId === skill.id)) {
    throw new Error('Weak skills list should contain the regressed skill');
  }

  // Test 4: Recover skill mastery (should dequeue from reinforcement)
  console.log('\n--- SESSION 3: HIGH PERFORMANCE recovery ---');
  const session3Timestamp = new Date(session2Timestamp.getTime() + 1 * 24 * 60 * 60 * 1000);
  const session3Data = {
    accuracy: 95.0,
    responseTime: 3.0,
    attempts: 1,
    retries: 0,
    engagementScore: 100.0,
    helpRequests: 0,
    sessionDuration: 8.0,
    timestamp: session3Timestamp.toISOString(),
  };

  const health3 = await masteryEngineService.processPerformance(child.id, skill.id, session3Data);
  console.log('Mastery Score after recovery:', health3.masteryScore);
  console.log('Mastery State after recovery:', health3.masteryState);

  const queueItemsAfterRecovery = await prisma.reinforcementQueue.findMany({
    where: { childId: child.id, skillId: skill.id }
  });
  console.log(`Reinforcement Queue items after recovery: ${queueItemsAfterRecovery.length}`);
  if (queueItemsAfterRecovery.length !== 0) {
    throw new Error('Skill should have been removed from reinforcement queue after recovery');
  }

  // Verify derived ReviewSchedule list functions
  const childSchedules = await reviewScheduleRepository.findByChild(child.id);
  console.log(`Derived schedules found for child: ${childSchedules.length}`);
  if (childSchedules.length === 0) {
    throw new Error('Child should have derived schedules');
  }

  console.log('\n--- ALL MASTERY ENGINE INTEGRATION TESTS PASSED ---');
}

runTests()
  .catch((err) => {
    console.error('Test run failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
