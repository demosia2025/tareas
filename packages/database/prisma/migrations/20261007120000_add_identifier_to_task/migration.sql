-- AlterTable
ALTER TABLE "tasks" ADD COLUMN "identifier" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE UNIQUE INDEX "Task_identifier_key" ON "tasks"("identifier");