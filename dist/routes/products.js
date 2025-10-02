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
// --- GET produits (publique, avec pagination)
router.get("/", async (req, res) => {
    const skip = Number(req.query.skip) || 0;
    const take = Number(req.query.take) || 20;
    const produits = await prisma_1.default.produit.findMany({
        skip,
        take,
        include: { categorie: true, productImages: true, couleurs: { include: { couleur: true } } },
        orderBy: { id: "desc" },
    });
    res.json(produits);
});
// --- POST produit (admin ou vendeur)
router.post("/", auth_1.authenticate, (0, auth_1.requireRoles)("admin", "vendeur"), async (req, res) => {
    try {
        const { nom, description, prix, taille, video, images, } = req.body;
        const categorieId = Number(req.body.categorieId);
        const couleurId = Number(req.body.couleurId);
        // --- Validation categorie
        if (!categorieId || Number.isNaN(categorieId)) {
            return res.status(400).json({ message: "categorieId invalide" });
        }
        const cat = await prisma_1.default.categorie.findUnique({ where: { id: categorieId } });
        if (!cat) {
            return res.status(400).json({ message: `Categorie introuvable: ${categorieId}` });
        }
        // --- Validation couleur
        if (!couleurId || Number.isNaN(couleurId)) {
            return res.status(400).json({ message: "couleurId invalide" });
        }
        const color = await prisma_1.default.couleur.findUnique({ where: { id: couleurId } });
        if (!color) {
            return res.status(400).json({ message: `Couleur introuvable: ${couleurId}` });
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
                couleurs: { create: [{ couleurId }] },
            },
        });
        // --- Créer les images du produit
        const productImages = images.map((url) => ({
            url,
            productId: created.id,
        }));
        await prisma_1.default.productImage.createMany({ data: productImages });
        // --- Retourner le produit complet
        const productWithRelations = await prisma_1.default.produit.findUnique({
            where: { id: created.id },
            include: { categorie: true, productImages: true, couleurs: { include: { couleur: true } } },
        });
        res.status(201).json(productWithRelations);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Erreur serveur lors de la création du produit" });
    }
});
// --- DELETE produit (admin ou vendeur)
router.delete("/:id", auth_1.authenticate, (0, auth_1.requireRoles)("admin", "vendeur"), async (req, res) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id))
        return res.status(400).json({ message: "id invalide" });
    try {
        const product = await prisma_1.default.produit.findUnique({ where: { id } });
        if (!product)
            return res.status(404).json({ message: "Produit introuvable" });
        if (req.user.role === "vendeur" && product.vendeurId !== req.user.id) {
            return res.status(403).json({ message: "Accès interdit" });
        }
        await prisma_1.default.produit.delete({ where: { id } });
        res.status(204).send();
    }
    catch (err) {
        if (err.code === "P2025") {
            return res.status(404).json({ message: "Produit introuvable" });
        }
        console.error(err);
        res.status(500).json({ message: "Erreur serveur lors de la suppression" });
    }
});
exports.default = router;
