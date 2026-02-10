-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('Foundation', 'Pro', 'Enterprise');

-- CreateEnum
CREATE TYPE "CustomerStatus" AS ENUM ('Active', 'Paused', 'Cancelled');

-- CreateEnum
CREATE TYPE "ScopeType" AS ENUM ('ip_range', 'domain', 'subdomain');

-- CreateEnum
CREATE TYPE "TestType" AS ENUM ('soft_scan', 'full_pen_test');

-- CreateEnum
CREATE TYPE "Frequency" AS ENUM ('daily', 'weekly', 'monthly', 'custom');

-- CreateEnum
CREATE TYPE "TestRunStatus" AS ENUM ('Scheduled', 'Running', 'Completed', 'Failed');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('New', 'Reviewed', 'Sent');

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "contractType" "ContractType" NOT NULL,
    "contractStartDate" TIMESTAMP(3) NOT NULL,
    "contractLengthMonths" INTEGER NOT NULL,
    "status" "CustomerStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerNote" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerConsent" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileMimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "fileData" BYTEA NOT NULL,
    "agreedAt" TIMESTAMP(3) NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerConsent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scope" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "type" "ScopeType" NOT NULL,
    "value" TEXT NOT NULL,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Scope_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestConfiguration" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "testType" "TestType" NOT NULL,
    "frequency" "Frequency" NOT NULL,
    "cronExpression" TEXT,
    "preferredRunWindow" JSONB NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestRun" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "scheduledTime" TIMESTAMP(3) NOT NULL,
    "status" "TestRunStatus" NOT NULL,
    "engineOutputReference" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TestRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestRunScope" (
    "testRunId" TEXT NOT NULL,
    "scopeId" TEXT NOT NULL,

    CONSTRAINT "TestRunScope_pkey" PRIMARY KEY ("testRunId","scopeId")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "severitySummary" JSONB NOT NULL,
    "reportFile" TEXT NOT NULL,
    "rawDataFile" TEXT NOT NULL,
    "generatedTimestamp" TIMESTAMP(3) NOT NULL,
    "sentToCustomer" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "status" "ReportStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomerNote_customerId_idx" ON "CustomerNote"("customerId");

-- CreateIndex
CREATE INDEX "CustomerConsent_customerId_idx" ON "CustomerConsent"("customerId");

-- CreateIndex
CREATE INDEX "Scope_customerId_idx" ON "Scope"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "TestConfiguration_customerId_key" ON "TestConfiguration"("customerId");

-- CreateIndex
CREATE INDEX "TestRun_customerId_idx" ON "TestRun"("customerId");

-- CreateIndex
CREATE INDEX "TestRunScope_scopeId_idx" ON "TestRunScope"("scopeId");

-- CreateIndex
CREATE UNIQUE INDEX "Report_runId_key" ON "Report"("runId");

-- CreateIndex
CREATE INDEX "Report_customerId_idx" ON "Report"("customerId");

-- AddForeignKey
ALTER TABLE "CustomerNote" ADD CONSTRAINT "CustomerNote_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerConsent" ADD CONSTRAINT "CustomerConsent_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scope" ADD CONSTRAINT "Scope_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestConfiguration" ADD CONSTRAINT "TestConfiguration_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestRun" ADD CONSTRAINT "TestRun_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestRunScope" ADD CONSTRAINT "TestRunScope_testRunId_fkey" FOREIGN KEY ("testRunId") REFERENCES "TestRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestRunScope" ADD CONSTRAINT "TestRunScope_scopeId_fkey" FOREIGN KEY ("scopeId") REFERENCES "Scope"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_runId_fkey" FOREIGN KEY ("runId") REFERENCES "TestRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
