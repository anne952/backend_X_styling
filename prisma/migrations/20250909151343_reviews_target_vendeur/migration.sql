/*
  Warnings:

  - You are about to drop the column `productId` on the `reviews` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,vendeurId]` on the table `reviews` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `vendeurId` to the `reviews` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."reviews" DROP CONSTRAINT "reviews_productId_fkey";

-- DropIndex
DROP INDEX "public"."reviews_userId_productId_key";

-- AlterTable
ALTER TABLE "public"."reviews" DROP COLUMN "productId",
ADD COLUMN     "vendeurId" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "reviews_userId_vendeurId_key" ON "public"."reviews"("userId", "vendeurId");

-- AddForeignKey
ALTER TABLE "public"."reviews" ADD CONSTRAINT "reviews_vendeurId_fkey" FOREIGN KEY ("vendeurId") REFERENCES "public"."Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
