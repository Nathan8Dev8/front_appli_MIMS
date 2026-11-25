-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "content_html" TEXT,
ALTER COLUMN "storage_key" DROP NOT NULL,
ALTER COLUMN "sha256" DROP NOT NULL;
