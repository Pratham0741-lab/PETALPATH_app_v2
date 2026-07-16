-- Add adaptive curriculum data layer models
ALTER TABLE "skills" ADD COLUMN "domain_id" TEXT;
ALTER TABLE "skills" ADD COLUMN "bloom_level" TEXT NOT NULL DEFAULT 'REMEMBER';
ALTER TABLE "skills" ADD COLUMN "mastery_threshold" DOUBLE PRECISION NOT NULL DEFAULT 80.0;
ALTER TABLE "skills" ADD COLUMN "estimated_duration" INTEGER NOT NULL DEFAULT 10;
ALTER TABLE "skills" ADD COLUMN "recommended_activity_type" TEXT;
ALTER TABLE "skills" ADD COLUMN "recommended_assessment_type" TEXT;
ALTER TABLE "skills" ADD COLUMN "revision_interval" INTEGER NOT NULL DEFAULT 7;
ALTER TABLE "skills" ADD COLUMN "original_grade" INTEGER;
ALTER TABLE "skills" ADD COLUMN "original_month" INTEGER;
ALTER TABLE "skills" ADD COLUMN "display_order" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "skills" ADD COLUMN "is_core_skill" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "skills" ADD COLUMN "is_optional_skill" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "skills" ADD COLUMN "learning_objective" TEXT;

CREATE TABLE "curriculum_grades" (
    "id" TEXT NOT NULL,
    "grade_number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "curriculum_grades_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "curriculum_grades_grade_number_key" ON "curriculum_grades"("grade_number");

CREATE TABLE "curriculum_domains" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "subject_id" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "curriculum_domains_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "curriculum_domains_name_subject_id_key" ON "curriculum_domains"("name", "subject_id");
CREATE INDEX "curriculum_domains_subject_id_idx" ON "curriculum_domains"("subject_id");

ALTER TABLE "curriculum_domains" ADD CONSTRAINT "curriculum_domains_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE CASCADE;

CREATE TABLE "skill_tags" (
    "id" TEXT NOT NULL,
    "skill_id" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skill_tags_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "skill_tags_skill_id_tag_key" ON "skill_tags"("skill_id", "tag");
CREATE INDEX "skill_tags_tag_idx" ON "skill_tags"("tag");

ALTER TABLE "skill_tags" ADD CONSTRAINT "skill_tags_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE CASCADE;

CREATE TABLE "skill_activities" (
    "id" TEXT NOT NULL,
    "skill_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "activity_type" TEXT NOT NULL,
    "content_url" TEXT,
    "description" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skill_activities_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "skill_activities_skill_id_idx" ON "skill_activities"("skill_id");

ALTER TABLE "skill_activities" ADD CONSTRAINT "skill_activities_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE CASCADE;

CREATE TABLE "skill_assessments" (
    "id" TEXT NOT NULL,
    "skill_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "assessment_type" TEXT NOT NULL,
    "description" TEXT,
    "max_score" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "passing_score" DOUBLE PRECISION NOT NULL DEFAULT 80,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skill_assessments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "skill_assessments_skill_id_idx" ON "skill_assessments"("skill_id");

ALTER TABLE "skill_assessments" ADD CONSTRAINT "skill_assessments_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE CASCADE;

CREATE INDEX "skills_domain_id_idx" ON "skills"("domain_id");
CREATE INDEX "skills_subject_id_idx" ON "skills"("subject_id");
CREATE INDEX "skills_original_grade_idx" ON "skills"("original_grade");
CREATE INDEX "skills_original_month_idx" ON "skills"("original_month");
CREATE INDEX "skills_is_core_skill_idx" ON "skills"("is_core_skill");

ALTER TABLE "skills" ADD CONSTRAINT "skills_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "curriculum_domains"("id") ON DELETE SET NULL;
