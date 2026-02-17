-- CreateEnum
CREATE TYPE "CustomerType" AS ENUM ('Direct', 'ITMS');

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN "customerType" "CustomerType" NOT NULL DEFAULT 'Direct';
