import { prisma } from '../../config/database.js';
import { curriculumEngineService } from './curriculum-engine.service.js';
import { childSkillCurriculumRepository } from './repositories/child-skill-curriculum.repository.js';
import { CurriculumState, MasteryState } from '../../shared/enums.js';

async function runTests() {
  console.log('--- STARTING DYNAMIC CURRICULUM ENGINE INTEGRATION TESTS ---');

  // 1. Fetch Aarav
  const child = await prisma.child.findFirst({ where: { name: 'Aarav' } });
  if (!child) {
    throw new Error('Test child "Aarav" not found. Run seed first.');
  }
  console.log(`Child: ${child.name} (${child.id})`);

  // Clear any existing curriculum / health records for Aarav to ensure clean slate
  await prisma.childSkillCurriculum.deleteMany({ where: { childId: child.id } });
  await prisma.skillHealth.deleteMany({ where: { childId: child.id } });
  await prisma.skillHistory.deleteMany({ where: { childId: child.id } });
  await prisma.regressionLog.deleteMany({ where: { childId: child.id } });
  await prisma.reinforcementQueue.deleteMany({ where: { childId: child.id } });

  // 2. Fetch root skills
  console.log('\n--- TEST 1: GET ROOT SKILLS ---');
  const rootSkills = await curriculumEngineService.getRootSkills();
  console.log(`Total Root Skills Seeded: ${rootSkills.length}`);
  const rootNames = rootSkills.map((s) => s.name);
  console.log('Root Skill Names:', rootNames.join(', '));

  if (!rootNames.includes('Standing Line') || !rootNames.includes('Sleeping Line')) {
    throw new Error('Expected Standing Line and Sleeping Line to be root skills');
  }

  // 3. Generate initial curriculum states
  console.log('\n--- TEST 2: INITIAL CURRICULUM SYNC (Aarav has no practice) ---');
  await curriculumEngineService.generateCurriculum(child.id);

  const curriculums = await childSkillCurriculumRepository.findByChild(child.id);
  console.log(`Curriculum tree sync complete. Total skill tracks: ${curriculums.length}`);

  const locked = curriculums.filter((c) => c.state === CurriculumState.LOCKED);
  const available = curriculums.filter((c) => c.state === CurriculumState.AVAILABLE);
  console.log(`Locked skills: ${locked.length}`);
  console.log(`Available skills: ${available.length}`);

  // Standing Line should be available, Curves should be locked
  const standingLineCur = curriculums.find((c) => c.skill.name === 'Standing Line');
  const curvesCur = curriculums.find((c) => c.skill.name === 'Curves');

  console.log(`Standing Line state (expected AVAILABLE): ${standingLineCur?.state}`);
  console.log(`Curves state (expected LOCKED): ${curvesCur?.state}`);

  if (standingLineCur?.state !== CurriculumState.AVAILABLE) {
    throw new Error('Standing Line should be AVAILABLE initially');
  }
  if (curvesCur?.state !== CurriculumState.LOCKED) {
    throw new Error('Curves should be LOCKED initially');
  }

  // 4. Test state transition: Activate skill
  console.log('\n--- TEST 3: ACTIVATE SKILL ---');
  await curriculumEngineService.activateSkill(child.id, standingLineCur.skillId);
  const activeRecord = await childSkillCurriculumRepository.findByChildAndSkill(child.id, standingLineCur.skillId);
  console.log(`Activated Standing Line. Current state (expected ACTIVE): ${activeRecord?.state}`);
  if (activeRecord?.state !== CurriculumState.ACTIVE) {
    throw new Error('Skill state should be ACTIVE');
  }

  // 5. Simulate practice and mastery of parents to trigger prerequisite unlock
  console.log('\n--- TEST 4: UNLOCK ALGORITHM (Simulate Mastering Standing Line & Sleeping Line) ---');
  
  const sleepingLine = rootSkills.find((s) => s.name === 'Sleeping Line');
  if (!sleepingLine) throw new Error('Sleeping Line not found');

  // Insert mock SkillHealth with high mastery score (90.0) for both Standing and Sleeping Line
  const now = new Date();
  await prisma.skillHealth.create({
    data: {
      childId: child.id,
      skillId: standingLineCur.skillId,
      masteryState: MasteryState.MASTERED,
      knowledgeScore: 90.0,
      confidenceScore: 90.0,
      retentionScore: 90.0,
      engagementScore: 90.0,
      consistencyScore: 90.0,
      masteryScore: 90.0,
      lastPracticed: now,
      nextReviewDate: now,
      reviewCount: 1,
      attemptCount: 1,
      retryCount: 0,
      decayFactor: 0.995,
      frequencyDays: 30,
    },
  });

  await prisma.skillHealth.create({
    data: {
      childId: child.id,
      skillId: sleepingLine.id,
      masteryState: MasteryState.MASTERED,
      knowledgeScore: 90.0,
      confidenceScore: 90.0,
      retentionScore: 90.0,
      engagementScore: 90.0,
      consistencyScore: 90.0,
      masteryScore: 90.0,
      lastPracticed: now,
      nextReviewDate: now,
      reviewCount: 1,
      attemptCount: 1,
      retryCount: 0,
      decayFactor: 0.995,
      frequencyDays: 30,
    },
  });

  // Calculate unlock ratio for Curves (prereq of Standing Line [0.5] and Sleeping Line [0.5])
  const curvesSkill = curvesCur?.skill;
  if (!curvesSkill) throw new Error('Curves skill not found');

  const curvesUnlockRatio = await curriculumEngineService.calculateUnlockRatio(child.id, curvesSkill.id);
  console.log(`Curves Unlock Ratio (expected 90.0): ${curvesUnlockRatio}`);
  if (curvesUnlockRatio !== 90.0) {
    throw new Error('Prerequisite unlock ratio calculation incorrect');
  }

  // Generate curriculum updates
  await curriculumEngineService.generateCurriculum(child.id);

  const updatedCurriculums = await childSkillCurriculumRepository.findByChild(child.id);
  const updatedCurves = updatedCurriculums.find((c) => c.skill.name === 'Curves');
  console.log(`Curves state after parent mastery (expected AVAILABLE): ${updatedCurves?.state}`);
  
  if (updatedCurves?.state !== CurriculumState.AVAILABLE) {
    throw new Error('Curves should have unlocked and transitioned to AVAILABLE');
  }

  // 6. Test Priority Formula & Dynamic Recommendation
  console.log('\n--- TEST 5: DYNAMIC RECOMMENDATIONS ---');
  const recommendations = await curriculumEngineService.recommendNextSkills(child.id, 5);
  console.log(`Recommendations count: ${recommendations.length}`);
  for (const rec of recommendations) {
    console.log(`  Subject: ${rec.subjectName} -> Next Skill: ${rec.nextSkillName} (Priority: ${rec.priority})`);
    console.log(`  Reasoning: "${rec.reason}"`);
  }

  if (recommendations.length === 0) {
    throw new Error('Dynamic recommendations list should not be empty');
  }

  // 7. Verify Completed State Promotion
  console.log('\n--- TEST 6: COMPLETE STATE AUTO-PROMOTION ---');
  // Standing line has mastery score of 90.0 (which is >= 85.0)
  // Check its curriculum status in updatedCurriculums
  const completedStandingLine = updatedCurriculums.find((c) => c.skill.name === 'Standing Line');
  console.log(`Standing Line state (expected COMPLETED): ${completedStandingLine?.state}`);
  if (completedStandingLine?.state !== CurriculumState.COMPLETED) {
    throw new Error('Standing Line should have been promoted to COMPLETED status');
  }

  console.log('\n--- ALL DYNAMIC CURRICULUM ENGINE INTEGRATION TESTS PASSED ---');
}

runTests()
  .catch((err) => {
    console.error('Test run failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
