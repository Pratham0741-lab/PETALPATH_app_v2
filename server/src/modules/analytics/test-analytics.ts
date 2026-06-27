import { prisma } from '../../config/database.js';
import { analyticsService } from './analytics.service.js';
import { analyticsSnapshotRepository } from './repositories/analytics-snapshot.repository.js';
import { analyticsHistoryRepository } from './repositories/analytics-history.repository.js';
import { trendEventRepository } from './repositories/trend-event.repository.js';
import { subjectAnalyticsRepository } from './repositories/subject-analytics.repository.js';
import { AnalyticsMetricType, TrendEventType, SessionStatus } from '../../shared/enums.js';

async function runTests() {
  console.log('--- STARTING ANALYTICS PLATFORM INTEGRATION TESTS ---');

  // 1. Fetch Aarav
  const child = await prisma.child.findFirst({ where: { name: 'Aarav' } });
  if (!child) {
    throw new Error('Test child "Aarav" not found. Run seed first.');
  }
  console.log(`Child: ${child.name} (${child.id})`);

  // Clear existing analytics data for clean testing
  await prisma.analyticsHistory.deleteMany({ where: { childId: child.id } });
  await prisma.trendEvent.deleteMany({ where: { childId: child.id } });
  await prisma.subjectAnalytics.deleteMany({ where: { childId: child.id } });
  await prisma.analyticsSnapshot.deleteMany({ where: { childId: child.id } });

  // 2. Ensure some sample sessions exist in history
  console.log('\n[TEST 1] Setting up historical session logs...');
  await prisma.sessionPlan.deleteMany({ where: { childId: child.id } });
  
  // Create 1 completed session
  await prisma.sessionPlan.create({
    data: {
      childId: child.id,
      durationMinutes: 15,
      status: SessionStatus.COMPLETED as any,
      startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
    },
  });

  // Create 1 abandoned session (to trigger TrendEvent)
  await prisma.sessionPlan.create({
    data: {
      childId: child.id,
      durationMinutes: 10,
      status: SessionStatus.ABANDONED as any,
      startedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 3.5 * 60 * 60 * 1000),
    },
  });

  // 3. Test Snapshot Generation
  console.log('\n[TEST 2] Generating fresh analytics snapshot...');
  const snapshot = await analyticsService.generateSnapshot(child.id);
  console.log(`Snapshot generated. accuracy: ${snapshot.accuracy} | confidence: ${snapshot.confidence} | retention: ${snapshot.retention} | velocity: ${snapshot.learningVelocity}`);
  console.log(`Session completion rate: ${snapshot.sessionCompletionRate}%`);

  const fetchedSnapshot = await analyticsSnapshotRepository.findByChild(child.id);
  if (!fetchedSnapshot || fetchedSnapshot.accuracy !== snapshot.accuracy) {
    throw new Error('AnalyticsSnapshot was not saved correctly.');
  }

  // 4. Verify Time-bucketed Daily Snapshots Unique Constraint
  console.log('\n[TEST 3] Verifying daily time-bucketed history constraint...');
  const historyBefore = await analyticsHistoryRepository.findByChild(child.id);
  
  // Re-generate snapshot on the same day - should update existing entries instead of creating new rows
  await analyticsService.generateSnapshot(child.id);
  const historyAfter = await analyticsHistoryRepository.findByChild(child.id);
  
  console.log(`History count before: ${historyBefore.length} | count after: ${historyAfter.length}`);
  if (historyBefore.length !== historyAfter.length) {
    throw new Error('Daily time-bucket constraint failed: Created duplicate entries for the same day.');
  }
  console.log('Daily time-bucketing verified successfully ✓');

  // 5. Verify Trend Detection Event Generation
  console.log('\n[TEST 4] Verifying TrendEvent log generation...');
  
  // In TEST 1 we created an abandoned session which should trigger a TrendEvent of type SESSION_ABANDONMENT
  const trends = await trendEventRepository.findByChild(child.id);
  console.log(`Detected trends:`);
  trends.forEach((t) => {
    console.log(`  Trend: ${t.eventType} | Metadata: ${JSON.stringify(t.metadata)}`);
  });

  const hasAbandonment = trends.some((t) => t.eventType === TrendEventType.SESSION_ABANDONMENT);
  if (!hasAbandonment) {
    throw new Error('Expected TrendEvent of type SESSION_ABANDONMENT to be generated.');
  }

  // 6. Verify TrendEvent-driven Parent Insights
  console.log('\n[TEST 5] Generating parent-friendly observations...');
  const insights = await analyticsService.generateInsights(child.id);
  console.log('Insights generated:');
  insights.forEach((ins, idx) => {
    console.log(`  Insight ${idx + 1}: "${ins}"`);
  });

  const hasGrowthMindsetMessage = insights.some((ins) => ins.includes('breaks') || ins.includes('self-regulation'));
  if (!hasGrowthMindsetMessage) {
    throw new Error('Insights failed to generate growth-oriented messages matching trends.');
  }

  // 7. Verify Subject Analytics
  console.log('\n[TEST 6] Verifying subject specific analytics...');
  const subjectAnalytics = await subjectAnalyticsRepository.findByChild(child.id);
  console.log(`Subject analytics records: ${subjectAnalytics.length}`);
  subjectAnalytics.forEach((sa) => {
    console.log(`  Subject: ${sa.subject.name} | accuracy: ${sa.accuracy}% | confidence: ${sa.confidence}% | progress: ${sa.progress}%`);
  });

  // 8. Verify Report Generation across time windows
  console.log('\n[TEST 7] Fetching WEEKLY progress report...');
  const weeklyReport = await analyticsService.generateReports(child.id, 'WEEKLY');
  console.log(`Weekly Report: Window: ${weeklyReport.window} | sessionsCount: ${weeklyReport.sessionsCount} | completionRate: ${weeklyReport.completionRate}%`);
  if (weeklyReport.window !== 'WEEKLY' || weeklyReport.sessionsCount !== 2) {
    throw new Error('WEEKLY report generation matches incorrect aggregates.');
  }

  console.log('\n--- ALL ANALYTICS PLATFORM INTEGRATION TESTS PASSED SUCCESSFULLY! ---');
}

runTests()
  .catch((err) => {
    console.error('Test run encountered an error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
