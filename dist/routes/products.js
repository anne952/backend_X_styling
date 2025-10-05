"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const prisma_1 = __importDefault(require("../prisma"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Nouvelle route : infos vendeur pour un produit spécifique
router.get("/:id/vendeur", async (req, res) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id))
        return res.status(400).json({ message: "id invalide" });
    const produit = await prisma_1.default.produit.findUnique({
        where: { id },
        include: {
            vendeur: { select: { id: true, email: true, telephone: true, photoProfil: true, localisation: true, commentaire: true, specialite: true } }
        }
    });
    if (!produit)
        return res.status(404).json({ message: "Produit introuvable" });
    res.json({
        produitId: produit.id,
        vendeur: produit.vendeur ? {
            id: produit.vendeur.id,
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
    const produits = await prisma_1.default.produit.findMany({
        include: {
            vendeur: { select: { id: true, email: true, telephone: true, photoProfil: true, localisation: true, commentaire: true, specialite: true } }
        }
    });
    // On retourne uniquement les infos vendeur pour chaque produit
    const result = produits.map(p => ({
        produitId: p.id,
        vendeur: p.vendeur ? {
            id: p.vendeur.id,
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
    const produits = await prisma_1.default.produit.findMany({
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
router.post("/", auth_1.authenticate, (0, auth_1.requireRoles)("admin", "vendeur"), async (req, res) => {
    try {
        const { nom, description, prix, taille, video, images, } = req.body;
        const categorieId = Number(req.body.categorieId);
        // Supporte soit un id unique (couleurId), soit un tableau (couleurIds)
        const rawCouleurId = req.body.couleurId;
        const rawCouleurIds = req.body.couleurIds;
        const couleurIdsInput = rawCouleurIds ?? rawCouleurId;
        const couleurIds = Array.isArray(couleurIdsInput)
            ? couleurIdsInput.map((v) => Number(v))
            : (couleurIdsInput !== undefined && couleurIdsInput !== null)
                ? [Number(couleurIdsInput)]
                : [];
        const tailles = req.body.tailles;
        // --- Validation categorie
        if (!categorieId || Number.isNaN(categorieId)) {
            return res.status(400).json({ message: "categorieId invalide" });
        }
        const cat = await prisma_1.default.categorie.findUnique({ where: { id: categorieId } });
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
        const existingColors = await prisma_1.default.couleur.findMany({ where: { id: { in: couleurIds } }, select: { id: true } });
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
        let vendeurId;
        if (req.user.role === "vendeur") {
            vendeurId = req.user.id;
        }
        else {
            const bodyVendeurId = req.body.vendeurId;
            if (bodyVendeurId !== undefined && bodyVendeurId !== null) {
                const vid = Number(bodyVendeurId);
                if (Number.isNaN(vid)) {
                    return res.status(400).json({ message: "vendeurId invalide" });
                }
                const vendeur = await prisma_1.default.users.findUnique({ where: { id: vid } });
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
        const created = await prisma_1.default.produit.create({
            data: {
                nom,
                description,
                prix: new client_1.Prisma.Decimal(prix),
                taille,
                categorieId,
                vendeurId,
                video,
                couleurs: { create: couleurIds.map((cid) => ({ couleurId: cid })) },
                tailles: { create: tailles.map(t => ({ taille: t })) },
            },
        });
        // --- Console log pour vérifier la création
        console.log(`Produit créé : id=${created.id}, nom=${created.nom}, vendeurId=${vendeurId}`);
        // --- Créer les images du produit
        const productImages = images.map((url) => ({
            url,
            productId: created.id,
        }));
        await prisma_1.default.productImage.createMany({ data: productImages });
        // --- Retourner le produit complet AVEC vendeur
        const productWithRelations = await prisma_1.default.produit.findUnique({
            where: { id: created.id },
            include: {
                categorie: true,
                productImages: true,
                couleurs: { include: { couleur: true } },
                vendeur: { select: { id: true, email: true, telephone: true } },
            },
        });
        res.status(201).json(productWithRelations);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Erreur serveur lors de la création du produit" });
    }
});
// --- DELETE produit (admin ou vendeur propriétaire)
router.delete("/:id", auth_1.authenticate, (0, auth_1.requireRoles)("admin", "vendeur"), async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (Number.isNaN(id)) {
            return res.status(400).json({ message: "ID produit invalide" });
        }
        // Vérifier que le produit existe
        const existingProduct = await prisma_1.default.produit.findUnique({
            where: { id },
            include: { vendeur: { select: { id: true } } }
        });
        if (!existingProduct) {
            return res.status(404).json({ message: "Produit introuvable" });
        }
        // Vérification de propriété pour les vendeurs
        if (req.user.role === "vendeur") {
            if (!existingProduct.vendeur || existingProduct.vendeur.id !== req.user.id) {
                return res.status(403).json({
                    message: "Accès refusé : vous ne pouvez supprimer que vos propres produits"
                });
            }
        }
        // Supprimer le produit (cascade automatique pour les relations)
        await prisma_1.default.produit.delete({
            where: { id }
        });
        return res.json({
            message: "✅ Produit supprimé avec succès",
            deletedProductId: id
        });
    }
    catch (error) {
        console.error("❌ Erreur lors de la suppression du produit:", error);
        return res.status(500).json({
            message: "Erreur serveur lors de la suppression du produit"
        });
    }
});
exports.default = router;
