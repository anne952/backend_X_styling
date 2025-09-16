/*
  Warnings:

  - The values [enStoke] on the enum `Status` will be removed. If these variants are still used in the database, this will fail.
  - Added the required column `couleurId` to the `Produit` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."Status_new" AS ENUM ('enAttente', 'rupture', 'en_cours_pour_la_livraison');
ALTER TABLE "public"."Commande" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."Commande" ALTER COLUMN "status" TYPE "public"."Status_new" USING ("status"::text::"public"."Status_new");
ALTER TYPE "public"."Status" RENAME TO "Status_old";
ALTER TYPE "public"."Status_new" RENAME TO "Status";
DROP TYPE "public"."Status_old";
ALTER TABLE "public"."Commande" ALTER COLUMN "status" SET DEFAULT 'enAttente';
COMMIT;

-- AlterTable
ALTER TABLE "public"."Produit" ADD COLUMN     "couleurId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "public"."Users" ADD COLUMN     "photoProfil" TEXT;

-- CreateTable
CREATE TABLE "public"."Couleur" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,

    CONSTRAINT "Couleur_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Couleur_nom_key" ON "public"."Couleur"("nom");

-- AddForeignKey
ALTER TABLE "public"."Produit" ADD CONSTRAINT "Produit_couleurId_fkey" FOREIGN KEY ("couleurId") REFERENCES "public"."Couleur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
