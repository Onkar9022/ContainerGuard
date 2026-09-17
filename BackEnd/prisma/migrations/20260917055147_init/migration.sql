-- CreateTable
CREATE TABLE "container_metrics" (
    "id" TEXT NOT NULL,
    "containerId" TEXT NOT NULL,
    "containerName" TEXT NOT NULL,
    "cpuUsage" DOUBLE PRECISION NOT NULL,
    "memoryUsage" DOUBLE PRECISION NOT NULL,
    "memoryLimit" DOUBLE PRECISION NOT NULL,
    "networkRx" DOUBLE PRECISION NOT NULL,
    "networkTx" DOUBLE PRECISION NOT NULL,
    "pids" INTEGER NOT NULL DEFAULT 0,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "container_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "container_metrics_containerId_idx" ON "container_metrics"("containerId");

-- CreateIndex
CREATE INDEX "container_metrics_timestamp_idx" ON "container_metrics"("timestamp");
