-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('client', 'vendeur', 'admin');

-- CreateEnum
CREATE TYPE "public"."Status" AS ENUM ('enAttente', 'rupture', 'enStoke');

-- CreateEnum
CREATE TYPE "public"."MoyenDePayement" AS ENUM ('Tmoney', 'Flooz');

-- CreateEnum
CREATE TYPE "public"."Taille" AS ENUM ('L', 'S', 'M', 'XL', 'XXL', 'XXXL');

-- CreateEnum
CREATE TYPE "public"."TypeCategorie" AS ENUM ('Homme', 'Femme', 'Enfant');

-- CreateTable
CREATE TABLE "public"."Users" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL,

    CONSTRAINT "Users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Commande" (
    "id" SERIAL NOT NULL,
    "montant" DECIMAL(10,2) NOT NULL,
    "localisation" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "public"."Status" NOT NULL DEFAULT 'enAttente',
    "usersId" INTEGER NOT NULL,

    CONSTRAINT "Commande_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Payement" (
    "id" SERIAL NOT NULL,
    "montant" DECIMAL(10,2) NOT NULL,
    "moyenDePayement" "public"."MoyenDePayement" NOT NULL,
    "commandeId" INTEGER NOT NULL,

    CONSTRAINT "Payement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LigneCommande" (
    "id" SERIAL NOT NULL,
    "prixUnitaire" DECIMAL(10,2) NOT NULL,
    "quantité" INTEGER NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "commandeId" INTEGER NOT NULL,
    "produitId" INTEGER NOT NULL,

    CONSTRAINT "LigneCommande_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Produit" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "prix" DECIMAL(10,2) NOT NULL,
    "image" TEXT,
    "taille" "public"."Taille" NOT NULL,
    "categorieId" INTEGER NOT NULL,

    CONSTRAINT "Produit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Categorie" (
    "id" SERIAL NOT NULL,
    "type" "public"."TypeCategorie" NOT NULL,

    CONSTRAINT "Categorie_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Users_email_key" ON "public"."Users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Payement_commandeId_key" ON "public"."Payement"("commandeId");

-- AddForeignKey
ALTER TABLE "public"."Commande" ADD CONSTRAINT "Commande_usersId_fkey" FOREIGN KEY ("usersId") REFERENCES "public"."Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Payement" ADD CONSTRAINT "Payement_commandeId_fkey" FOREIGN KEY ("commandeId") REFERENCES "public"."Commande"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LigneCommande" ADD CONSTRAINT "LigneCommande_commandeId_fkey" FOREIGN KEY ("commandeId") REFERENCES "public"."Commande"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LigneCommande" ADD CONSTRAINT "LigneCommande_produitId_fkey" FOREIGN KEY ("produitId") REFERENCES "public"."Produit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Produit" ADD CONSTRAINT "Produit_categorieId_fkey" FOREIGN KEY ("categorieId") REFERENCES "public"."Categorie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
