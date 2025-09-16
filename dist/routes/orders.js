"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../prisma"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Create order (client)
router.post('/', auth_1.authenticate, (0, auth_1.requireRoles)('client'), async (req, res) => {
    const { items, localisation } = req.body;
    // Validation des données requises
    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: 'Le champ items est requis et doit être un tableau non vide' });
    }
    const montantNum = items.reduce((sum, i) => sum + Number(i.prixUnitaire) * i.quantite, 0);
    const order = await prisma_1.default.commande.create({
        data: {
            usersId: req.user.id,
            localisation,
            montant: montantNum.toString(),
            ligneCommande: {
                create: items.map(i => ({ produitId: i.produitId, quantite: i.quantite, prixUnitaire: i.prixUnitaire, total: (Number(i.prixUnitaire) * i.quantite).toString() }))
            }
        },
        include: { ligneCommande: true }
    });
    res.status(201).json(order);
});
// Validate order (admin or vendeur)
router.post('/:id/validate', auth_1.authenticate, (0, auth_1.requireRoles)('admin', 'vendeur'), async (req, res) => {
    const id = Number(req.params.id);
    const updated = await prisma_1.default.commande.update({ where: { id }, data: { status: 'en_cours_pour_la_livraison' } });
    res.json(updated);
});
// Get my orders (client)
router.get('/me', auth_1.authenticate, (0, auth_1.requireRoles)('client'), async (req, res) => {
    const orders = await prisma_1.default.commande.findMany({ where: { usersId: req.user.id }, include: { ligneCommande: true } });
    res.json(orders);
});
// Admin: list all orders
router.get('/', auth_1.authenticate, (0, auth_1.requireRoles)('admin'), async (_req, res) => {
    const orders = await prisma_1.default.commande.findMany({ include: { ligneCommande: true, users: { select: { id: true, email: true } } } });
    res.json(orders);
});
exports.default = router;
