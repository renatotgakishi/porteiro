-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "themeId" TEXT;

-- CreateTable
CREATE TABLE "Theme" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "style" TEXT NOT NULL DEFAULT 'flat',
    "colorsLight" JSONB NOT NULL,
    "colorsDark" JSONB NOT NULL,
    "backgroundLight" JSONB NOT NULL,
    "backgroundDark" JSONB NOT NULL,
    "glassConfig" JSONB,
    "shadows" JSONB,
    "radius" JSONB,
    "typography" JSONB,
    "density" TEXT NOT NULL DEFAULT 'comfortable',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "dateAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Theme_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Theme_slug_key" ON "Theme"("slug");

-- AddForeignKey
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_themeId_fkey" FOREIGN KEY ("themeId") REFERENCES "Theme"("id") ON DELETE SET NULL ON UPDATE CASCADE;
