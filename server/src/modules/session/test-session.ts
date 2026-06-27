import { prisma } from '../../config/database.js';
import { sessionPlannerService } from './session-planner.service.js';
import { sessionPlanRepository } from './repositories/session-plan.repository.js';
import { sessionEventRepository } from './repositories/session-event.repository.js';
import { sessionTemplateRepository } from './repositories/session-template.repository.js';
import { reinforcementEngineService } from '../reinforcement/reinforcement-engine.service.js';
import { ActivityType, MasteryState, SessionStatus, SessionBlockStatus } from '../../shared/enums.js';

async function runTests() {
  console.log('--- STARTING SESSION PLANNER INTEGRATION TESTS ---');

  // 1. Fetch Aarav
  const child = await prisma.child.findFirst({ where: { name: 'Aarav' } });
  if (!child) {
    throw new Error('Test child "Aarav" not found. Run seed first.');
  }
  console.log(`Child: ${child.name} (${child.id})`);

  // Clear existing session plans and queues for a clean test run
  await prisma.sessionBlock.deleteMany({ where: { sessionPlan: { childId: child.id } } });
  await prisma.sessionEvent.deleteMany({ where: { sessionPlan: { childId: child.id } } });
  await prisma.sessionPlan.deleteMany({ where: { childId: child.id } });
  await prisma.reinforcementQueue.deleteMany({ where: { childId: child.id } });
  await prisma.reinforcementEvent.deleteMany({ where: { childId: child.id } });
  await prisma.reinforcementHistory.deleteMany({ where: { childId: child.id } });
  await prisma.sessionTemplate.deleteMany({}); // clear templates to test seeding

  // 2. Test Template Seeding
  console.log('\n[TEST 1] Seeding templates...');
  await sessionPlannerService.seedTemplatesIfNeeded();
  const templates = await sessionTemplateRepository.findAll();
  console.log(`Successfully seeded ${templates.length} templates.`);
  if (templates.length !== 3) {
    throw new Error(`Expected 3 templates, got ${templates.length}`);
  }

  // 3. Test Template Selection (Closest matching)
  console.log('\n[TEST 2] Closest template matching...');
  const template10 = await sessionTemplateRepository.findByDuration(11);
  console.log(`Target duration 11 matched to: ${template10?.name} (${template10?.durationMinutes} min)`);
  if (template10?.durationMinutes !== 10) {
    throw new Error(`Expected 10-min template, got ${template10?.durationMinutes}`);
  }

  const template20 = await sessionTemplateRepository.findByDuration(25);
  console.log(`Target duration 25 matched to: ${template20?.name} (${template20?.durationMinutes} min)`);
  if (template20?.durationMinutes !== 20) {
    throw new Error(`Expected 20-min template, got ${template20?.durationMinutes}`);
  }

  // 4. Set up some skills and subject data
  const subject = await prisma.subject.findFirst();
  const skills = await prisma.skill.findMany({ take: 3 });

  if (skills.length < 2) {
    throw new Error('Not enough skills in database for testing session composition. Please run standard database seeds first.');
  }

  // 5. Seed learning profile & due reinforcement to test reinforcement injection
  await prisma.learningProfile.upsert({
    where: { childId: child.id },
    create: {
      childId: child.id,
      averageAccuracy: 75.0,
      averageEngagement: 80.0,
      averageConfidence: 70.0,
      optimalSessionDuration: 15,
      preferredModality: ActivityType.GAME,
      learningVelocity: 1.2,
    },
    update: {
      optimalSessionDuration: 15,
      preferredModality: ActivityType.GAME,
    },
  });

  // Seed baseline health record that qualifies for review
  const testSkill = skills[0];
  await prisma.skillHealth.upsert({
    where: { childId_skillId: { childId: child.id, skillId: testSkill.id } },
    create: {
      childId: child.id,
      skillId: testSkill.id,
      masteryState: MasteryState.WEAK,
      knowledgeScore: 40.0,
      confidenceScore: 35.0,
      retentionScore: 30.0,
      engagementScore: 50.0,
      consistencyScore: 45.0,
      masteryScore: 40.0,
      lastPracticed: new Date(),
      nextReviewDate: new Date(),
      reviewCount: 0,
      attemptCount: 0,
      retryCount: 0,
      decayFactor: 0.995,
      frequencyDays: 1,
    },
    update: {
      masteryScore: 40.0,
    },
  });

  console.log('\n[TEST 3] Running detectWeakSkills to trigger reinforcement queue insertion...');
  const queueStatus = await reinforcementEngineService.detectWeakSkills(child.id);
  console.log(`Enqueued skills: ${JSON.stringify(queueStatus.enqueued)}`);

  // 6. Generate Session
  console.log('\n[TEST 4] Generating personalized session for Aarav...');
  const session = await sessionPlannerService.generateSession(child.id);
  console.log(`Generated session ID: ${session.id}`);
  console.log(`Status: ${session.status}`);
  console.log(`Duration: ${session.durationMinutes} minutes`);
  console.log(`Total blocks: ${session.sessionBlocks.length}`);

  // Display blocks
  session.sessionBlocks.forEach((block: any, idx: number) => {
    console.log(
      `  Block ${idx + 1}: Position: ${block.position} | Type: ${block.activityType} | Status: ${block.status} | Skill: ${block.skill?.name ?? 'None'} | Subject: ${block.subject?.name ?? 'None'}`
    );
  });

  // Verify constraints
  const hasWarmup = session.sessionBlocks.some((b: any) => b.activityType === ActivityType.WARMUP);
  const hasReward = session.sessionBlocks.some((b: any) => b.activityType === ActivityType.REWARD);
  if (!hasWarmup || !hasReward) {
    throw new Error('Warmup and Reward blocks are missing from generated session.');
  }

  // 7. Verify session validation
  const isValid = sessionPlannerService.validateSession(session.sessionBlocks);
  console.log(`\n[TEST 5] Constraints validation result: ${isValid ? 'PASSED ✓' : 'FAILED ✗'}`);
  if (!isValid) {
    throw new Error('Session did not meet reinforcement or balancing constraints.');
  }

  // 8. Lifecycle: Start Session
  console.log('\n[TEST 6] Starting session...');
  let updated = await sessionPlannerService.startSession(session.id);
  console.log(`Session status: ${updated.status} | startedAt: ${updated.startedAt}`);
  if (updated.status !== SessionStatus.STARTED) {
    throw new Error('Expected session status to be STARTED');
  }

  // 9. Lifecycle: Complete Block
  console.log('\n[TEST 7] Completing first block...');
  const firstBlock = session.sessionBlocks[0];
  const blockResult = await sessionPlannerService.completeBlock(session.id, firstBlock.id);
  console.log(`Block status updated to: ${blockResult.status} | completedAt: ${blockResult.completedAt}`);
  if (blockResult.status !== SessionBlockStatus.COMPLETED) {
    throw new Error('Expected block status to be COMPLETED');
  }

  // 10. Lifecycle: Complete Session
  console.log('\n[TEST 8] Completing session...');
  updated = await sessionPlannerService.completeSession(session.id);
  console.log(`Session status: ${updated.status} | completedAt: ${updated.completedAt}`);
  if (updated.status !== SessionStatus.COMPLETED) {
    throw new Error('Expected session status to be COMPLETED');
  }

  // Verify events emitted
  const events = await sessionEventRepository.findByPlanId(session.id);
  console.log(`\n[TEST 9] Verifying emitted events sequence...`);
  events.forEach((ev) => {
    console.log(`  Event: ${ev.eventType} | CreatedAt: ${ev.createdAt}`);
  });

  const generatedEvent = events.some((e) => e.eventType === 'GENERATED');
  const startedEvent = events.some((e) => e.eventType === 'STARTED');
  const blockCompletedEvent = events.some((e) => e.eventType === 'BLOCK_COMPLETED');
  const completedEvent = events.some((e) => e.eventType === 'COMPLETED');

  if (!generatedEvent || !startedEvent || !blockCompletedEvent || !completedEvent) {
    throw new Error('Emitted events mismatch. Some events are missing.');
  }

  console.log('\n--- ALL SESSION PLANNER INTEGRATION TESTS PASSED SUCCESSFULLY! ---');
}

runTests()
  .catch((err) => {
    console.error('Test run encountered an error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
