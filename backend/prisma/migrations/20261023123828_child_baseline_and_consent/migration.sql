-- Parental consent, recorded before the first child profile is created.
ALTER TABLE "users" ADD COLUMN "parental_consent_at" TIMESTAMP(3),
ADD COLUMN "parental_consent_version" TEXT;

-- Baseline questionnaire result: one per child, pseudonymous (child id only).
CREATE TABLE "child_baselines" (
    "id" TEXT NOT NULL,
    "child_id" TEXT NOT NULL,
    "assessed_at" TIMESTAMP(3) NOT NULL,
    "grade" TEXT NOT NULL,
    "domains" JSONB NOT NULL,
    "strengths" JSONB NOT NULL,
    "focus_areas" JSONB NOT NULL,
    "skipped" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "child_baselines_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "child_baselines_child_id_key" ON "child_baselines"("child_id");

ALTER TABLE "child_baselines" ADD CONSTRAINT "child_baselines_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;
