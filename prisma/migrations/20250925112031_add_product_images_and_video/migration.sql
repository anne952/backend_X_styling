/*
  Warnings:

  - You are about to drop the column `image` on the `Produit` table. All the data in the column will be lost.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."Status" ADD VALUE 'annulee';
ALTER TYPE "public"."Status" ADD VALUE 'livree';

-- AlterTable
ALTER TABLE "public"."Produit" DROP COLUMN "image",
ADD COLUMN     "video" TEXT;

-- AlterTable
ALTER TABLE "public"."Users" ADD COLUMN     "expoPushToken" TEXT;

-- CreateTable
CREATE TABLE "public"."product_images" (
    "id" SERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "productId" INTEGER NOT NULL,

    CONSTRAINT "product_images_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."product_images" ADD CONSTRAINT "product_images_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Produit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
