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
    const { nom, description, prix, image, taille, categorieId } = req.body;
    const created = await prisma_1.default.produit.create({ data: { nom, description, prix, image, taille, categorieId } });
    res.status(201).json(created);
});
// Delete product (admin or vendeur)
router.delete('/:id', auth_1.authenticate, (0, auth_1.requireRoles)('admin', 'vendeur'), async (req, res) => {
    const id = Number(req.params.id);
    await prisma_1.default.produit.delete({ where: { id } });
    res.status(204).send();
});
exports.default = router;
