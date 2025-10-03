import { Router } from "express";
import { Prisma } from "@prisma/client";  
import prisma from "../prisma";          

import { authenticate, requireRoles } from "../middleware/auth";

const router = Router();

// --- GET produits (publique, avec pagination)
router.get("/", async (req, res) => {
  const skip = Number(req.query.skip) || 0;
  const take = Number(req.query.take) || 20;

  const produits = await prisma.produit.findMany({
    skip,
    take,
    include: {
      categorie: true,
      productImages: true,
      couleurs: { include: { couleur: true } },
      vendeur: { select: { id: true, email: true, telephone: true } }
    },
    orderBy: { id: "desc" },
  });

  res.json(produits);
});

// --- POST produit (admin ou vendeur)
// --- POST produit (admin ou vendeur)
router.post(
  "/",
  authenticate,
  requireRoles("admin", "vendeur"),
  async (req, res) => {
    try {
      const {
        nom,
        description,
        prix,
        taille,
        video,
        images,
      } = req.body as {
        nom: string;
        description: string;
        prix: string;
        taille: "L" | "S" | "M" | "XL" | "XXL" | "XXXL";
        video?: string;
        images?: string[];
      };

      const categorieId = Number((req.body as any).categorieId);
      const couleurId = Number((req.body as any).couleurId);

      // --- Validation categorie
      if (!categorieId || Number.isNaN(categorieId)) {
        return res.status(400).json({ message: "categorieId invalide" });
      }
      const cat = await prisma.categorie.findUnique({ where: { id: categorieId } });
      if (!cat) {
        return res.status(400).json({ message: `Categorie introuvable: ${categorieId}` });
      }

      // --- Validation couleur
      if (!couleurId || Number.isNaN(couleurId)) {
        return res.status(400).json({ message: "couleurId invalide" });
      }
      const color = await prisma.couleur.findUnique({ where: { id: couleurId } });
      if (!color) {
        return res.status(400).json({ message: `Couleur introuvable: ${couleurId}` });
      }

      // --- Déterminer le vendeurId
      let vendeurId: number | undefined;
      if (req.user!.role === "vendeur") {
        vendeurId = req.user!.id;
      } else {
        const bodyVendeurId = (req.body as any).vendeurId;
        if (bodyVendeurId !== undefined && bodyVendeurId !== null) {
          const vid = Number(bodyVendeurId);
          if (Number.isNaN(vid)) {
            return res.status(400).json({ message: "vendeurId invalide" });
          }
          const vendeur = await prisma.users.findUnique({ where: { id: vid } });
          if (!vendeur || vendeur.role !== "vendeur") {
            return res.status(400).json({
              message: `vendeurId ${vid} invalide (utilisateur introuvable ou rôle ≠ vendeur)`,
            });
          }
          vendeurId = vid;
        }
      }

      // --- Validation images et vidéo obligatoires
      if (!images || !Array.isArray(images) || images.length === 0) {
        return res.status(400).json({ message: "Au moins une image est requise pour le produit" });
      }

      // --- Création du produit
      const created = await prisma.produit.create({
        data: {
          nom,
          description,
          prix: new Prisma.Decimal(prix),
          taille,
          categorieId,
          vendeurId,
          video,
          couleurs: { create: [{ couleurId }] },
        },
      });

      // --- Créer les images du produit
      const productImages = images.map((url: string) => ({
        url,
        productId: created.id,
      }));
      await prisma.productImage.createMany({ data: productImages });

      // --- Retourner le produit complet AVEC vendeur
      const productWithRelations = await prisma.produit.findUnique({
        where: { id: created.id },
        include: {
          categorie: true,
          productImages: true,
          couleurs: { include: { couleur: true } },
          vendeur: { select: { id: true, email: true, telephone: true } },
        },
      });

      res.status(201).json(productWithRelations);
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ message: "Erreur serveur lors de la création du produit" });
    }
  }
);
