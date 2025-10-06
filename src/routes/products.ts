import { Router } from "express";
import { Prisma } from "@prisma/client";  
import prisma from "../prisma";          

import { authenticate, requireRoles } from "../middleware/auth";

const router = Router();

// Nouvelle route : infos vendeur pour un produit spécifique
router.get("/:id/vendeur", async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ message: "id invalide" });
  const produit = await prisma.produit.findUnique({
    where: { id },
    include: {
      vendeur: { select: { id: true, email: true, telephone: true, photoProfil: true, localisation: true, commentaire: true, specialite: true, nom: true } }
    }
  });
  if (!produit) return res.status(404).json({ message: "Produit introuvable" });
  res.json({
    produitId: produit.id,
    vendeur: produit.vendeur ? {
      id: produit.vendeur.id,
      nom: produit.vendeur.nom,
      email: produit.vendeur.email,
      telephone: produit.vendeur.telephone,
      photoProfil: produit.vendeur.photoProfil,
      localisation: produit.vendeur.localisation,
      commentaire: produit.vendeur.commentaire,
      specialite: produit.vendeur.specialite
    } : null
  });
});

// Nouvelle route : infos vendeur pour chaque produit publié
router.get("/vendeur", async (req, res) => {
  const produits = await prisma.produit.findMany({
    include: {
      vendeur: { select: { id: true, email: true, telephone: true, photoProfil: true, localisation: true, commentaire: true, specialite: true, nom: true } }
    }
  });
  // On retourne uniquement les infos vendeur pour chaque produit
  const result = produits.map(p => ({
    produitId: p.id,
    vendeur: p.vendeur ? {
      id: p.vendeur.id,
      nom: p.vendeur.nom,
      email: p.vendeur.email,
      telephone: p.vendeur.telephone,
      photoProfil: p.vendeur.photoProfil,
      localisation: p.vendeur.localisation,
      commentaire: p.vendeur.commentaire,
      specialite: p.vendeur.specialite
    } : null
  }));
  res.json(result);
});

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
      tailles: true,
      vendeur: { select: { id: true, email: true, telephone: true, photoProfil: true, localisation: true, commentaire: true, specialite: true } }
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
        images
      } = req.body as {
        nom: string;
        description: string;
        prix: string;
        taille: "L" | "S" | "M" | "XL" | "XXL" | "XXXL";
        video?: string;
        images?: string[];
      };
      const prixPromotion = (req.body as any).prixPromotion;

      const categorieId = Number((req.body as any).categorieId);
      // Supporte soit un id unique (couleurId), soit un tableau (couleurIds)
      const rawCouleurId = (req.body as any).couleurId;
      const rawCouleurIds = (req.body as any).couleurIds;
      const couleurIdsInput: unknown = rawCouleurIds ?? rawCouleurId;
      const couleurIds: number[] = Array.isArray(couleurIdsInput)
        ? (couleurIdsInput as any[]).map((v) => Number(v))
        : (couleurIdsInput !== undefined && couleurIdsInput !== null)
          ? [Number(couleurIdsInput)]
          : [];
      const tailles: ("L" | "S" | "M" | "XL" | "XXL" | "XXXL")[] = (req.body as any).tailles;

      // --- Validation categorie
      if (!categorieId || Number.isNaN(categorieId)) {
        return res.status(400).json({ message: "categorieId invalide" });
      }
      const cat = await prisma.categorie.findUnique({ where: { id: categorieId } });
      if (!cat) {
        return res.status(400).json({ message: `Categorie introuvable: ${categorieId}` });
      }

      // --- Validation couleurs (multi)
      if (!couleurIds || !Array.isArray(couleurIds) || couleurIds.length === 0) {
        return res.status(400).json({ message: "Au moins une couleur est requise (utiliser couleurIds)" });
      }
      if (couleurIds.some((id) => Number.isNaN(id) || id <= 0)) {
        return res.status(400).json({ message: "couleurIds doit contenir des identifiants valides" });
      }
      const existingColors = await prisma.couleur.findMany({ where: { id: { in: couleurIds } }, select: { id: true } });
      if (existingColors.length !== couleurIds.length) {
        const foundIds = new Set(existingColors.map(c => c.id));
        const missing = couleurIds.filter(id => !foundIds.has(id));
        return res.status(400).json({ message: `Couleur(s) introuvable(s): ${missing.join(', ')}` });
      }

      // --- Validation tailles
      if (!tailles || !Array.isArray(tailles) || tailles.length === 0) {
        return res.status(400).json({ message: "Au moins une taille est requise" });
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
          prixPromotion: prixPromotion ? new Prisma.Decimal(prixPromotion) : null,
          couleurs: { create: couleurIds.map((cid) => ({ couleurId: cid })) },
          tailles: { create: tailles.map(t => ({ taille: t })) },
        },
      });
      
      // --- Console log pour vérifier la création
      console.log(`Produit créé : id=${created.id}, nom=${created.nom}, vendeurId=${vendeurId}`);
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
          tailles: true,
          vendeur: { select: { id: true, email: true, telephone: true, photoProfil: true, localisation: true, commentaire: true, specialite: true ,nom: true} },
        },
      });

      const taillesList = (productWithRelations?.tailles || []).map(t => t.taille);
      const couleursList = (productWithRelations?.couleurs || []).map(c => ({
        id: c.couleur.id,
        nom: c.couleur.nom,
        hex: c.couleur.hex
      }));
      res.status(201).json({
        ...productWithRelations,
        taillesList,
        couleursList
      });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ message: "Erreur serveur lors de la création du produit" });
    }
  }
);

// --- DELETE produit (admin ou vendeur propriétaire)
router.delete(
  "/:id",
  authenticate,
  requireRoles("admin", "vendeur"),
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) {
        return res.status(400).json({ message: "ID produit invalide" });
      }

      // Vérifier que le produit existe
      const existingProduct = await prisma.produit.findUnique({
        where: { id },
        include: { vendeur: { select: { id: true } } }
      });

      if (!existingProduct) {
        return res.status(404).json({ message: "Produit introuvable" });
      }

      // Vérification de propriété pour les vendeurs
      if (req.user!.role === "vendeur") {
        if (!existingProduct.vendeur || existingProduct.vendeur.id !== req.user!.id) {
          return res.status(403).json({ 
            message: "Accès refusé : vous ne pouvez supprimer que vos propres produits" 
          });
        }
      }

      // Supprimer le produit (cascade automatique pour les relations)
      await prisma.produit.delete({
        where: { id }
      });

      return res.json({ 
        message: "✅ Produit supprimé avec succès",
        deletedProductId: id 
      });

    } catch (error) {
      console.error("❌ Erreur lors de la suppression du produit:", error);
      return res.status(500).json({ 
        message: "Erreur serveur lors de la suppression du produit" 
      });
    }
  }
);

export default router;
