/*
  Warnings:

  - You are about to drop the column `couleurId` on the `Produit` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Produit" DROP CONSTRAINT "Produit_couleurId_fkey";

-- AlterTable
ALTER TABLE "public"."Couleur" ADD COLUMN     "hex" TEXT;

-- AlterTable
ALTER TABLE "public"."Produit" DROP COLUMN "couleurId",
ADD COLUMN     "enPromotion" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "prixPromotion" DECIMAL(10,2);

-- CreateTable
CREATE TABLE "public"."CouleurOnProduit" (
    "produitId" INTEGER NOT NULL,
    "couleurId" INTEGER NOT NULL,

    CONSTRAINT "CouleurOnProduit_pkey" PRIMARY KEY ("produitId","couleurId")
);

-- AddForeignKey
ALTER TABLE "public"."CouleurOnProduit" ADD CONSTRAINT "CouleurOnProduit_produitId_fkey" FOREIGN KEY ("produitId") REFERENCES "public"."Produit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CouleurOnProduit" ADD CONSTRAINT "CouleurOnProduit_couleurId_fkey" FOREIGN KEY ("couleurId") REFERENCES "public"."Couleur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
