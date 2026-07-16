import { prisma } from '../../../config/database.js';
import { curriculumSeedData } from './curriculum-data.js';

function detectCycle(skills: Array<{ name: string; prerequisiteSkillNames?: string[] }>): void {
  const adjacency = new Map<string, string[]>();
  for (const skill of skills) {
    adjacency.set(skill.name, skill.prerequisiteSkillNames ?? []);
  }

  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map<string, number>();
  for (const name of adjacency.keys()) color.set(name, WHITE);

  const parent = new Map<string, string | null>();
  let cycle: string[] = [];

  function dfs(u: string): boolean {
    color.set(u, GRAY);
    for (const v of adjacency.get(u) ?? []) {
      if (!adjacency.has(v)) continue;
      if (color.get(v) === GRAY) {
        const cyclePath = [v, u];
        let cur = u;
        while (cur !== v) {
          cur = parent.get(cur) ?? '';
          if (!cur) break;
          cyclePath.push(cur);
        }
        cycle = cyclePath.reverse();
        return true;
      }
      if (color.get(v) === WHITE) {
        parent.set(v, u);
        if (dfs(v)) return true;
      }
    }
    color.set(u, BLACK);
    return false;
  }

  for (const name of adjacency.keys()) {
    if (color.get(name) === WHITE) {
      if (dfs(name)) {
        throw new Error(
          `Circular dependency detected: ${cycle.join(' → ')}`
        );
      }
    }
  }
}

export async function seedAdaptiveCurriculum(): Promise<{ message: string; summary: Record<string, number> }> {
  const allSkills: Array<{ skillCode: string; name: string; prerequisiteSkillNames?: string[] }> = [];

  for (const grade of curriculumSeedData.grades) {
    for (const domain of grade.domains) {
      for (const skillData of domain.skills) {
        const skill = skillData as typeof skillData & { prerequisiteSkillNames?: string[] };
        allSkills.push({ skillCode: skill.skillCode, name: skill.name, prerequisiteSkillNames: skill.prerequisiteSkillNames });
      }
    }
  }

  detectCycle(allSkills);

  const summary = await prisma.$transaction(async (tx) => {
    let gradesProcessed = 0;
    let domainsProcessed = 0;
    let skillsProcessed = 0;
    let tagsProcessed = 0;
    let activitiesProcessed = 0;
    let assessmentsProcessed = 0;
    let dependenciesProcessed = 0;

    for (const grade of curriculumSeedData.grades) {
      await tx.curriculumGrade.upsert({
        where: { gradeNumber: grade.gradeNumber },
        create: { gradeNumber: grade.gradeNumber, title: grade.title, description: grade.description },
        update: { title: grade.title, description: grade.description },
      });
      gradesProcessed++;

      for (const domain of grade.domains) {
        const subject = await tx.subject.findUnique({ where: { name: domain.subjectName } });
        if (!subject) throw new Error(`Subject "${domain.subjectName}" not found`);

        const domainRecord = await tx.curriculumDomain.upsert({
          where: { name_subjectId: { name: domain.name, subjectId: subject.id } },
          update: { description: domain.description, displayOrder: domain.displayOrder },
          create: { name: domain.name, description: domain.description, subjectId: subject.id, displayOrder: domain.displayOrder },
        });
        domainsProcessed++;

        for (const skillData of domain.skills) {
          const skill = skillData as typeof skillData & { prerequisiteSkillNames?: string[] };

          const skillRecord = await tx.skill.upsert({
            where: { skillCode: skill.skillCode },
            update: {
              name: skill.name,
              subjectId: subject.id,
              domainId: domainRecord.id,
              description: skill.description,
              difficulty: skill.difficulty,
              estimatedAge: skill.estimatedAge,
              isRootSkill: skill.isRootSkill,
              bloomLevel: skill.bloomLevel,
              masteryThreshold: skill.masteryThreshold,
              estimatedDuration: skill.estimatedDuration,
              recommendedActivityType: skill.recommendedActivityType,
              recommendedAssessmentType: skill.recommendedAssessmentType,
              revisionInterval: skill.revisionInterval,
              originalGrade: skill.originalGrade ?? grade.gradeNumber,
              originalMonth: skill.originalMonth,
              displayOrder: skill.displayOrder,
              isCoreSkill: skill.isCoreSkill,
              isOptionalSkill: skill.isOptionalSkill,
              learningObjective: skill.learningObjective,
            },
            create: {
              skillCode: skill.skillCode,
              name: skill.name,
              subjectId: subject.id,
              domainId: domainRecord.id,
              description: skill.description,
              difficulty: skill.difficulty,
              estimatedAge: skill.estimatedAge,
              isRootSkill: skill.isRootSkill,
              bloomLevel: skill.bloomLevel,
              masteryThreshold: skill.masteryThreshold,
              estimatedDuration: skill.estimatedDuration,
              recommendedActivityType: skill.recommendedActivityType,
              recommendedAssessmentType: skill.recommendedAssessmentType,
              revisionInterval: skill.revisionInterval,
              originalGrade: skill.originalGrade ?? grade.gradeNumber,
              originalMonth: skill.originalMonth,
              displayOrder: skill.displayOrder,
              isCoreSkill: skill.isCoreSkill,
              isOptionalSkill: skill.isOptionalSkill,
              learningObjective: skill.learningObjective,
            },
          });
          skillsProcessed++;

          if (skill.tags?.length) {
            await tx.skillTag.deleteMany({ where: { skillId: skillRecord.id } });
            await tx.skillTag.createMany({
              data: skill.tags.map((tag: string) => ({ skillId: skillRecord.id, tag })),
            });
            tagsProcessed += skill.tags.length;
          }

          if (skill.activities?.length) {
            await tx.skillActivity.deleteMany({ where: { skillId: skillRecord.id } });
            for (const activity of skill.activities) {
              await tx.skillActivity.create({
                data: {
                  skillId: skillRecord.id,
                  title: activity.title,
                  activityType: activity.activityType,
                  contentUrl: activity.contentUrl,
                  description: activity.description,
                  displayOrder: activity.displayOrder,
                },
              });
            }
            activitiesProcessed += skill.activities.length;
          }

          if (skill.assessments?.length) {
            await tx.skillAssessment.deleteMany({ where: { skillId: skillRecord.id } });
            for (const assessment of skill.assessments) {
              await tx.skillAssessment.create({
                data: {
                  skillId: skillRecord.id,
                  title: assessment.title,
                  assessmentType: assessment.assessmentType,
                  description: assessment.description,
                  maxScore: assessment.maxScore,
                  passingScore: assessment.passingScore,
                },
              });
            }
            assessmentsProcessed += skill.assessments.length;
          }
        }
      }
    }

    // Build skill name→id map from the database for dependency resolution
    const dbSkills = await tx.skill.findMany({ select: { id: true, name: true, skillCode: true } });
    const nameToId = new Map<string, string>(dbSkills.map((s) => [s.name, s.id]));

    for (const entry of allSkills) {
      if (!entry.prerequisiteSkillNames?.length) continue;

      const childSkillId = nameToId.get(entry.name);
      if (!childSkillId) continue;

      await tx.skillDependency.deleteMany({ where: { childSkillId } });

      for (const prereqName of entry.prerequisiteSkillNames) {
        const parentSkillId = nameToId.get(prereqName);
        if (!parentSkillId) {
          throw new Error(`Missing prerequisite skill: "${prereqName}" required by "${entry.name}"`);
        }
        await tx.skillDependency.create({
          data: { parentSkillId, childSkillId, weight: 1.0 },
        });
        dependenciesProcessed++;
      }
    }

    return {
      grades: gradesProcessed,
      domains: domainsProcessed,
      skills: skillsProcessed,
      tags: tagsProcessed,
      activities: activitiesProcessed,
      assessments: assessmentsProcessed,
      dependencies: dependenciesProcessed,
    };
  });

  return { message: 'Adaptive curriculum seeded successfully', summary };
}

async function main() {
  try {
    const result = await seedAdaptiveCurriculum();
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
}

main();
