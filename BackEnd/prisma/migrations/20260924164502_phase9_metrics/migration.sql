/*
  Warnings:

  - You are about to drop the column `containerName` on the `container_metrics` table. All the data in the column will be lost.
  - You are about to drop the column `cpuUsage` on the `container_metrics` table. All the data in the column will be lost.
  - You are about to drop the column `networkRx` on the `container_metrics` table. All the data in the column will be lost.
  - You are about to drop the column `networkTx` on the `container_metrics` table. All the data in the column will be lost.
  - You are about to drop the column `pids` on the `container_metrics` table. All the data in the column will be lost.
  - Added the required column `blockReadBytes` to the `container_metrics` table without a default value. This is not possible if the table is not empty.
  - Added the required column `blockWriteBytes` to the `container_metrics` table without a default value. This is not possible if the table is not empty.
  - Added the required column `cpuPercent` to the `container_metrics` table without a default value. This is not possible if the table is not empty.
  - Added the required column `memoryPercent` to the `container_metrics` table without a default value. This is not possible if the table is not empty.
  - Added the required column `networkRxBytes` to the `container_metrics` table without a default value. This is not possible if the table is not empty.
  - Added the required column `networkTxBytes` to the `container_metrics` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "container_metrics_containerId_idx";

-- DropIndex
DROP INDEX "container_metrics_timestamp_idx";

-- AlterTable
ALTER TABLE "container_metrics" DROP COLUMN "containerName",
DROP COLUMN "cpuUsage",
DROP COLUMN "networkRx",
DROP COLUMN "networkTx",
DROP COLUMN "pids",
ADD COLUMN     "blockReadBytes" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "blockWriteBytes" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "cpuPercent" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "memoryPercent" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "networkRxBytes" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "networkTxBytes" DOUBLE PRECISION NOT NULL,
ALTER COLUMN "timestamp" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "container_metrics_containerId_timestamp_idx" ON "container_metrics"("containerId", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "container_metrics_timestamp_idx" ON "container_metrics"("timestamp" DESC);
