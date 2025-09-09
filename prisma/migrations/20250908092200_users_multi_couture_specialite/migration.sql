/*
  Warnings:

  - Changed the column `typeCouture` on the `Users` table from a scalar field to a list field. If there are non-null values in that column, this step will fail.
  - Changed the column `specialite` on the `Users` table from a scalar field to a list field. If there are non-null values in that column, this step will fail.

*/
-- AlterTable
ALTER TABLE "public"."Users"
  ALTER COLUMN "typeCouture" SET DATA TYPE "public"."TypeCouture"[] USING ARRAY["typeCouture"]::"public"."TypeCouture"[],
  ALTER COLUMN "specialite"  SET DATA TYPE "public"."Specialite"[]  USING ARRAY["specialite"]::"public"."Specialite"[];

