-- CreateTable
CREATE TABLE IF NOT EXISTS "security_scans" (
    "id" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "imageId" TEXT,
    "scanTimestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,
    "criticalCount" INTEGER NOT NULL DEFAULT 0,
    "highCount" INTEGER NOT NULL DEFAULT 0,
    "mediumCount" INTEGER NOT NULL DEFAULT 0,
    "lowCount" INTEGER NOT NULL DEFAULT 0,
    "unknownCount" INTEGER NOT NULL DEFAULT 0,
    "totalVulnerabilities" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "security_scans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "vulnerabilities" (
    "id" TEXT NOT NULL,
    "scanId" TEXT NOT NULL,
    "vulnerabilityId" TEXT NOT NULL,
    "packageName" TEXT NOT NULL,
    "installedVersion" TEXT NOT NULL,
    "fixedVersion" TEXT,
    "severity" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "primaryUrl" TEXT,
    "target" TEXT,

    CONSTRAINT "vulnerabilities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "security_scans_image_scanTimestamp_idx" ON "security_scans"("image", "scanTimestamp" DESC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "security_scans_image_idx" ON "security_scans"("image");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "vulnerabilities_scanId_idx" ON "vulnerabilities"("scanId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "vulnerabilities_severity_idx" ON "vulnerabilities"("severity");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "vulnerabilities_vulnerabilityId_idx" ON "vulnerabilities"("vulnerabilityId");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'vulnerabilities_scanId_fkey'
    ) THEN
        ALTER TABLE "vulnerabilities" ADD CONSTRAINT "vulnerabilities_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "security_scans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
