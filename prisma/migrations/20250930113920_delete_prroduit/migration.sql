-- DropForeignKey
ALTER TABLE "public"."LigneCommande" DROP CONSTRAINT "LigneCommande_produitId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Produit" DROP CONSTRAINT "Produit_vendeurId_fkey";

-- AddForeignKey
ALTER TABLE "public"."LigneCommande" ADD CONSTRAINT "LigneCommande_produitId_fkey" FOREIGN KEY ("produitId") REFERENCES "public"."Produit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Produit" ADD CONSTRAINT "Produit_vendeurId_fkey" FOREIGN KEY ("vendeurId") REFERENCES "public"."Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
