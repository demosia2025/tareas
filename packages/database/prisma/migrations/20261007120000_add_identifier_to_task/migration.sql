-- AlterTable
ALTER TABLE "Task" ADD COLUMN "identifier" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE UNIQUE INDEX "Task_identifier_key" ON "Task"("identifier");