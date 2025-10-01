-- DropForeignKey
ALTER TABLE "public"."CartItem" DROP CONSTRAINT "CartItem_produitId_fkey";

-- DropForeignKey
ALTER TABLE "public"."CartItem" DROP CONSTRAINT "CartItem_usersId_fkey";

-- DropForeignKey
ALTER TABLE "public"."CouleurOnProduit" DROP CONSTRAINT "CouleurOnProduit_couleurId_fkey";

-- DropForeignKey
ALTER TABLE "public"."CouleurOnProduit" DROP CONSTRAINT "CouleurOnProduit_produitId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Like" DROP CONSTRAINT "Like_produitId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Like" DROP CONSTRAINT "Like_usersId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Produit" DROP CONSTRAINT "Produit_categorieId_fkey";

-- AddForeignKey
ALTER TABLE "public"."Produit" ADD CONSTRAINT "Produit_categorieId_fkey" FOREIGN KEY ("categorieId") REFERENCES "public"."Categorie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CouleurOnProduit" ADD CONSTRAINT "CouleurOnProduit_produitId_fkey" FOREIGN KEY ("produitId") REFERENCES "public"."Produit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CouleurOnProduit" ADD CONSTRAINT "CouleurOnProduit_couleurId_fkey" FOREIGN KEY ("couleurId") REFERENCES "public"."Couleur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Like" ADD CONSTRAINT "Like_usersId_fkey" FOREIGN KEY ("usersId") REFERENCES "public"."Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Like" ADD CONSTRAINT "Like_produitId_fkey" FOREIGN KEY ("produitId") REFERENCES "public"."Produit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CartItem" ADD CONSTRAINT "CartItem_usersId_fkey" FOREIGN KEY ("usersId") REFERENCES "public"."Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CartItem" ADD CONSTRAINT "CartItem_produitId_fkey" FOREIGN KEY ("produitId") REFERENCES "public"."Produit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
