-- DropIndex
DROP INDEX "users_resetToken_key";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "resetAttempts" INTEGER NOT NULL DEFAULT 0;
