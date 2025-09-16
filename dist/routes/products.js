"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../prisma"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Public list products
router.get('/', async (_req, res) => {
    const produits = await prisma_1.default.produit.findMany({ include: { categorie: true } });
    res.json(produits);
});
// Create product (admin or vendeur)
router.post('/', auth_1.authenticate, (0, auth_1.requireRoles)('admin', 'vendeur'), async (req, res) => {
    const { nom, description, prix, image, taille } = req.body;
    const categorieId = Number(req.body.categorieId);
    if (!categorieId || Number.isNaN(categorieId)) {
        return res.status(400).json({ message: 'categorieId invalide' });
    }
    const cat = await prisma_1.default.categorie.findUnique({ where: { id: categorieId } });
    if (!cat) {
        return res.status(400).json({ message: `Categorie introuvable: ${categorieId}` });
    }
    // Déterminer le vendeurId
    let vendeurId;
    if (req.user.role === 'vendeur') {
        vendeurId = req.user.id;
    }
    else {
        const bodyVendeurId = req.body.vendeurId;
        if (bodyVendeurId !== undefined && bodyVendeurId !== null) {
            const vid = Number(bodyVendeurId);
            if (Number.isNaN(vid)) {
                return res.status(400).json({ message: 'vendeurId invalide' });
            }
            const vendeur = await prisma_1.default.users.findUnique({ where: { id: vid } });
            if (!vendeur || vendeur.role !== 'vendeur') {
                return res.status(400).json({ message: `vendeurId ${vid} invalide (utilisateur introuvable ou rôle ≠ vendeur)` });
            }
            vendeurId = vid;
        }
    }
    const created = await prisma_1.default.produit.create({ data: { nom, description, prix, image: image ?? null, taille, categorieId, vendeurId } });
    res.status(201).json(created);
});
// Delete product (admin or vendeur)
router.delete('/:id', auth_1.authenticate, (0, auth_1.requireRoles)('admin', 'vendeur'), async (req, res) => {
    const id = Number(req.params.id);
    await prisma_1.default.produit.delete({ where: { id } });
    res.status(204).send();
});
exports.default = router;
