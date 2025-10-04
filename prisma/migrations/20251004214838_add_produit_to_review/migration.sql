/*
  Warnings:

  - You are about to drop the column `vendeurId` on the `reviews` table. All the data in the column will be lost.
  - Added the required column `productId` to the `reviews` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."reviews" DROP CONSTRAINT "reviews_vendeurId_fkey";

-- AlterTable
ALTER TABLE "public"."reviews" DROP COLUMN "vendeurId",
ADD COLUMN     "productId" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "public"."TailleOnProduit" (
    "produitId" INTEGER NOT NULL,
    "taille" "public"."Taille" NOT NULL,

    CONSTRAINT "TailleOnProduit_pkey" PRIMARY KEY ("produitId","taille")
);

-- AddForeignKey
ALTER TABLE "public"."reviews" ADD CONSTRAINT "reviews_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Produit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TailleOnProduit" ADD CONSTRAINT "TailleOnProduit_produitId_fkey" FOREIGN KEY ("produitId") REFERENCES "public"."Produit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
